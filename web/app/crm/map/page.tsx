'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { crmApi, type CRMLead, type CRMStage, type CRMActivity, type CRMTask, type CRMSiteVisit, type CRMEmailLog } from '@/lib/api';
import { stageColors, COLOR_HEX } from '@/lib/stageColors';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || 'AIzaSyBqXtdl4q7VW4PEbK2dKsdouT1d_35WTy0';

const DEFAULT_STAGES: CRMStage[] = [
  { id: 1, slug: 'new',         name: 'New',         color: 'blue',    sort_order: 1, is_won: false, is_lost: false },
  { id: 2, slug: 'contacted',   name: 'Contacted',   color: 'amber',   sort_order: 2, is_won: false, is_lost: false },
  { id: 3, slug: 'assessing',   name: 'Assessing',   color: 'violet',  sort_order: 3, is_won: false, is_lost: false },
  { id: 4, slug: 'negotiating', name: 'Negotiating', color: 'orange',  sort_order: 4, is_won: false, is_lost: false },
  { id: 5, slug: 'converted',   name: 'Converted',   color: 'emerald', sort_order: 5, is_won: true,  is_lost: false },
  { id: 6, slug: 'lost',        name: 'Lost',        color: 'red',     sort_order: 6, is_won: false, is_lost: true  },
];

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c4a6e' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

function buildPinSvg(hex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="${hex}" stroke="#0f172a" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="#0f172a" opacity="0.3"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}


const PRIORITIES = ['hot', 'warm', 'medium', 'cold'];
const PRIORITY_BADGE: Record<string, string> = {
  hot: 'bg-red-500 text-white', warm: 'bg-orange-500 text-white',
  medium: 'bg-slate-500 text-white', cold: 'bg-blue-500 text-white',
};

