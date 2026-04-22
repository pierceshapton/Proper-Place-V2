'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmApi, type CRMAutomationStatus, type CRMLead, type DiscoveryQueueItem } from '@/lib/api';
import { buildDiscoveryProfile, scoreCandidate, type CandidatePlace, type ScoredCandidate } from '@/lib/discoveryScoring';
import { applyScoreCalibration, computeLearningMetrics, type DiscoveryFeedbackItem } from '@/lib/discoveryLearning';
import type { SiteAnalysisResult } from '@/lib/discoverySiteAnalysis';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function DiscoverPage() {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [exampleIds, setExampleIds] = useState<Set<number>>(new Set());
  const [exampleSearch, setExampleSearch] = useState('');
  const [initializedExamples, setInitializedExamples] = useState(false);

  const [regionQuery, setRegionQuery] = useState('South West England');
  const [keywordInput, setKeywordInput] = useState('pub with parking, farm shop, country inn, vineyard, rural hotel');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [results, setResults] = useState<ScoredCandidate[]>([]);
  const [importMessage, setImportMessage] = useState('');
  const [activeCandidate, setActiveCandidate] = useState<ScoredCandidate | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [rejectedSites, setRejectedSites] = useState<RejectedSite[]>([]);
  const [firstStage, setFirstStage] = useState<{ slug: string; name: string }>({ slug: 'new', name: 'New' });

  const [reviewQueue, setReviewQueue] = useState<DiscoveryQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [activeQueueItem, setActiveQueueItem] = useState<DiscoveryQueueItem | null>(null);
  const [queueReviewStars, setQueueReviewStars] = useState(0);
  const [queueReviewNote, setQueueReviewNote] = useState('');
  const [submittingQueueReview, setSubmittingQueueReview] = useState(false);

  const [threshold, setThreshold] = useState(85);
  const [feedbackHistory, setFeedbackHistory] = useState<DiscoveryFeedbackItem[]>([]);
  const [userScoreMap, setUserScoreMap] = useState<Record<string, string>>({});
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [isAnalyzingSites, setIsAnalyzingSites] = useState(false);
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(false);
  const [autoFindEnabled, setAutoFindEnabled] = useState(false);
  const [automationStatus, setAutomationStatus] = useState<CRMAutomationStatus | null>(null);

  const loadLeads = useCallback(async () => {
    try {
      const response = await crmApi.getLeads({ limit: '500' });
      setLeads(response.leads);
      if (!initializedExamples) {
        const defaults = getDefaultExampleIds(response.leads);
        setExampleIds(new Set(defaults));
        setInitializedExamples(true);
      }
    } catch {
      setSearchError('Unable to load CRM leads.');
    }
  }, [initializedExamples]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    loadLearningSettings();
    loadReviewQueue();
  }, []);

  const filteredLeadChoices = useMemo(() => {
    const q = exampleSearch.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(lead => {
      const name = lead.business_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
      return [name, lead.location, lead.property_type, lead.source]
        .some(value => (value || '').toLowerCase().includes(q));
    });
  }, [leads, exampleSearch]);

  const exampleLeads = useMemo(() => leads.filter(lead => exampleIds.has(lead.id)), [leads, exampleIds]);
  const profile = useMemo(() => buildDiscoveryProfile(exampleLeads), [exampleLeads]);
  const learningMetrics = useMemo(() => computeLearningMetrics(feedbackHistory), [feedbackHistory]);
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

      const rawRejected = settingsMap.discovery_rejected_sites_v1 || '[]';
      const parsedRejected = safeParseRejected(rawRejected);
      setRejectedSites(parsedRejected);

      setAutoEmailEnabled(settingsMap.discovery_auto_email_enabled === 'true');
      setAutoFindEnabled(settingsMap.discovery_auto_find_enabled === 'true');

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

  async function loadReviewQueue() {
    setQueueLoading(true);
    try {
      const response = await crmApi.getDiscoveryReviewQueue();
      setReviewQueue(response.queue);
    } catch {
      // non-fatal — queue section just stays empty
    } finally {
      setQueueLoading(false);
    }
  }

  async function submitQueueItemReview() {
    if (!activeQueueItem || queueReviewStars < 1 || queueReviewStars > 5) return;
    setSubmittingQueueReview(true);
    setImportMessage('');
    try {
      await crmApi.submitDiscoveryQueueReview(activeQueueItem.id, queueReviewStars, queueReviewNote.trim() || undefined);
      setReviewQueue(current => current.filter(item => item.id !== activeQueueItem.id));
      setImportMessage(
        queueReviewStars >= 4
          ? `${activeQueueItem.business_name} added to ${firstStage.name} from review queue.`
          : `${activeQueueItem.business_name} rejected (${queueReviewStars}★) and remembered for future finds.`
      );
      setActiveQueueItem(null);
      setQueueReviewStars(0);
      setQueueReviewNote('');
      if (queueReviewStars >= 4) loadLeads();
    } catch {
      setImportMessage('Could not save queue review. Please try again.');
    } finally {
      setSubmittingQueueReview(false);
    }
  }

  function toggleExample(leadId: number) {
    setExampleIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }

  function applyConvertedExamples() {
    const converted = leads.filter(lead => lead.pipeline_stage === 'converted').slice(0, 35).map(lead => lead.id);
    if (converted.length > 0) setExampleIds(new Set(converted));
  }

  function applyTopRatedExamples() {
    const topRated = [...leads]
      .filter(lead => typeof lead.google_rating === 'number')
      .sort((a, b) => (b.google_rating || 0) - (a.google_rating || 0))
      .slice(0, 35)
      .map(lead => lead.id);
    if (topRated.length > 0) setExampleIds(new Set(topRated));
  }

  async function runDiscovery() {
    setSearchError('');
    setImportMessage('');

    if (!GOOGLE_MAPS_API_KEY) {
      setSearchError('Missing Google Maps API key in website environment.');
      return;
    }

    if (exampleLeads.length === 0) {
      setSearchError('Select at least one CRM lead as an example profile.');
      return;
    }

    const keywords = keywordInput
      .split(/[\n,]/)
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (!regionQuery.trim() || keywords.length === 0) {
      setSearchError('Enter a target region and at least one keyword.');
      return;
    }

    setIsSearching(true);
    try {
      const candidates = await searchGooglePlacesBatch(keywords, regionQuery, GOOGLE_MAPS_API_KEY);
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

      const filtered = scored.filter(item => !isRejected(item, rejectedSites));

      setResults(filtered);
      setUserScoreMap({});
    } catch {
      setSearchError('Google Places search failed. Check API access and billing.');
    } finally {
      setIsSearching(false);
    }
  }

  async function saveLearningFeedback() {
    const scoredRows = results
      .filter(item => userScoreMap[item.id] !== undefined && userScoreMap[item.id].trim() !== '')
      .map(item => {
        const userScore = clamp(Number(userScoreMap[item.id]), 0, 100);
        const stars = Math.round(userScore / 20) as number;
        return {
          id: item.id,
          aiScore: item.score,
          userScore,
          stars: clamp(stars, 1, 5),
          name: item.name,
          address: item.address,
          createdAt: new Date().toISOString(),
        };
      })
      .filter(item => Number.isFinite(item.userScore));

    if (scoredRows.length === 0) {
      setSettingsMessage('Add at least one manual score to save learning feedback.');
      return;
    }

    const deduped = new Map<string, DiscoveryFeedbackItem>();
    [...feedbackHistory, ...scoredRows].forEach(item => {
      deduped.set(item.id, item);
    });
    const merged = Array.from(deduped.values()).slice(-500);
    const metrics = computeLearningMetrics(merged);
    const thresholdPassed = metrics.samples >= 15 && metrics.accuracy >= threshold;

    setSettingsBusy(true);
    setSettingsMessage('');
    try {
      await crmApi.updateSettings({
        discovery_feedback_v1: JSON.stringify(merged),
        discovery_learning_samples: String(metrics.samples),
        discovery_learning_accuracy: String(metrics.accuracy),
        discovery_learning_agreement: String(metrics.agreementRate),
        discovery_auto_mode_ready: thresholdPassed ? 'true' : 'false',
      });
      setFeedbackHistory(merged);
      try {
        const automation = await crmApi.getAutomationStatus();
        setAutomationStatus(automation);
      } catch {}
      setSettingsMessage(`Learning saved. Accuracy ${metrics.accuracy}% (${metrics.samples} scored sites).`);
    } catch {
      setSettingsMessage('Saving learning feedback failed.');
    } finally {
      setSettingsBusy(false);
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
      setSettingsMessage(`Analyzed ${analyzedCount} sites with website/parking/access signals.`);
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

  async function toggleAutoFind(enable: boolean) {
    setSettingsBusy(true);
    setSettingsMessage('');
    try {
      await crmApi.updateSettings({
        discovery_auto_find_enabled: enable ? 'true' : 'false',
      });
      setAutoFindEnabled(enable);
      setSettingsMessage(enable ? 'Auto-find enabled (email remains disabled).' : 'Auto-find disabled.');
    } catch {
      setSettingsMessage('Could not update auto-find setting.');
    } finally {
      setSettingsBusy(false);
    }
  }

  async function runAutoFindNow() {
    setSettingsBusy(true);
    setSettingsMessage('');
    try {
      const result = await crmApi.runAutoDiscovery();
      if (result.skipped) {
        setSettingsMessage(`Auto-find skipped: ${result.reason || 'not ready'}.`);
      } else {
        setSettingsMessage(`Auto-find completed. ${result.queued || 0} site(s) added to review queue (${result.considered || 0} candidates scored).`);
        loadReviewQueue();
      }
    } catch {
      setSettingsMessage('Auto-find run failed.');
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
      setImportMessage(
        reviewStars >= 4
          ? `${activeCandidate.name} added to ${firstStage.name} and learning saved.`
          : `${activeCandidate.name} rejected (${reviewStars}★), removed, and remembered for future searches.`
      );
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
        <p className="text-sm text-slate-500 mt-1">Example-driven location identification from your CRM selections</p>
      </div>

      <section className="grid md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Learning Accuracy</p>
          <p className="text-xl font-bold text-slate-100 mt-1">{learningMetrics.accuracy}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Target: {threshold}%</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Scored Sites</p>
          <p className="text-xl font-bold text-slate-100 mt-1">{learningMetrics.samples}</p>
          <p className="text-[11px] text-slate-500 mt-1">Min 15 required</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Agreement (±10)</p>
          <p className="text-xl font-bold text-slate-100 mt-1">{learningMetrics.agreementRate}%</p>
          <p className="text-[11px] text-slate-500 mt-1">AI vs your scores</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Auto Email Gate</p>
          <p className={`text-xl font-bold mt-1 ${autoModeReady ? 'text-emerald-400' : 'text-amber-400'}`}>{autoModeReady ? 'READY' : 'LOCKED'}</p>
          <p className="text-[11px] text-slate-500 mt-1">Unlocks at threshold</p>
        </div>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-2 justify-between">
        <div>
          <p className="text-sm text-slate-200 font-semibold">Automation Controls</p>
          <p className="text-xs text-slate-500 mt-0.5">Run autonomous site finding and keep email separate.</p>
          <p className="text-xs text-slate-400 mt-1">Auto-find: <span className={autoFindEnabled ? 'text-emerald-400' : 'text-slate-400'}>{autoFindEnabled ? 'ON' : 'OFF'}</span> · Auto-email: <span className={autoEmailEnabled ? 'text-amber-400' : 'text-slate-400'}>{autoEmailEnabled ? 'ON' : 'OFF'}</span></p>
          {automationStatus && !automationStatus.server_kill_switch_enabled && (
            <p className="text-xs text-amber-300 mt-1">Automation deactivated by server kill-switch. This is safe mode until explicitly activated in backend env.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleAutoFind(!autoFindEnabled)}
            disabled={settingsBusy}
            className={`${autoFindEnabled ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'} disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg`}
          >
            {autoFindEnabled ? 'Disable Auto Find' : 'Enable Auto Find'}
          </button>
          <button
            onClick={runAutoFindNow}
            disabled={settingsBusy}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg"
          >
            Run Auto-Find Now
          </button>
          <button
            onClick={analyzeSignalsForSelected}
            disabled={isAnalyzingSites || results.length === 0}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg"
          >
            {isAnalyzingSites ? 'Analyzing…' : 'Analyze Parking + Access'}
          </button>
          <button
            onClick={() => toggleAutoEmail(!autoEmailEnabled)}
            disabled={settingsBusy}
            className={`${autoEmailEnabled ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'} disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg`}
          >
            {autoEmailEnabled ? 'Disable Auto Email' : 'Enable Auto Email'}
          </button>
        </div>
      </section>

      {(reviewQueue.length > 0 || queueLoading) && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Auto-Find Review Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sites found by the background scheduler — rate each before it enters the pipeline.</p>
            </div>
            <span className="text-xs text-amber-400 font-semibold">{queueLoading ? 'Loading…' : `${reviewQueue.length} pending`}</span>
          </div>

          {!queueLoading && reviewQueue.length > 0 && (
            <div className="max-h-[360px] overflow-y-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-slate-950 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Site</th>
                    <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Fit</th>
                    <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Rating</th>
                    <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Reviews</th>
                    <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Signals</th>
                    <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {reviewQueue.map(item => (
                    <tr key={item.id} onClick={() => { setActiveQueueItem(item); setQueueReviewStars(0); }} className="cursor-pointer hover:bg-slate-800/40">
                      <td className="px-3 py-2 align-top">
                        <p className="text-sm text-slate-200 font-medium">{item.business_name}</p>
                        <p className="text-xs text-slate-500">{item.location || '—'}</p>
                        {item.website && (
                          <a href={item.website} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-400 hover:underline">{item.website}</a>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.discovery_fit_score >= 75 ? 'bg-emerald-500/15 text-emerald-400' : item.discovery_fit_score >= 60 ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
                          {item.discovery_fit_score}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">{item.google_rating ?? '—'}</td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">{item.google_reviews_count ?? '—'}</td>
                      <td className="px-3 py-2 align-top">
                        <div className="space-y-1 min-w-[150px]">
                          <SignalPill label="Parking" value={item.discovery_parking_confidence} color="emerald" />
                          <SignalPill label="Access" value={item.discovery_access_score} color="sky" />
                          <SignalPill label="Campervan" value={item.discovery_campervan_priority} color="amber" />
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <button
                          onClick={e => { e.stopPropagation(); setActiveQueueItem(item); setQueueReviewStars(0); }}
                          className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs px-3 py-1.5 rounded-lg border border-amber-500/30"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Example Profile Leads</h2>
            <span className="text-xs text-emerald-400">{exampleLeads.length} selected</span>
          </div>

          <div className="flex gap-2">
            <button onClick={applyConvertedExamples} className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100">Use 35 Converted</button>
            <button onClick={applyTopRatedExamples} className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100">Use Top Rated 35</button>
          </div>

          <input
            value={exampleSearch}
            onChange={e => setExampleSearch(e.target.value)}
            placeholder="Filter leads by name, location, type..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
          />

          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800 divide-y divide-slate-800">
            {filteredLeadChoices.map(lead => {
              const name = lead.business_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unnamed';
              const checked = exampleIds.has(lead.id);
              return (
                <label key={lead.id} className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-800/40">
                  <input type="checkbox" checked={checked} onChange={() => toggleExample(lead.id)} className="accent-emerald-500 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{lead.location || '—'} · {lead.property_type || '—'} · {lead.pipeline_stage}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg px-2.5 py-2">Avg rating target: <span className="text-slate-300">{profile.averageRating.toFixed(2)}</span></div>
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg px-2.5 py-2">Avg reviews target: <span className="text-slate-300">{Math.round(profile.averageReviews)}</span></div>
          </div>
        </section>

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
            {isSearching ? 'Finding and scoring locations…' : 'Identify Similar Sites'}
          </button>

          <p className="text-xs text-slate-500">This scores candidates against your selected CRM examples. Nothing is auto-added; review each site first.</p>
        </section>
      </div>

      {searchError && (
        <div className="text-sm px-3 py-2 rounded-lg border bg-red-500/10 border-red-500/20 text-red-400">{searchError}</div>
      )}

      {results.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Scored Candidate Locations</h2>
            <span className="text-xs text-slate-500">{results.length} pending review</span>
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-950 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Site</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Fit Score</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Rating</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Reviews</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Satellite</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Signals</th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-500 uppercase tracking-wider">Your Score</th>
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
                      <td className="px-3 py-2 align-top">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.score >= 75 ? 'bg-emerald-500/15 text-emerald-400' : item.score >= 60 ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
                          {item.score}
                        </span>
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
                        <div className="space-y-1 min-w-[170px]">
                          <SignalPill label="Parking" value={item.siteAnalysis?.parkingConfidence ?? 0} color="emerald" />
                          <SignalPill label="Access" value={item.siteAnalysis?.accessScore ?? 0} color="sky" />
                          <SignalPill label="Campervan" value={item.siteAnalysis?.campervanPriority ?? 0} color="amber" />
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={userScoreMap[item.id] || ''}
                            onChange={e => setUserScoreMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="0-100"
                            className="w-20 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200"
                          />
                          <span className="text-[11px] text-slate-500">AI {item.score}</span>
                        </div>
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

          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-500">Rate each site in summary: 4-5★ adds to {firstStage.name}, 1-3★ is removed and remembered.</p>
            <div className="flex items-center gap-2">
              <button
                onClick={saveLearningFeedback}
                disabled={settingsBusy}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                {settingsBusy ? 'Saving Learning…' : 'Save Learning'}
              </button>
            </div>
          </div>
        </section>
      )}

      {activeCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setActiveCandidate(null)}>
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
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
              <SummaryStat label="AI Fit" value={String(activeCandidate.score)} />
              <SummaryStat label="Google" value={activeCandidate.rating ? `${activeCandidate.rating}★` : '—'} />
              <SummaryStat label="Reviews" value={activeCandidate.reviews ? String(activeCandidate.reviews) : '—'} />
              <SummaryStat label="Type" value={activeCandidate.primaryType || activeCandidate.types[0] || '—'} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <SignalPill label="Parking" value={activeCandidate.siteAnalysis?.parkingConfidence ?? 0} color="emerald" />
              <SignalPill label="Access" value={activeCandidate.siteAnalysis?.accessScore ?? 0} color="sky" />
              <SignalPill label="Campervan" value={activeCandidate.siteAnalysis?.campervanPriority ?? 0} color="amber" />
            </div>

            {activeCandidate.latitude !== null && activeCandidate.longitude !== null && GOOGLE_MAPS_API_KEY && (
              <div className="rounded-lg overflow-hidden border border-slate-700">
                <iframe
                  title={`Map of ${activeCandidate.name}`}
                  width="100%"
                  height="280"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_API_KEY}&center=${activeCandidate.latitude},${activeCandidate.longitude}&zoom=17&maptype=satellite`}
                />
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 mb-1">Why it matches</p>
              <p className="text-xs text-slate-300">{activeCandidate.reasons.join(' · ')}</p>
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

      {activeQueueItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setActiveQueueItem(null)}>
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wide">Auto-Found</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mt-1">{activeQueueItem.business_name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{activeQueueItem.location || 'No address'}</p>
                {activeQueueItem.website && (
                  <a href={activeQueueItem.website} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:underline mt-1 inline-block">{activeQueueItem.website}</a>
                )}
              </div>
              <button onClick={() => setActiveQueueItem(null)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <SummaryStat label="Fit Score" value={String(activeQueueItem.discovery_fit_score)} />
              <SummaryStat label="Google" value={activeQueueItem.google_rating ? `${activeQueueItem.google_rating}★` : '—'} />
              <SummaryStat label="Reviews" value={activeQueueItem.google_reviews_count ? String(activeQueueItem.google_reviews_count) : '—'} />
              <SummaryStat label="Found" value={new Date(activeQueueItem.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <SignalPill label="Parking" value={activeQueueItem.discovery_parking_confidence} color="emerald" />
              <SignalPill label="Access" value={activeQueueItem.discovery_access_score} color="sky" />
              <SignalPill label="Campervan" value={activeQueueItem.discovery_campervan_priority} color="amber" />
            </div>

            {activeQueueItem.latitude !== null && activeQueueItem.longitude !== null && GOOGLE_MAPS_API_KEY && (
              <div className="rounded-lg overflow-hidden border border-slate-700">
                <iframe
                  title={`Map of ${activeQueueItem.business_name}`}
                  width="100%"
                  height="280"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_API_KEY}&center=${Number(activeQueueItem.latitude)},${Number(activeQueueItem.longitude)}&zoom=17&maptype=satellite`}
                />
              </div>
            )}

            {activeQueueItem.admin_notes && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Notes</p>
                <p className="text-xs text-slate-300">{activeQueueItem.admin_notes}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 mb-1">Your rating</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setQueueReviewStars(star)}
                    className={`text-xl leading-none ${queueReviewStars >= star ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
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
                value={queueReviewNote}
                onChange={e => setQueueReviewNote(e.target.value)}
                rows={2}
                placeholder="e.g. Visited once, great access road, owner was friendly…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={submitQueueItemReview}
                disabled={submittingQueueReview || queueReviewStars === 0}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                {submittingQueueReview ? 'Submitting…' : 'Submit Review'}
              </button>
              <button onClick={() => setActiveQueueItem(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-lg">Cancel</button>
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

function getDefaultExampleIds(leads: CRMLead[]): number[] {
  const tagged = leads.filter(lead => (lead.tags || []).some(tag => ['example', 'ideal', 'model'].includes((tag || '').toLowerCase())));
  if (tagged.length > 0) return tagged.slice(0, 35).map(lead => lead.id);

  const converted = leads.filter(lead => lead.pipeline_stage === 'converted');
  if (converted.length > 0) return converted.slice(0, 35).map(lead => lead.id);

  return [...leads]
    .sort((a, b) => (b.google_rating || 0) - (a.google_rating || 0))
    .slice(0, 35)
    .map(lead => lead.id);
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

function SignalPill({ label, value, color }: { label: string; value: number; color: 'emerald' | 'sky' | 'amber' }) {
  const tone = value >= 70
    ? color === 'emerald' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : color === 'sky' ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : value >= 40
      ? 'bg-slate-700/60 text-slate-200 border-slate-600'
      : 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <div className={`text-[10px] px-2 py-1 rounded-md border ${tone} flex items-center justify-between`}>
      <span>{label}</span>
      <span className="font-semibold">{Math.round(value)}</span>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1.5">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-slate-200 mt-0.5">{value}</p>
    </div>
  );
}
