'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmApi, type CRMAutomationStatus, type CRMLead } from '@/lib/api';
import { buildDiscoveryProfile, scoreCandidate, type CandidatePlace, type ScoredCandidate } from '@/lib/discoveryScoring';
import { applyScoreCalibration, computeLearningMetrics, type DiscoveryFeedbackItem } from '@/lib/discoveryLearning';
import type { SiteAnalysisResult } from '@/lib/discoverySiteAnalysis';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function DiscoverPage() {
  const [leads, setLeads] = useState<CRMLead[]>([]);

  const [regionQuery, setRegionQuery] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [results, setResults] = useState<ScoredCandidate[]>([]);
  const [importMessage, setImportMessage] = useState('');
  const [activeCandidate, setActiveCandidate] = useState<ScoredCandidate | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [rejectedSites, setRejectedSites] = useState<RejectedSite[]>([]);
  const [firstStage, setFirstStage] = useState<{ slug: string; name: string }>({ slug: 'reviewed', name: 'Reviewed' });

  const [threshold, setThreshold] = useState(85);
  const [feedbackHistory, setFeedbackHistory] = useState<DiscoveryFeedbackItem[]>([]);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [isAnalyzingSites, setIsAnalyzingSites] = useState(false);
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(false);
  const [automationStatus, setAutomationStatus] = useState<CRMAutomationStatus | null>(null);

  const loadLeads = useCallback(async () => {
    try {
      const response = await crmApi.getLeads({ limit: '500' });
      setLeads(response.leads);
    } catch {
      setSearchError('Unable to load CRM leads.');
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    loadLearningSettings();
  }, []);

  const profile = useMemo(() => buildDiscoveryProfile(leads), [leads]);
  const existingPlaceIds = useMemo(
    () => new Set(leads.map(lead => normalizePlaceId(lead.google_place_id)).filter((value): value is string => !!value)),
    [leads]
  );
  const [storedMetrics, setStoredMetrics] = useState<{ samples: number; accuracy: number; agreementRate: number } | null>(null);
  const computedMetrics = useMemo(() => computeLearningMetrics(feedbackHistory), [feedbackHistory]);
  // Use computed metrics when we have feedback items; fall back to server-stored values if parse failed
  const learningMetrics = computedMetrics.samples > 0 ? computedMetrics : (storedMetrics ? {
    ...computedMetrics,
    samples: storedMetrics.samples,
    accuracy: storedMetrics.accuracy,
    agreementRate: storedMetrics.agreementRate,
  } : computedMetrics);
  const autoModeReady = learningMetrics.samples >= 15 && learningMetrics.accuracy >= threshold;

  async function loadLearningSettings() {
    try {
      const response = await crmApi.getSettings();
      const settingsMap: Record<string, string> = {};
      response.settings.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      const parsedThreshold = Number(settingsMap.auto_mode_threshold || '85');
      if (Number.isFinite(parsedThreshold) && parsedThreshold > 0) {
        setThreshold(parsedThreshold);
      }

      const rawFeedback = settingsMap.discovery_feedback_v1 || '[]';
      const parsedFeedback = safeParseFeedback(rawFeedback);
      setFeedbackHistory(parsedFeedback);

      // Also read server-stored metric snapshots as a fallback display if parsing fails
      const storedSamples = Number(settingsMap.discovery_learning_samples || '0');
      const storedAccuracy = Number(settingsMap.discovery_learning_accuracy || '0');
      const storedAgreement = Number(settingsMap.discovery_learning_agreement || '0');
      if (storedSamples > 0) {
        setStoredMetrics({ samples: storedSamples, accuracy: storedAccuracy, agreementRate: storedAgreement });
      }

      const rawRejected = settingsMap.discovery_rejected_sites_v1 || '[]';
      const parsedRejected = safeParseRejected(rawRejected);
      setRejectedSites(parsedRejected);

      setAutoEmailEnabled(settingsMap.discovery_auto_email_enabled === 'true');

      try {
        const stageRes = await crmApi.getStages();
        if (stageRes.stages.length > 0) {
          const sorted = [...stageRes.stages].sort((a, b) => a.sort_order - b.sort_order);
          setFirstStage({ slug: sorted[0].slug, name: sorted[0].name });
        }
      } catch {}

      const automation = await crmApi.getAutomationStatus();
      setAutomationStatus(automation);
    } catch {
      setSettingsMessage('Could not load learning settings. Using defaults.');
    }
  }

  async function runDiscovery() {
    setSearchError('');
    setImportMessage('');

    if (!GOOGLE_MAPS_API_KEY) {
      setSearchError('Missing Google Maps API key in website environment.');
      return;
    }

    const keywords = keywordInput
      .split(/[\n,]/)
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 20);

    if (!regionQuery.trim() || keywords.length === 0) {
      setSearchError('Enter a target region and at least one keyword.');
      return;
    }

    setIsSearching(true);
    try {
      const subRegions = regionQuery.split(',').map(r => r.trim()).filter(Boolean);
      const allCandidates = await Promise.all(
        subRegions.map(region => searchGooglePlacesBatch(keywords, region, GOOGLE_MAPS_API_KEY))
      );
      const candidates = dedupeByPlaceId(allCandidates.flat());
      const scoreBias = learningMetrics.scoreBias;
      const sampleCount = learningMetrics.samples;
      const scored = candidates
        .map(candidate => {
          const base = scoreCandidate(candidate, profile);
          const calibratedScore = applyScoreCalibration(base.score, scoreBias, sampleCount);
          const calibrationReason = sampleCount >= 5
            ? `Calibrated using ${sampleCount} historical reviews (${scoreBias >= 0 ? '+' : ''}${scoreBias.toFixed(1)} bias)`
            : null;

          return {
            ...base,
            score: calibratedScore,
            reasons: calibrationReason ? [...base.reasons, calibrationReason] : base.reasons,
          };
        })
        .sort((a, b) => b.score - a.score);

      const filtered = scored.filter(item => {
        if (isRejected(item, rejectedSites)) return false;

        const placeId = normalizePlaceId(item.id);
        return placeId ? !existingPlaceIds.has(placeId) : true;
      });

      setResults(filtered);

      // Overwrite the pending review queue with the new search results
      try {
        await crmApi.replaceDiscoveryQueue(filtered);
      } catch {
        // non-fatal — queue refresh failure doesn't block the UI results
      }
    } catch {
      setSearchError('Google Places search failed. Check API access and billing.');
    } finally {
      setIsSearching(false);
    }
  }

  async function analyzeSignalsForSelected() {
    if (results.length === 0) {
      setSettingsMessage('Run discovery first to analyze sites.');
      return;
    }

    const candidates = results.slice(0, 25);
    if (candidates.length === 0) {
      setSettingsMessage('No sites selected for analysis.');
      return;
    }

    setIsAnalyzingSites(true);
    setSettingsMessage('');

    try {
      const analysisRows = await Promise.all(
        candidates.map(async item => {
          const response = await fetch('/api/discovery/site-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              website: item.website,
              name: item.name,
              address: item.address,
              types: item.types,
              parkingOptions: item.parkingOptions || null,
              accessibilityOptions: item.accessibilityOptions || null,
            }),
          });

          if (!response.ok) {
            return { id: item.id, analysis: null as SiteAnalysisResult | null };
          }

          const data: { analysis?: SiteAnalysisResult } = await response.json();
          return { id: item.id, analysis: data.analysis || null };
        })
      );

      const analysisMap = new Map<string, SiteAnalysisResult>();
      analysisRows.forEach(row => {
        if (row.analysis) analysisMap.set(row.id, row.analysis);
      });

      const scoreBias = learningMetrics.scoreBias;
      const sampleCount = learningMetrics.samples;

      const rescored = results
        .map(item => {
          const siteAnalysis = analysisMap.get(item.id) || item.siteAnalysis || null;
          const withSignals = scoreCandidate({ ...item, siteAnalysis }, profile);
          const calibratedScore = applyScoreCalibration(withSignals.score, scoreBias, sampleCount);
          return {
            ...withSignals,
            score: calibratedScore,
            siteAnalysis,
          };
        })
        .sort((a, b) => b.score - a.score);

      setResults(rescored);
      const analyzedCount = analysisRows.filter(row => !!row.analysis).length;
      setSettingsMessage(`Analyzed ${analyzedCount} sites with website, parking, and access details.`);
    } catch {
      setSettingsMessage('Site analysis failed.');
    } finally {
      setIsAnalyzingSites(false);
    }
  }

  async function toggleAutoEmail(enable: boolean) {
    if (enable && !autoModeReady) {
      setSettingsMessage(`Auto-email remains locked until accuracy reaches ${threshold}% with enough samples.`);
      return;
    }

    setSettingsBusy(true);
    setSettingsMessage('');
    try {
      await crmApi.updateSettings({
        discovery_auto_email_enabled: enable ? 'true' : 'false',
      });
      setAutoEmailEnabled(enable);
      try {
        const automation = await crmApi.getAutomationStatus();
        setAutomationStatus(automation);
      } catch {}
      setSettingsMessage(enable ? 'Auto-email enabled.' : 'Auto-email disabled.');
    } catch {
      setSettingsMessage('Could not update auto-email setting.');
    } finally {
      setSettingsBusy(false);
    }
  }

  async function submitCandidateReview() {
    if (!activeCandidate || reviewStars < 1 || reviewStars > 5) return;

    const userScore = reviewStars * 20;
    const feedbackRow: DiscoveryFeedbackItem = {
      id: activeCandidate.id,
      aiScore: activeCandidate.score,
      userScore,
      stars: reviewStars,
      name: activeCandidate.name,
      address: activeCandidate.address,
      createdAt: new Date().toISOString(),
      ...(reviewNote.trim() ? { note: reviewNote.trim() } : {}),
    };

    const nextFeedback = dedupeFeedback([...feedbackHistory, feedbackRow]);
    const nextRejected = reviewStars <= 3
      ? dedupeRejected([
          ...rejectedSites,
          {
            id: activeCandidate.id,
            name: activeCandidate.name,
            address: activeCandidate.address,
            stars: reviewStars,
            createdAt: new Date().toISOString(),
          },
        ])
      : rejectedSites;

    setSubmittingReview(true);
    setImportMessage('');
    try {
      if (reviewStars >= 4) {
        await crmApi.importLeads(
          [
            {
              name: activeCandidate.name,
              address: activeCandidate.address,
              lat: activeCandidate.latitude || undefined,
              lng: activeCandidate.longitude || undefined,
              description: activeCandidate.reasons.join(' · '),
              fit_score: activeCandidate.score,
              parking_confidence: activeCandidate.siteAnalysis?.parkingConfidence,
              access_score: activeCandidate.siteAnalysis?.accessScore,
              campervan_priority: activeCandidate.siteAnalysis?.campervanPriority,
            },
          ],
          true,
          firstStage.slug,
          'medium'
        );
      }

      const metrics = computeLearningMetrics(nextFeedback);
      const thresholdPassed = metrics.samples >= 15 && metrics.accuracy >= threshold;

      await crmApi.updateSettings({
        discovery_feedback_v1: JSON.stringify(nextFeedback),
        discovery_rejected_sites_v1: JSON.stringify(nextRejected),
        discovery_learning_samples: String(metrics.samples),
        discovery_learning_accuracy: String(metrics.accuracy),
        discovery_learning_agreement: String(metrics.agreementRate),
        discovery_auto_mode_ready: thresholdPassed ? 'true' : 'false',
      });

      setFeedbackHistory(nextFeedback);
      setRejectedSites(nextRejected);
      setResults(current => current.filter(item => item.id !== activeCandidate.id));
      if (reviewStars >= 4) {
        setImportMessage(`${activeCandidate.name} added to ${firstStage.name} and learning saved.`);
      }
      setActiveCandidate(null);
      setReviewStars(0);
      setReviewNote('');
      loadLeads();
    } catch {
      setImportMessage('Could not save this review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Discover Leads</h1>
        <p className="text-sm text-slate-500 mt-1">Location identification matched against your pipeline</p>
      </div>

      <section className="grid md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Learning Accuracy</p>
          <p className="text-xl font-bold text-slate-100 mt-1">{learningMetrics.accuracy}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Target: {threshold}%</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Learning Samples</p>
          <p className="text-xl font-bold text-slate-100 mt-1">{learningMetrics.samples}</p>
          <p className="text-[11px] text-slate-500 mt-1">{leads.length > 0 ? `+${leads.length} pipeline` : 'Min 15 required'}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Agreement (±10)</p>
          <p className="text-xl font-bold text-slate-100 mt-1">{learningMetrics.agreementRate}%</p>
          <p className="text-[11px] text-slate-500 mt-1">AI vs your ratings</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Auto Email Gate</p>
          <p className={`text-xl font-bold mt-1 ${autoModeReady ? 'text-emerald-400' : 'text-amber-400'}`}>{autoModeReady ? 'READY' : 'LOCKED'}</p>
          <p className="text-[11px] text-slate-500 mt-1">Unlocks at threshold</p>
        </div>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-2 justify-between">
        <div>
          <p className="text-sm text-slate-200 font-semibold">Email Automation</p>
          <p className="text-xs text-slate-500 mt-0.5">Keep outreach gated until the model is accurate enough.</p>
          <p className="text-xs text-slate-400 mt-1">Auto-email: <span className={autoEmailEnabled ? 'text-amber-400' : 'text-slate-400'}>{autoEmailEnabled ? 'ON' : 'OFF'}</span></p>
          {automationStatus && !automationStatus.server_kill_switch_enabled && (
            <p className="text-xs text-amber-300 mt-1">Automation deactivated by server kill-switch. This is safe mode until explicitly activated in backend env.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleAutoEmail(!autoEmailEnabled)}
            disabled={settingsBusy}
            className={`${autoEmailEnabled ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'} disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg`}
          >
            {autoEmailEnabled ? 'Disable Auto Email' : 'Enable Auto Email'}
          </button>
        </div>
      </section>

      <div className="grid gap-4">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Search Region</h2>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Region</label>
            <input
              value={regionQuery}
              onChange={e => setRegionQuery(e.target.value)}
              placeholder="Somerset, Devon, Dorset"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Keywords (comma or line separated)</label>
            <textarea
              value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={runDiscovery}
            disabled={isSearching}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg"
          >
            {isSearching ? 'Finding matching locations…' : 'Identify Similar Sites'}
          </button>

          <p className="text-xs text-slate-500">Candidates are matched against your existing pipeline leads ({leads.length} loaded). Nothing is auto-added; review each site first.</p>
        </section>
      </div>

      {searchError && (
        <div className="text-sm px-3 py-2 rounded-lg border bg-red-500/10 border-red-500/20 text-red-400">{searchError}</div>
      )}

      {results.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Candidate Locations</h2>
            <span className="text-xs text-slate-500">{results.length} pending review</span>
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-950 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Site</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Rating</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Reviews</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Satellite</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Why It Matches</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {results.map(item => {
                  return (
                    <tr key={item.id} onClick={() => { setActiveCandidate(item); setReviewStars(0); }} className="cursor-pointer hover:bg-slate-800/40">
                      <td className="px-3 py-2 align-top">
                        <p className="text-sm text-slate-200 font-medium">{item.name}</p>
                        <p className="text-xs text-slate-500 max-w-[280px]">{item.address || '—'}</p>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">{item.rating ?? '—'}</td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">{item.reviews ?? '—'}</td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">{item.primaryType || item.types[0] || '—'}</td>
                      <td className="px-3 py-2 align-top">
                        {item.latitude !== null && item.longitude !== null && GOOGLE_MAPS_API_KEY ? (
                          // Satellite previews come from a dynamic Google endpoint; keeping a native img avoids extra loader setup.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getSatellitePreviewUrl(item.latitude, item.longitude, GOOGLE_MAPS_API_KEY)}
                            alt={`Satellite preview of ${item.name}`}
                            className="w-28 h-18 object-cover rounded border border-slate-700"
                          />
                        ) : (
                          <span className="text-[11px] text-slate-500">No coords</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <p className="text-[11px] text-slate-400 max-w-[340px]">{item.reasons.join(' · ')}</p>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <button
                          onClick={e => { e.stopPropagation(); setActiveCandidate(item); setReviewStars(0); }}
                          className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30"
                        >
                          Open Summary
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">Rate each site in summary: 4-5★ adds to {firstStage.name}, 1-3★ is removed and remembered.</p>
          </div>
        </section>
      )}

      {activeCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setActiveCandidate(null)}>
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">{activeCandidate.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{activeCandidate.address || 'No address'}</p>
                {activeCandidate.website && (
                  <a href={activeCandidate.website} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:underline mt-1 inline-block">{activeCandidate.website}</a>
                )}
              </div>
              <button onClick={() => setActiveCandidate(null)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <SummaryStat label="Google" value={activeCandidate.rating ? `${activeCandidate.rating}★` : '—'} />
              <SummaryStat label="Reviews" value={activeCandidate.reviews ? String(activeCandidate.reviews) : '—'} />
              <SummaryStat label="Type" value={activeCandidate.primaryType || activeCandidate.types[0] || '—'} />
            </div>

            {activeCandidate.latitude !== null && activeCandidate.longitude !== null && GOOGLE_MAPS_API_KEY && (
              <div className="rounded-lg overflow-hidden border border-slate-700">
                <iframe
                  title={`Map of ${activeCandidate.name}`}
                  width="100%"
                  height="300"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={(() => {
                    const rawId = activeCandidate.id.startsWith('places/') ? activeCandidate.id.slice(7) : activeCandidate.id;
                    const q = rawId ? `place_id:${rawId}` : encodeURIComponent(`${activeCandidate.name} ${activeCandidate.address}`);
                    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${q}&zoom=16`;
                  })()}
                />
              </div>
            )}

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">AI Summary</p>
              <p className="text-xs text-slate-300 leading-relaxed">{generateCandidateSummary(activeCandidate)}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Your rating</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setReviewStars(star)}
                    className={`text-xl leading-none ${reviewStars >= star ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">4-5 stars adds to {firstStage.name}. 1-3 stars removes and remembers this site.</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Notes for AI (optional)</p>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                rows={2}
                placeholder="e.g. Good car park visible on map, rural location, seemed keen when I visited…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={submitCandidateReview}
                disabled={submittingReview || reviewStars === 0}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                {submittingReview ? 'Submitting…' : 'Submit Review'}
              </button>
              <button onClick={() => setActiveCandidate(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}


      {importMessage && (
        <div className={`text-sm px-3 py-2 rounded-lg border ${importMessage.includes('added to') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : importMessage.includes('rejected') ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {importMessage}
        </div>
      )}

      {settingsMessage && (
        <div className={`text-sm px-3 py-2 rounded-lg border ${settingsMessage.startsWith('Learning saved') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
          {settingsMessage}
        </div>
      )}
    </div>
  );
}

async function searchGooglePlacesBatch(keywords: string[], region: string, apiKey: string): Promise<CandidatePlace[]> {
  const all = await Promise.all(keywords.map(keyword => searchGooglePlaces(keyword, region, apiKey)));
  const merged = all.flat();

  const deduped = new Map<string, CandidatePlace>();
  merged.forEach(item => {
    const key = item.id || `${item.name}|${item.address}`.toLowerCase();
    if (!deduped.has(key)) deduped.set(key, item);
  });

  return Array.from(deduped.values());
}

async function searchGooglePlaces(keyword: string, region: string, apiKey: string): Promise<CandidatePlace[]> {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.websiteUri',
        'places.primaryType',
        'places.types',
        'places.parkingOptions',
        'places.accessibilityOptions',
        'places.reviews',
        'places.editorialSummary',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: `${keyword} in ${region}`,
      maxResultCount: 20,
      languageCode: 'en-GB',
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places search failed (${response.status})`);
  }

  const data: GooglePlacesResponse = await response.json();
  const places = Array.isArray(data.places) ? data.places : [];

  return places.map((place, idx: number) => ({
    id: place.id || `${keyword}-${idx}`,
    name: place.displayName?.text || 'Unnamed',
    address: place.formattedAddress || '',
    latitude: typeof place.location?.latitude === 'number' ? place.location.latitude : null,
    longitude: typeof place.location?.longitude === 'number' ? place.location.longitude : null,
    rating: typeof place.rating === 'number' ? place.rating : null,
    reviews: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    website: place.websiteUri || null,
    primaryType: place.primaryType || null,
    types: Array.isArray(place.types) ? place.types : [],
    parkingOptions: place.parkingOptions || null,
    accessibilityOptions: place.accessibilityOptions || null,
    reviewsText: Array.isArray(place.reviews)
      ? place.reviews.map(r => r.text?.text || '').filter(Boolean)
      : [],
    editorialSummary: place.editorialSummary?.text || null,
  }));
}

interface GooglePlaceItem {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  primaryType?: string;
  types?: string[];
  parkingOptions?: {
    freeParkingLot?: boolean;
    paidParkingLot?: boolean;
    freeStreetParking?: boolean;
    paidStreetParking?: boolean;
    valetParking?: boolean;
  };
  accessibilityOptions?: {
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleEntrance?: boolean;
  };
  reviews?: Array<{ text?: { text?: string } }>;
  editorialSummary?: { text?: string };
}

interface GooglePlacesResponse {
  places?: GooglePlaceItem[];
}

function safeParseFeedback(raw: string): DiscoveryFeedbackItem[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(item => item && typeof item.id === 'string')
      .map(item => {
        const userScore = clamp(Number(item.userScore), 0, 100);
        // Preserve stored stars; fall back to deriving from userScore for old records
        const stars = Number.isFinite(Number(item.stars)) && Number(item.stars) >= 1
          ? clamp(Number(item.stars), 1, 5)
          : clamp(Math.round(userScore / 20), 1, 5);
        return {
          id: item.id,
          aiScore: clamp(Number(item.aiScore), 0, 100),
          userScore,
          stars,
          name: typeof item.name === 'string' ? item.name : 'Unknown',
          address: typeof item.address === 'string' ? item.address : '',
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
          ...(typeof item.note === 'string' && item.note ? { note: item.note } : {}),
        };
      })
      .filter(item => Number.isFinite(item.aiScore) && Number.isFinite(item.userScore));
  } catch {
    return [];
  }
}

interface RejectedSite {
  id: string;
  name: string;
  address: string;
  stars: number;
  createdAt: string;
}

function safeParseRejected(raw: string): RejectedSite[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(item => item && typeof item.id === 'string')
      .map(item => ({
        id: item.id,
        name: typeof item.name === 'string' ? item.name : '',
        address: typeof item.address === 'string' ? item.address : '',
        stars: clamp(Number(item.stars), 1, 5),
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

function dedupeFeedback(rows: DiscoveryFeedbackItem[]): DiscoveryFeedbackItem[] {
  const map = new Map<string, DiscoveryFeedbackItem>();
  rows.forEach(row => map.set(row.id, row));
  return Array.from(map.values()).slice(-500);
}

function dedupeRejected(rows: RejectedSite[]): RejectedSite[] {
  const map = new Map<string, RejectedSite>();
  rows.forEach(row => {
    const key = row.id || normalizeText(`${row.name}|${row.address}`);
    map.set(key, row);
  });
  return Array.from(map.values()).slice(-1000);
}

function dedupeByPlaceId(candidates: CandidatePlace[]): CandidatePlace[] {
  const map = new Map<string, CandidatePlace>();
  candidates.forEach(c => {
    const key = normalizePlaceId(c.id) || `${c.name}|${c.address}`.toLowerCase();
    if (!map.has(key)) map.set(key, c);
  });
  return Array.from(map.values());
}

function isRejected(candidate: CandidatePlace, rejectedRows: RejectedSite[]): boolean {
  const candidateKey = candidate.id || normalizeText(`${candidate.name}|${candidate.address}`);
  return rejectedRows.some(row => {
    const rowKey = row.id || normalizeText(`${row.name}|${row.address}`);
    return rowKey === candidateKey;
  });
}

function normalizeText(value: string): string {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizePlaceId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.startsWith('places/') ? trimmed.slice(7) : trimmed;
}

function getSatellitePreviewUrl(lat: number, lng: number, apiKey: string, size = '280x180'): string {
  const center = `${lat},${lng}`;
  const params = new URLSearchParams({
    center,
    zoom: '17',
    size,
    maptype: 'satellite',
    key: apiKey,
  });
  params.append('markers', `color:red|${lat},${lng}`);
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1.5">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-slate-200 mt-0.5">{value}</p>
    </div>
  );
}

function generateCandidateSummary(item: ScoredCandidate): string {
  const parts: string[] = [];

  // What is it and where
  const typeLabel = (item.primaryType || item.types?.[0] || 'venue').replace(/_/g, ' ');
  const addressParts = item.address ? item.address.split(',') : [];
  const locality = addressParts.length >= 2
    ? addressParts.slice(-3, -1).map(s => s.trim()).filter(Boolean).join(', ')
    : item.address;

  if (item.editorialSummary) {
    parts.push(item.editorialSummary);
  } else {
    parts.push(`${item.name} is a ${typeLabel}${locality ? ` in ${locality}` : ''}.`);
  }

  // Parking
  const parking = item.parkingOptions || {};
  if (parking.freeParkingLot) {
    parts.push('It has a free on-site car park.');
  } else if (parking.paidParkingLot) {
    parts.push('It has a paid on-site car park.');
  } else if (parking.freeStreetParking) {
    parts.push('Free street parking is available nearby.');
  } else if (parking.paidStreetParking) {
    parts.push('Paid street parking is available nearby.');
  } else {
    parts.push('No specific parking information was found on Google.');
  }

  if (item.siteAnalysis?.parkingConfidence && item.siteAnalysis.parkingConfidence >= 30) {
    parts.push('Their website also references parking availability.');
  }

  // Rating and reviews
  if (item.rating != null && item.reviews != null) {
    parts.push(`It holds a ${item.rating}\u2605 Google rating from ${item.reviews.toLocaleString()} reviews.`);
  } else if (item.rating != null) {
    parts.push(`It holds a ${item.rating}\u2605 Google rating.`);
  }

  // Campervan — prefer real review quotes, fall back to website snippets
  const campervanKeywords = ['campervan', 'motorhome', 'overnight', 'camper', ' rv ', 'night stop',
    'stopover', 'stay the night', 'park up', 'park overnight', 'van overnight'];

  const campervanReviews = (item.reviewsText || []).filter(r =>
    campervanKeywords.some(kw => r.toLowerCase().includes(kw))
  );
  const campervanWebSnippets = item.siteAnalysis?.campervanSnippets || [];

  if (campervanReviews.length > 0) {
    const snippet = campervanReviews[0].length > 220
      ? campervanReviews[0].slice(0, 220) + '\u2026'
      : campervanReviews[0];
    parts.push(`A Google reviewer mentioned: "${snippet}"`);
    if (campervanReviews.length > 1) {
      parts.push(`${campervanReviews.length - 1} other review${campervanReviews.length > 2 ? 's' : ''} also mention campervan or overnight stays.`);
    }
  } else if (campervanWebSnippets.length > 0) {
    const snippet = campervanWebSnippets[0].length > 220
      ? campervanWebSnippets[0].slice(0, 220) + '\u2026'
      : campervanWebSnippets[0];
    parts.push(`Their website says: "${snippet}"`);
    if (campervanWebSnippets.length > 1) {
      parts.push('Their site has additional content referencing campervan or overnight use — worth a look.');
    }
  } else if (item.siteAnalysis?.campervanPriority && item.siteAnalysis.campervanPriority >= 15) {
    parts.push('Their website references campervan or overnight activity, though no specific passage was extracted.');
  } else if (item.siteAnalysis) {
    parts.push('No campervan or overnight mentions found in Google reviews or on their website.');
  } else {
    parts.push('Run "Analyse Sites" to check their website for campervan and overnight content.');
  }

  if (item.website) {
    parts.push('They have a website worth checking for more detail.');
  }

  return parts.join(' ');
}