export default function CRMMapPage() {
  const [stages, setStages] = useState<CRMStage[]>(DEFAULT_STAGES);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStages, setActiveStages] = useState<Set<string>>(new Set());
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const hasFitBounds = useRef(false);
  const [initialCenter] = useState({ lat: 52.5, lng: -1.5 });
  const [initialZoom] = useState(6);

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: ['places'] });

  useEffect(() => {
    crmApi.getStages().then(r => setStages(r.stages.sort((a: CRMStage, b: CRMStage) => a.sort_order - b.sort_order))).catch(() => {});
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      const res = await crmApi.getLeads({ limit: '500' });
      setLeads(res.leads);
    } catch {} finally { setLoading(false); }
  }

  const mappableLeads = leads.filter(l => l.latitude && l.longitude);

  const filteredLeads = activeStages.size === 0
    ? mappableLeads.filter(l => l.pipeline_stage !== 'lost')
    : mappableLeads.filter(l => activeStages.has(l.pipeline_stage));

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchResults = searchQuery.trim().length < 1 ? [] : mappableLeads.filter(l => {
    const q = searchQuery.toLowerCase();
    const name = (l.business_name || `${l.first_name || ''} ${l.last_name || ''}`).toLowerCase();
    const loc = (l.location || '').toLowerCase();
    return name.includes(q) || loc.includes(q);
  }).slice(0, 12);

  function handleSearchSelect(lead: CRMLead) {
    setSearchQuery('');
    setSearchOpen(false);
    if (mapRef.current && lead.latitude && lead.longitude) {
      mapRef.current.panTo({ lat: Number(lead.latitude), lng: Number(lead.longitude) });
      mapRef.current.setZoom(15);
    }
    // Small delay so the map pans before the modal opens
    setTimeout(() => setSelectedLeadId(lead.id), 100);
  }

  function toggleStage(slug: string) {
    setActiveStages(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }

  function getStageColor(slug: string): string {
    const stage = stages.find(s => s.slug === slug);
    return stage ? (COLOR_HEX[stage.color] || '#64748b') : '#64748b';
  }

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (!hasFitBounds.current && mappableLeads.length > 0) {
      hasFitBounds.current = true;
      const bounds = new google.maps.LatLngBounds();
      mappableLeads.forEach(l => bounds.extend({ lat: Number(l.latitude), lng: Number(l.longitude) }));
      map.fitBounds(bounds, 60);
    }
  }, [mappableLeads.length]);

  const leadsWithCoords = filteredLeads.filter(l => l.latitude && l.longitude);
  const leadsNoCoords = leads.length - mappableLeads.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-100">Lead Map</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {leadsWithCoords.length} lead{leadsWithCoords.length !== 1 ? 's' : ''} shown
            {leadsNoCoords > 0 && <span className="text-slate-600"> · {leadsNoCoords} without coordinates</span>}
          </p>
        </div>
        {/* Search */}
        <div ref={searchRef} className="relative w-72 flex-shrink-0">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus-within:border-emerald-500/60 transition-colors">
            <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search sites…"
              className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1 min-w-0"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="text-slate-500 hover:text-slate-300 text-xs leading-none">✕</button>
            )}
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              {searchResults.map(lead => {
                const displayName = lead.business_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unnamed';
                const stage = stages.find(s => s.slug === lead.pipeline_stage);
                const c = stage ? stageColors(stage.color) : null;
                return (
                  <button
                    key={lead.id}
                    onClick={() => handleSearchSelect(lead)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 transition-colors text-left"
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLOR_HEX[stage?.color || ''] || '#64748b' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{displayName}</p>
                      {lead.location && <p className="text-[11px] text-slate-500 truncate">{lead.location}</p>}
                    </div>
                    {stage && c && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${c.badgeBg} ${c.badgeText}`}>{stage.name}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {searchOpen && searchQuery.trim().length >= 1 && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl px-3 py-3">
              <p className="text-sm text-slate-500 text-center">No sites found</p>
            </div>
          )}
        </div>
      </div>

      {/* Stage filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveStages(new Set())}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
            activeStages.size === 0
              ? 'bg-slate-200 text-slate-900'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
          }`}
        >
          All ({mappableLeads.length})
        </button>
        {stages.map(stage => {
          const count = mappableLeads.filter(l => l.pipeline_stage === stage.slug).length;
          const active = activeStages.has(stage.slug);
          const c = stageColors(stage.color);
          return (
            <button
              key={stage.slug}
              onClick={() => toggleStage(stage.slug)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                active ? `${c.bg} text-white` : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: COLOR_HEX[stage.color] || '#64748b' }}></span>
              {stage.name} ({count})
            </button>
          );
        })}

      </div>

      {/* Map */}
      <div className="rounded-xl border border-slate-800 overflow-hidden" style={{ height: 'calc(100vh - 14rem)' }}>
        {!isLoaded || loading ? (
          <div className="flex items-center justify-center h-full bg-slate-900">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={initialCenter}
            zoom={initialZoom}
            onLoad={onMapLoad}
            options={{
              styles: MAP_STYLES,
              disableDefaultUI: true,
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: true,
              backgroundColor: '#0f172a',
              gestureHandling: 'greedy',
            }}
          >
            {leadsWithCoords.map(lead => (
              <Marker
                key={`${lead.id}-${getStageColor(lead.pipeline_stage)}`}
                position={{ lat: Number(lead.latitude), lng: Number(lead.longitude) }}
                icon={{
                  url: buildPinSvg(getStageColor(lead.pipeline_stage)),
                  scaledSize: new google.maps.Size(28, 40),
                  anchor: new google.maps.Point(14, 40),
                }}
                title={lead.business_name || `${lead.first_name} ${lead.last_name}`.trim() || 'Unnamed'}
                onClick={() => setSelectedLeadId(lead.id)}
              />
            ))}
          </GoogleMap>
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          stages={stages}
          onClose={() => setSelectedLeadId(null)}
          onLeadUpdate={(id, patch) => setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))}
        />
      )}

    </div>
  );
}

/* ── Lead Detail Modal ─────────────────────────────────────── */

