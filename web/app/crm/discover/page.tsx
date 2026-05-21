'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmApi, type CRMAutomationStatus, type CRMLead } from '@/lib/api';
import { buildDiscoveryProfile, scoreCandidate, type CandidatePlace, type ScoredCandidate } from '@/lib/discoveryScoring';
import { computeLearningMetrics, type DiscoveryFeedbackItem } from '@/lib/discoveryLearning';
import type { SiteAnalysisResult } from '@/lib/discoverySiteAnalysis';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function DiscoverPage() {
  const [leads, setLeads] = useState<CRMLead[]>([]);

  const [regionQuery, setRegionQuery] = useState('');
  const [criteriaInput, setCriteriaInput] = useState('');
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
  const [minScore, setMinScore] = useState(35);
  const [minRating, setMinRating] = useState(0);
  const [feedbackHistory, setFeedbackHistory] = useState<DiscoveryFeedbackItem[]>([]);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [isAnalyzingSites, setIsAnalyzingSites] = useState(false);
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(false);
  const [automationStatus, setAutomationStatus] = useState<CRMAutomationStatus | null>(null);

  const [nameQuery, setNameQuery] = useState('');
  const [nameResults, setNameResults] = useState<ScoredCandidate[]>([]);
  const [isNameSearching, setIsNameSearching] = useState(false);
  const [nameSearchError, setNameSearchError] = useState('');

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
  const existingLeadKeys = useMemo(
    () => new Set(leads.map(lead => normalizeText(`${lead.business_name || ''}|${lead.location || ''}`)).filter(k => k !== '|')),
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

      const parsedMinScore = Number(settingsMap.discovery_min_score || '35');
      if (Number.isFinite(parsedMinScore) && parsedMinScore >= 0) {
        setMinScore(parsedMinScore);
      }

      const parsedMinRating = Number(settingsMap.discovery_min_rating || '0');
      if (Number.isFinite(parsedMinRating) && parsedMinRating >= 0) {
        setMinRating(parsedMinRating);
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
      setCriteriaInput(settingsMap.discovery_criteria_v1 || '');
      if (settingsMap.discovery_region) {
        setRegionQuery(settingsMap.discovery_region);
      }

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

    if (!regionQuery.trim()) {
      setSearchError('Enter a target region.');
      return;
    }

    const keywords = deriveKeywordsFromCriteria(criteriaInput);

    // Persist region, criteria and min score so they survive page refresh
    crmApi.updateSettings({ discovery_region: regionQuery.trim(), discovery_criteria_v1: criteriaInput, discovery_min_score: String(minScore), discovery_min_rating: String(minRating) }).catch(() => {});

    setIsSearching(true);
    try {
      const subRegions = regionQuery.split(',').map(r => r.trim()).filter(Boolean);
      // Geocode each sub-region to get proper lat/lng bounds for the Places API
      const geocodedRegions = await Promise.all(
        subRegions.map(region => geocodeRegion(region, GOOGLE_MAPS_API_KEY))
      );
      const allCandidates = await Promise.all(
        subRegions.map((region, i) => searchGooglePlacesBatch(keywords, region, GOOGLE_MAPS_API_KEY, geocodedRegions[i]))
      );
      const candidates = dedupeByPlaceId(allCandidates.flat());

      // Build base scores (used as fallback if AI ranking fails)
      const basedScored = candidates.map(candidate => scoreCandidate(candidate, profile));

      // Apply OpenAI ranking — re-scores every candidate using feedback as few-shot examples
      let scored: ScoredCandidate[];
      try {
        const rankRes = await fetch('/api/discovery/rank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidates: basedScored,
            feedback: feedbackHistory,
            criteria: criteriaInput,
            profile: { topTypes: profile.topTypes },
          }),
        });
        if (rankRes.ok) {
          const rankData = await rankRes.json() as { results?: Array<{ id: string; score: number; reasoning: string; criteriaChecks?: Array<{ label: string; met: boolean; detail: string }> }> };
          const aiMap = new Map((rankData.results || []).map(r => [r.id, r]));
          scored = basedScored.map(c => {
            const ai = aiMap.get(c.id);
            if (ai) {
              return {
                ...c,
                score: ai.score,
                reasons: [ai.reasoning, ...c.reasons],
                criteriaChecks: ai.criteriaChecks,
              };
            }
            return c;
          });
        } else {
          scored = basedScored;
        }
      } catch {
        // AI unavailable — fall back to base scores silently
        scored = basedScored;
      }

      scored = scored.sort((a, b) => b.score - a.score);

      const seenInResults = new Set<string>();
      const filtered = scored.filter(item => {
        if (item.score < minScore) return false;
        if (minRating > 0 && (typeof item.rating !== 'number' || item.rating < minRating)) return false;
        if (isRejected(item, rejectedSites)) return false;
        const placeId = normalizePlaceId(item.id);
        if (placeId && existingPlaceIds.has(placeId)) return false;
        const nameKey = normalizeText(`${item.name}|${item.address}`);
        if (existingLeadKeys.has(nameKey)) return false;
        const dedupKey = placeId || nameKey;
        if (seenInResults.has(dedupKey)) return false;
        seenInResults.add(dedupKey);
        return true;
      });

      setResults(filtered);

      // Overwrite the pending review queue with the new search results
      try {
        await crmApi.replaceDiscoveryQueue(filtered);
      } catch {
        // non-fatal — queue refresh failure doesn't block the UI results
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSearchError(`Google Places search failed: ${msg}. Check API access and billing.`);
    } finally {
      setIsSearching(false);
    }
  }

  async function runNameSearch() {
    setNameSearchError('');
    if (!nameQuery.trim()) return;
    if (!GOOGLE_MAPS_API_KEY) {
      setNameSearchError('Missing Google Maps API key.');
      return;
    }
    setIsNameSearching(true);
    try {
      const raw = await searchByExactName(nameQuery.trim(), GOOGLE_MAPS_API_KEY);
      const scored = raw
        .map(c => scoreCandidate(c, profile))
        .filter(c => {
          const placeId = normalizePlaceId(c.id);
          if (placeId && existingPlaceIds.has(placeId)) return false;
          return true;
        });
      setNameResults(scored);
      if (scored.length === 0) setNameSearchError('No results found. Try a more specific name or include a town.');
    } catch (err) {
      setNameSearchError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setIsNameSearching(false);
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

      // Re-score with new site signals then re-rank via AI
      const baseRescored = results.map(item => {
        const siteAnalysis = analysisMap.get(item.id) || item.siteAnalysis || null;
        return scoreCandidate({ ...item, siteAnalysis }, profile);
      });

      let rescored: ScoredCandidate[];
      try {
        const rankRes = await fetch('/api/discovery/rank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidates: baseRescored,
            feedback: feedbackHistory,
            criteria: criteriaInput,
            profile: { topTypes: profile.topTypes },
          }),
        });
        if (rankRes.ok) {
          const rankData = await rankRes.json() as { results?: Array<{ id: string; score: number; reasoning: string; criteriaChecks?: Array<{ label: string; met: boolean; detail: string }> }> };
          const aiMap = new Map((rankData.results || []).map(r => [r.id, r]));
          rescored = baseRescored.map(c => {
            const ai = aiMap.get(c.id);
            if (ai) return { ...c, score: ai.score, reasons: [ai.reasoning, ...c.reasons], criteriaChecks: ai.criteriaChecks };
            return c;
          });
        } else {
          rescored = baseRescored;
        }
      } catch {
        rescored = baseRescored;
      }

      const seenInRescored = new Set<string>();
      rescored = rescored.sort((a, b) => b.score - a.score).filter(item => {
        if (item.score < minScore) return false;
        if (minRating > 0 && (typeof item.rating !== 'number' || item.rating < minRating)) return false;
        if (isRejected(item, rejectedSites)) return false;
        const placeId = normalizePlaceId(item.id);
        if (placeId && existingPlaceIds.has(placeId)) return false;
        const nameKey = normalizeText(`${item.name}|${item.address}`);
        if (existingLeadKeys.has(nameKey)) return false;
        const dedupKey = placeId || nameKey;
        if (seenInRescored.has(dedupKey)) return false;
        seenInRescored.add(dedupKey);
        return true;
      });

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
    const nextRejected = reviewStars <= 2
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
      if (reviewStars >= 3) {
        await crmApi.importLeads(
          [
            {
              name: activeCandidate.name,
              address: activeCandidate.address,
              google_place_id: normalizePlaceId(activeCandidate.id) || undefined,
              lat: activeCandidate.latitude || undefined,
              lng: activeCandidate.longitude || undefined,
              website: activeCandidate.website || undefined,
              google_rating: activeCandidate.rating ?? undefined,
              google_reviews_count: activeCandidate.reviews ?? undefined,
              description: activeCandidate.reasons.join(' · '),
              fit_score: activeCandidate.score,
              parking_confidence: activeCandidate.siteAnalysis?.parkingConfidence,
              access_score: activeCandidate.siteAnalysis?.accessScore,
              campervan_priority: activeCandidate.siteAnalysis?.campervanPriority,
            },
          ],
          false,
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
      if (reviewStars >= 3) {
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

      {/* ── Find a specific place ── */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Find a Specific Place</h2>
        <p className="text-xs text-slate-500">Search by business name to find and add any place you&apos;ve come across outside of the area search.</p>
        <div className="flex gap-2">
          <input
            value={nameQuery}
            onChange={e => setNameQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runNameSearch()}
            placeholder="e.g. The Crown Inn, Bristol"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={runNameSearch}
            disabled={isNameSearching || !nameQuery.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap"
          >
            {isNameSearching ? 'Searching…' : 'Search'}
          </button>
        </div>
        {nameSearchError && <p className="text-xs text-red-400">{nameSearchError}</p>}
        {nameResults.length > 0 && (
          <div className="space-y-2">
            {nameResults.map(item => {
              const alreadyInCrm = existingPlaceIds.has(normalizePlaceId(item.id) ?? '') || existingLeadKeys.has(normalizeText(`${item.name}|${item.address}`));
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 font-medium truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 truncate">{item.address || '—'}</p>
                    {item.rating != null && (
                      <p className="text-xs text-slate-400 mt-0.5">{item.rating}★ · {item.reviews ?? 0} reviews</p>
                    )}
                  </div>
                  {alreadyInCrm ? (
                    <span className="text-xs text-slate-500 whitespace-nowrap">Already in CRM</span>
                  ) : (
                    <button
                      onClick={() => { setActiveCandidate(item); setReviewStars(0); setReviewNote(''); }}
                      className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 whitespace-nowrap"
                    >
                      Review & Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-4">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Search</h2>

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
            <label className="block text-xs text-slate-500 mb-1">Search Criteria</label>
            <textarea
              value={criteriaInput}
              onChange={e => setCriteriaInput(e.target.value)}
              rows={4}
              placeholder={`Describe what you're looking for. E.g:\n• pub with large car park near the coast\n• vineyard with parking\n• farm with plenty of parking near a beauty spot\n\nJust describe it naturally — the type of place and any extras. Parking is always required.`}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-600 mt-1">Write naturally — the AI reads this and checks each requirement per site. Notes you leave on rated sites are also learned from.</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Min AI Score (0–100)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={minScore}
                onChange={e => setMinScore(Number(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <span className="text-sm font-semibold text-slate-200 w-8 text-right">{minScore}</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">Sites scoring below this are hidden. Lower to see more results; raise to filter aggressively.</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Min Google Rating</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[0, 3, 3.5, 4, 4.2, 4.5].map(r => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${minRating === r ? 'bg-emerald-500 border-emerald-500 text-white font-semibold' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  {r === 0 ? 'Any' : `${r}★+`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-600 mt-1">Sites without a Google rating are hidden when a minimum is set.</p>
          </div>

          <button
            onClick={runDiscovery}
            disabled={isSearching}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg"
          >
            {isSearching ? 'Finding matching locations…' : 'Search for Sites'}
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
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Criteria</th>
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
                        <div className="flex flex-col gap-1 min-w-[220px]">
                          {(() => {
                            // Use AI-generated criteria checks if available, otherwise fall back to fixed chips
                            if (item.criteriaChecks && item.criteriaChecks.length > 0) {
                              return item.criteriaChecks.map(({ label, met, detail }) => (
                                <span key={label} className={`inline-flex flex-col text-[10px] font-medium px-1.5 py-0.5 rounded w-fit ${met ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                                  <span>{met ? '✓' : '✗'} {label}</span>
                                  <span className={`font-normal pl-3 ${met ? 'text-emerald-400/70' : 'text-slate-600'}`}>{detail}</span>
                                </span>
                              ));
                            }
                            // Fallback (no AI criteriaChecks yet): show only basic data chips
                            const parkingTypes = [
                              item.parkingOptions?.freeParkingLot && 'free lot',
                              item.parkingOptions?.paidParkingLot && 'paid lot',
                              item.parkingOptions?.freeStreetParking && 'free street',
                              item.parkingOptions?.paidStreetParking && 'paid street',
                            ].filter(Boolean);
                            const hasParking = parkingTypes.length > 0;
                            return [
                              { label: 'Parking', yes: hasParking, detail: hasParking ? parkingTypes.join(', ') : 'no parking data' },
                              { label: 'Good rating (4+)', yes: typeof item.rating === 'number' && item.rating >= 4, detail: typeof item.rating === 'number' ? `${item.rating}★` : 'no rating' },
                              { label: 'Strong reviews (100+)', yes: typeof item.reviews === 'number' && item.reviews >= 100, detail: typeof item.reviews === 'number' ? `${item.reviews} reviews` : 'no count' },
                              { label: 'Has website', yes: !!item.website, detail: item.website ? (() => { try { return new URL(item.website!).hostname.replace(/^www\./, ''); } catch { return item.website!; } })() : 'none found' },
                            ].map(({ label, yes, detail }) => (
                              <span key={label} className={`inline-flex flex-col text-[10px] font-medium px-1.5 py-0.5 rounded w-fit ${yes ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                                <span>{yes ? '✓' : '✗'} {label}</span>
                                <span className={`font-normal pl-3 ${yes ? 'text-emerald-400/70' : 'text-slate-600'}`}>{detail}</span>
                              </span>
                            ));
                          })()}
                        </div>
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

            {activeCandidate.openingHours && activeCandidate.openingHours.length > 0 && (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Opening Hours</p>
                <div className="space-y-0.5">
                  {activeCandidate.openingHours.map((line, i) => {
                    const [day, ...rest] = line.split(': ');
                    return (
                      <div key={i} className="flex justify-between text-xs gap-3">
                        <span className="text-slate-400 font-medium w-24 shrink-0">{day}</span>
                        <span className="text-slate-300 text-right">{rest.join(': ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeCandidate.latitude !== null && activeCandidate.longitude !== null && GOOGLE_MAPS_API_KEY && (
              <div className="rounded-lg overflow-hidden border border-slate-700 relative">
                <iframe
                  title={`Satellite map of ${activeCandidate.name}`}
                  width="100%"
                  height="300"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_API_KEY}&center=${activeCandidate.latitude},${activeCandidate.longitude}&zoom=18&maptype=satellite`}
                />
                <a
                  href={(() => {
                    const rawId = activeCandidate.id.startsWith('places/') ? activeCandidate.id.slice(7) : activeCandidate.id;
                    const name = encodeURIComponent(activeCandidate.name);
                    return rawId
                      ? `https://www.google.com/maps/search/?api=1&query=${name}&query_place_id=${rawId}`
                      : `https://www.google.com/maps/search/?api=1&query=${name}+${activeCandidate.latitude},${activeCandidate.longitude}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[11px] px-2 py-1 rounded"
                >
                  Open in Maps ↗
                </a>
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

interface RegionBounds {
  low: { latitude: number; longitude: number };
  high: { latitude: number; longitude: number };
}

async function geocodeRegion(region: string, apiKey: string): Promise<RegionBounds | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(region + ', UK')}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: { results?: Array<{ geometry?: { viewport?: { northeast?: { lat: number; lng: number }; southwest?: { lat: number; lng: number } } } }> } = await res.json();
    const viewport = data.results?.[0]?.geometry?.viewport;
    if (!viewport?.northeast || !viewport?.southwest) return null;
    return {
      low: { latitude: viewport.southwest.lat, longitude: viewport.southwest.lng },
      high: { latitude: viewport.northeast.lat, longitude: viewport.northeast.lng },
    };
  } catch {
    return null;
  }
}

async function searchGooglePlacesBatch(keywords: string[], region: string, apiKey: string, bounds: RegionBounds | null = null): Promise<CandidatePlace[]> {
  const all = await Promise.all(keywords.map(keyword => searchGooglePlaces(keyword, region, apiKey, bounds)));
  const merged = all.flat();

  const deduped = new Map<string, CandidatePlace>();
  merged.forEach(item => {
    const key = item.id || `${item.name}|${item.address}`.toLowerCase();
    if (!deduped.has(key)) deduped.set(key, item);
  });

  return Array.from(deduped.values());
}

async function searchGooglePlaces(keyword: string, region: string, apiKey: string, bounds: RegionBounds | null = null): Promise<CandidatePlace[]> {
  const requestBody: Record<string, unknown> = {
    textQuery: `${keyword} in ${region}`,
    maxResultCount: 20,
    languageCode: 'en-GB',
  };
  // Use geocoded viewport as a hard geographic restriction when available
  if (bounds) {
    requestBody.locationRestriction = { rectangle: { low: bounds.low, high: bounds.high } };
  }
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
        'places.regularOpeningHours',
      ].join(','),
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let detail = '';
    try { const e = await response.json(); detail = JSON.stringify(e); } catch { detail = await response.text().catch(() => ''); }
    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 200)}`);
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
    openingHours: place.regularOpeningHours?.weekdayDescriptions || null,
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
  regularOpeningHours?: { weekdayDescriptions?: string[] };
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

async function searchByExactName(query: string, apiKey: string): Promise<CandidatePlace[]> {
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
        'places.regularOpeningHours',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 5,
      languageCode: 'en-GB',
    }),
  });

  if (!response.ok) {
    let detail = '';
    try { const e = await response.json(); detail = JSON.stringify(e); } catch { detail = await response.text().catch(() => ''); }
    throw new Error(`Google Places: HTTP ${response.status} — ${detail.slice(0, 200)}`);
  }

  const data: GooglePlacesResponse = await response.json();
  const places = Array.isArray(data.places) ? data.places : [];

  return places.map((place, idx) => ({
    id: place.id || `name-${idx}`,
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
    reviewsText: Array.isArray(place.reviews) ? place.reviews.map(r => r.text?.text || '').filter(Boolean) : [],
    editorialSummary: place.editorialSummary?.text || null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions || null,
  }));
}

function deriveKeywordsFromCriteria(criteria: string): string[] {
  if (!criteria.trim()) return ['country pub with parking'];

  const lower = criteria.toLowerCase();

  // ── Extract site types ──────────────────────────────────────────────────────
  // Each entry: [triggerWords, searchTerm]
  const siteTypes: [string[], string][] = [
    [['pub', 'inn', 'country pub', 'public house'], 'pub'],
    [['farm shop', 'farm'], 'farm'],
    [['vineyard', 'winery'], 'vineyard'],
    [['hotel', 'coaching inn', 'lodge'], 'rural hotel'],
    [['gastropub', 'gastro pub'], 'gastropub'],
    [['brewery', 'brewpub'], 'brewery'],
    [['restaurant'], 'restaurant'],
    [['nature reserve', 'nature park'], 'nature reserve'],
    [['country park', 'country estate'], 'country park'],
    [['viewpoint', 'scenic view', 'beauty spot', 'scenic spot'], 'scenic viewpoint'],
    [['river walk', 'riverside', 'waterfront'], 'riverside pub'],
    [['campsite', 'camping', 'caravan'], 'campsite with facilities'],
    [['café', 'cafe', 'coffee'], 'café'],
  ];

  const foundTypes: string[] = [];
  for (const [triggers, term] of siteTypes) {
    if (triggers.some(t => lower.includes(t))) {
      foundTypes.push(term);
    }
  }

  // If nothing was recognised fall back to pub (the core use case)
  if (foundTypes.length === 0) foundTypes.push('pub');

  // ── Extract qualifiers ──────────────────────────────────────────────────────
  const qualifiers: [string[], string][] = [
    [['large car park', 'big car park', 'large parking', 'plenty of parking', 'ample parking'], 'with large car park'],
    [['car park', 'parking', 'park'], 'with parking'],
    [['coast', 'coastal', 'sea', 'seaside', 'beach', 'ocean', 'harbour'], 'near the coast'],
    [['river', 'riverside', 'waterfront', 'canal'], 'by the river'],
    [['rural', 'countryside', 'country'], 'rural'],
    [['beauty spot', 'scenic', 'views', 'viewpoint'], 'near beauty spot'],
    [['garden', 'beer garden', 'outdoor'], 'with garden'],
    [['dog friendly', 'dog-friendly', 'dogs welcome'], 'dog friendly'],
    [['campervan', 'motorhome', 'overnight'], 'campervan friendly'],
  ];

  const foundQualifiers: string[] = [];
  for (const [triggers, q] of qualifiers) {
    if (triggers.some(t => lower.includes(t))) {
      foundQualifiers.push(q);
      // Only take the most specific parking qualifier (large car park beats generic parking)
      if (q.includes('large car park')) break;
      if (q === 'with parking') break;
    }
  }

  // ── Build search queries ────────────────────────────────────────────────────
  // One query per site type, combined with all qualifiers
  // e.g. "pub with large car park near the coast"
  const qualifierStr = foundQualifiers.join(' ');

  const queries = foundTypes.map(type =>
    qualifierStr ? `${type} ${qualifierStr}` : `${type} with parking`
  );

  // Always ensure parking is in the query (the one continual rule)
  const finalQueries = queries.map(q =>
    q.includes('parking') || q.includes('car park') ? q : `${q} with parking`
  );

  return [...new Set(finalQueries)];
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
  }

  return parts.join(' ');
}