function LeadDetailModal({ leadId, stages, onClose, onLeadUpdate }: {
  leadId: number; stages: CRMStage[]; onClose: () => void;
  onLeadUpdate?: (id: number, patch: Partial<CRMLead>) => void;
}) {
  const router = useRouter();
  const [lead, setLead] = useState<CRMLead | null>(null);
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [visits, setVisits] = useState<CRMSiteVisit[]>([]);
  const [emails, setEmails] = useState<CRMEmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('activity');
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteForm, setNoteForm] = useState({ activity_type: 'note', title: '', description: '' });
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '', priority: 'medium', description: '' });
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', to: '' });

  useEffect(() => { loadData(); }, [leadId]);

  async function loadData() {
    setLoading(true);
    try {
      const [leadRes, actRes, taskRes, visitRes, emailRes] = await Promise.all([
        crmApi.getLead(leadId), crmApi.getActivities(leadId),
        crmApi.getTasks({ lead_id: String(leadId) }), crmApi.getSiteVisits(leadId),
        crmApi.getEmailLog(leadId),
      ]);
      setLead(leadRes.lead); setActivities(actRes.activities);
      setTasks(taskRes.tasks); setVisits(visitRes.visits);
      setEmails(emailRes.emails || []);
    } catch { onClose(); } finally { setLoading(false); }
  }

  async function handleStageChange(stage: string) {
    if (!lead) return;
    await crmApi.updateLead(leadId, { pipeline_stage: stage } as Partial<CRMLead>);
    setLead({ ...lead, pipeline_stage: stage });
    onLeadUpdate?.(leadId, { pipeline_stage: stage });
  }

  async function handlePriorityChange(priority: string) {
    if (!lead) return;
    await crmApi.updateLead(leadId, { priority } as Partial<CRMLead>);
    setLead({ ...lead, priority });
    onLeadUpdate?.(leadId, { priority });
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    await crmApi.createActivity(leadId, noteForm);
    setShowAddNote(false); setNoteForm({ activity_type: 'note', title: '', description: '' });
    loadData();
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    await crmApi.createTask({ lead_id: leadId, ...taskForm });
    setShowAddTask(false); setTaskForm({ title: '', due_date: '', priority: 'medium', description: '' });
    loadData();
  }

  async function handleCompleteTask(taskId: number) {
    await crmApi.updateTask(taskId, { status: 'completed' }); loadData();
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    const to = emailForm.to || lead?.email || '';
    if (!to) return;
    if (!lead?.email && emailForm.to) {
      await crmApi.updateLead(leadId, { email: emailForm.to } as Partial<CRMLead>);
      setLead(l => l ? { ...l, email: emailForm.to } : l);
    }
    await crmApi.sendEmail(leadId, { subject: emailForm.subject, body: emailForm.body });
    setShowSendEmail(false);
    setEmailForm({ subject: '', body: '', to: '' });
    loadData();
  }

  if (loading || !lead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  const displayName = lead.business_name || `${lead.first_name} ${lead.last_name}`.trim() || 'Unnamed Lead';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-100 truncate">{displayName}</h2>
                {lead.is_chain && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 whitespace-nowrap flex-shrink-0" title={lead.chain_name || 'Chain venue'}>
                    🔗 {lead.chain_name || 'Chain'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {lead.location && <span className="text-xs text-slate-400">📍 {lead.location}</span>}
                {lead.google_rating && <span className="text-xs text-slate-400">⭐ {lead.google_rating} ({lead.google_reviews_count} reviews)</span>}
                {lead.phone && <span className="text-xs text-slate-400">📞 {lead.phone}</span>}
                {lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline truncate max-w-[200px] block">🌐 {lead.website}</a>}
                {lead.email && <span className="text-xs text-slate-400">✉ {lead.email}</span>}
              </div>
              {lead.opening_hours_text && (() => {
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const today = dayNames[new Date().getDay()];
                const todayLine = lead.opening_hours_text.split('\n').find(line => line.startsWith(today));
                const hours = todayLine ? todayLine.replace(/^[^:]+:\s*/, '') : null;
                return (
                  <p className="mt-1.5 text-[11px] text-slate-400 flex items-center gap-1">
                    <span>🕐</span>
                    <span className="font-medium text-slate-300">{today}:</span>
                    <span>{hours ?? 'Hours not available'}</span>
                  </p>
                );
              })()}
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none flex-shrink-0 mt-1">✕</button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex flex-wrap gap-1">
              {stages.map(stage => {
                const active = lead.pipeline_stage === stage.slug;
                const c = stageColors(stage.color);
                return (
                  <button key={stage.slug} onClick={() => handleStageChange(stage.slug)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${active ? `${c.bg} text-white` : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'}`}>
                    {stage.name}
                  </button>
                );
              })}
            </div>
            <div className="border-l border-slate-700 pl-2 flex gap-1">
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => handlePriorityChange(p)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${lead.priority === p ? PRIORITY_BADGE[p] : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Satellite map */}
        {lead.latitude && lead.longitude && (
          <div className="mx-5 mt-3 rounded-lg overflow-hidden border border-slate-700 relative h-36">
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={{ lat: Number(lead.latitude), lng: Number(lead.longitude) }}
              zoom={17}
              options={{ mapTypeId: 'satellite', disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy' }}
            >
              <Marker
                position={{ lat: Number(lead.latitude), lng: Number(lead.longitude) }}
                title={displayName}
                onClick={() => {
                  const mapsUrl = lead.google_place_id
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayName)}&query_place_id=${lead.google_place_id}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayName)}+${lead.latitude},${lead.longitude}`;
                  window.open(mapsUrl, '_blank', 'noopener,noreferrer');
                }}
              />
            </GoogleMap>
            <a
              href={lead.google_place_id
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayName)}&query_place_id=${lead.google_place_id}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayName)}+${lead.latitude},${lead.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[11px] px-2 py-1 rounded z-10"
            >
              Open in Maps ↗
            </a>
          </div>
        )}

        {/* Create Site action */}
        <div className="mx-5 mt-3">
          {lead.linked_place ? (
            <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 py-2.5 px-3 rounded-lg text-xs flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">
                ✓ Site linked: <span className="font-semibold text-emerald-200">{lead.linked_place.name}</span>
                {' · '}
                <span className="text-emerald-400/80">{lead.linked_place.approval_status}</span>
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`/place/${lead.linked_place.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-300 hover:text-emerald-100 bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap"
                >
                  View listing ↗
                </a>
                <Link
                  href={`/admin/places/${lead.linked_place.id}`}
                  className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap"
                >
                  Edit
                </Link>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => router.push(`/crm/hosts?lead_id=${leadId}`)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow"
            >
              🏠 Create Site for Host
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-800 px-5">
          {[
            { key: 'activity', label: 'Activity', count: activities.length },
            { key: 'emails', label: 'Emails', count: emails.length },
            { key: 'tasks', label: 'Tasks', count: tasks.filter(t => t.status === 'pending').length },
            { key: 'visits', label: 'Visits', count: visits.length },
            { key: 'info', label: 'Details' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t.key ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {t.label}
              {t.count !== undefined && t.count > 0 && <span className="ml-1 bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {tab === 'activity' && (
            <div className="space-y-3">
              <button onClick={() => setShowAddNote(!showAddNote)} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add note</button>
              {showAddNote && (
                <form onSubmit={handleAddNote} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                  <select value={noteForm.activity_type} onChange={e => setNoteForm(f => ({ ...f, activity_type: e.target.value }))}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
                    {['note','call','email','meeting','site_visit'].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1).replace('_',' ')}</option>)}
                  </select>
                  <textarea value={noteForm.description} onChange={e => setNoteForm(f => ({ ...f, description: e.target.value }))} placeholder="Notes..." rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500" />
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg">Add</button>
                </form>
              )}
              {activities.length === 0 ? <p className="text-sm text-slate-600 text-center py-6">No activity yet</p> : (
                <div className="space-y-1">
                  {activities.map(a => (
                    <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-slate-800/50">
                      <ActivityIcon type={a.activity_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-400 capitalize">{a.activity_type.replace('_', ' ')}</p>
                        {a.description && <p className="text-sm text-slate-300 mt-0.5">{a.description}</p>}
                        <p className="text-[11px] text-slate-600 mt-1">{a.created_by_name || 'System'} · {timeAgo(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-3">
              <button onClick={() => setShowAddTask(!showAddTask)} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add task</button>
              {showAddTask && (
                <form onSubmit={handleAddTask} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                  <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title..."
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500" />
                  <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Notes (optional)..." rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500" />
                  <div className="flex gap-2">
                    <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" />
                    <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
                      {['hot','medium','cold'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg">Add Task</button>
                </form>
              )}
              {tasks.length === 0 ? <p className="text-sm text-slate-600 text-center py-6">No tasks</p> : (
                <div className="space-y-1">
                  {tasks.map(t => (
                    <div key={t.id} className={`flex items-center gap-3 py-2.5 border-b border-slate-800/50 ${t.status === 'completed' ? 'opacity-50' : ''}`}>
                      <button onClick={() => t.status !== 'completed' && handleCompleteTask(t.id)}
                        className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${t.status === 'completed' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-600 hover:border-emerald-500'}`}>
                        {t.status === 'completed' ? '✓' : ''}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${t.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{t.title}</p>
                        {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                        {t.due_date && (
                          <p className={`text-[11px] mt-0.5 ${new Date(t.due_date) < new Date() && t.status !== 'completed' ? 'text-red-400' : 'text-slate-500'}`}>
                            Due: {new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {new Date(t.due_date) < new Date() && t.status !== 'completed' && ' ⚠ overdue'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'emails' && (
            <div className="space-y-3">
              <button onClick={() => setShowSendEmail(!showSendEmail)} className="text-xs text-blue-400 hover:text-blue-300">+ Send email</button>
              {showSendEmail && (
                <form onSubmit={handleSendEmail} className="bg-slate-800/50 border border-blue-500/30 rounded-lg p-3 space-y-2">
                  {lead.email ? (
                    <p className="text-xs text-blue-400 font-medium">To: {lead.email}</p>
                  ) : (
                    <input
                      type="email"
                      value={emailForm.to}
                      onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))}
                      placeholder="Enter email address..."
                      required
                      className="w-full bg-slate-800 border border-blue-500/40 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  )}
                  <input
                    value={emailForm.subject}
                    onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Subject..."
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                  <textarea
                    value={emailForm.body}
                    onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
                    placeholder={"Hi {{first_name}},\n\nI noticed {{business_name}} has a great location..."}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg">Send</button>
                    <button type="button" onClick={() => setShowSendEmail(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg">Cancel</button>
                  </div>
                </form>
              )}
              {emails.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-6">No emails sent</p>
              ) : (
                <div className="space-y-2">
                  {emails.map(e => (
                    <div key={e.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-300">{e.subject}</p>
                        <span className="text-[10px] text-slate-500">{timeAgo(e.sent_at)}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">To: {e.to_email}</p>
                      <div className="text-xs text-slate-400 mt-2 prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: e.body }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'visits' && (
            <div className="space-y-3">
              {visits.length === 0 ? <p className="text-sm text-slate-600 text-center py-6">No site visits recorded</p> : (
                visits.map(v => (
                  <div key={v.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">{new Date(v.visit_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {v.verdict && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.verdict === 'convert' ? 'bg-emerald-500/10 text-emerald-400' : v.verdict === 'promising' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{v.verdict.replace(/_/g, ' ')}</span>}
                    </div>
                    {v.contact_name && <p className="text-xs text-slate-400">Spoke to: {v.contact_name} ({v.contact_role || '—'})</p>}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <InfoField label="Surface" value={v.car_park_surface} />
                      <InfoField label="Spaces" value={v.car_park_spaces?.toString()} />
                      <InfoField label="Access" value={v.motorhome_access} />
                      <InfoField label="Reaction" value={v.owner_reaction?.replace('_', ' ')} />
                    </div>
                    {v.notes && <p className="text-xs text-slate-400 italic">{v.notes}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'info' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <InfoField label="Source" value={lead.source || '—'} />
                <InfoField label="Property Type" value={lead.property_type || '—'} />
                <InfoField label="Website" value={lead.website || '—'} />
                <InfoField label="Parking Type" value={lead.parking_type || '—'} />
                <InfoField label="Parking Spaces" value={lead.parking_spaces?.toString() || '—'} />
                <InfoField label="Ownership" value={lead.ownership_type || '—'} />
                <InfoField label="Created" value={new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
                <InfoField label="Last Updated" value={new Date(lead.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
                <InfoField label="Est. Value" value={lead.estimated_value ? `£${lead.estimated_value}` : '—'} />
              </div>
              {lead.admin_notes && (
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{lead.admin_notes}</p>
                </div>
              )}
              <Link href={`/crm/leads/${lead.id}`} className="inline-block text-xs text-emerald-400 hover:text-emerald-300 mt-2">
                Open full detail page →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div>
      <p className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</p>
      <p className="text-xs text-slate-300">{value || '—'}</p>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    email: 'bg-blue-500/20 text-blue-400', call: 'bg-green-500/20 text-green-400',
    site_visit: 'bg-violet-500/20 text-violet-400', stage_change: 'bg-amber-500/20 text-amber-400',
    note: 'bg-slate-500/20 text-slate-400', task_created: 'bg-cyan-500/20 text-cyan-400',
    lead_created: 'bg-emerald-500/20 text-emerald-400', meeting: 'bg-purple-500/20 text-purple-400',
  };
  const icons: Record<string, string> = {
    email: '✉', call: '📞', site_visit: '📍', stage_change: '→',
    note: '📝', task_created: '☐', lead_created: '+', meeting: '🤝',
  };
  return (
    <div className={`w-7 h-7 rounded-lg ${colors[type] || 'bg-slate-500/20 text-slate-400'} flex items-center justify-center text-xs flex-shrink-0`}>
      {icons[type] || '•'}
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
