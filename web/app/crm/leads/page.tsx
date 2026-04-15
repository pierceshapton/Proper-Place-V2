'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { crmApi, type CRMLead, type CRMStage } from '@/lib/api';
import { stageColors } from '@/lib/stageColors';

const DEFAULT_STAGES: CRMStage[] = [
  { id: 1, slug: 'new',         name: 'New',         color: 'blue',    sort_order: 1, is_won: false, is_lost: false },
  { id: 2, slug: 'contacted',   name: 'Contacted',   color: 'amber',   sort_order: 2, is_won: false, is_lost: false },
  { id: 3, slug: 'assessing',   name: 'Assessing',   color: 'violet',  sort_order: 3, is_won: false, is_lost: false },
  { id: 4, slug: 'negotiating', name: 'Negotiating', color: 'orange',  sort_order: 4, is_won: false, is_lost: false },
  { id: 5, slug: 'converted',   name: 'Converted',   color: 'emerald', sort_order: 5, is_won: true,  is_lost: false },
  { id: 6, slug: 'lost',        name: 'Lost',        color: 'red',     sort_order: 6, is_won: false, is_lost: true  },
];

const PRIORITIES = ['hot', 'warm', 'medium', 'cold'];
const PROPERTY_TYPES = ['pub', 'farm', 'campsite', 'hotel', 'caravan_park', 'other'];

const PRIORITY_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  hot:    { dot: 'bg-red-500',    text: 'text-red-400',    bg: 'bg-red-500/10'    },
  warm:   { dot: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  medium: { dot: 'bg-slate-500',  text: 'text-slate-400',  bg: 'bg-slate-500/10'  },
  cold:   { dot: 'bg-blue-400',   text: 'text-blue-400',   bg: 'bg-blue-500/10'   },
};

type SortKey = 'business_name' | 'location' | 'pipeline_stage' | 'priority' | 'google_rating' | 'last_contact_date' | 'next_follow_up' | 'created_at';
type SortDir = 'asc' | 'desc';

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const [stages, setStages] = useState<CRMStage[]>(DEFAULT_STAGES);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState(searchParams.get('pipeline_stage') || '');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showForm, setShowForm] = useState(searchParams.get('new') === 'true');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStage, setBulkStage] = useState('');

  const [form, setForm] = useState({
    business_name: '', first_name: '', last_name: '', email: '', phone: '',
    location: '', website: '', property_type: 'pub', pipeline_stage: 'new', priority: 'medium',
    admin_notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    crmApi.getStages().then(r => setStages(r.stages.sort((a: CRMStage, b: CRMStage) => a.sort_order - b.sort_order))).catch(() => {});
  }, []);
  useEffect(() => { loadLeads(); }, [stageFilter, priorityFilter]);

  async function loadLeads() {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '500' };
      if (stageFilter) params.pipeline_stage = stageFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;
      const res = await crmApi.getLeads(params);
      setLeads(res.leads);
      setTotal(res.total);
    } catch {} finally { setLoading(false); }
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await crmApi.createLead(form as unknown as Partial<CRMLead>);
      setShowForm(false);
      setForm({ business_name: '', first_name: '', last_name: '', email: '', phone: '', location: '', website: '', property_type: 'pub', pipeline_stage: 'new', priority: 'medium', admin_notes: '' });
      loadLeads();
    } catch {} finally { setSaving(false); }
  }

  async function handleBulkStage() {
    if (!bulkStage || selected.size === 0) return;
    await Promise.all([...selected].map(id => crmApi.updateLead(id, { pipeline_stage: bulkStage } as Partial<CRMLead>)));
    setSelected(new Set());
    setBulkStage('');
    loadLeads();
  }

  async function patchLead(id: number, data: Partial<CRMLead>) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    try { await crmApi.updateLead(id, data); }
    catch { loadLeads(); }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function toggleSelect(id: number) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleSelectAll() {
    setSelected(s => s.size === sorted.length ? new Set() : new Set(sorted.map(l => l.id)));
  }

  const sorted = useMemo(() => {
    const PRIORITY_ORDER: Record<string, number> = { hot: 0, warm: 1, medium: 2, cold: 3 };
    return [...leads].sort((a, b) => {
      let av: string | number | null = null;
      let bv: string | number | null = null;
      if (sortKey === 'business_name') { av = (a.business_name || `${a.first_name} ${a.last_name}`).toLowerCase(); bv = (b.business_name || `${b.first_name} ${b.last_name}`).toLowerCase(); }
      else if (sortKey === 'location') { av = (a.location || '').toLowerCase(); bv = (b.location || '').toLowerCase(); }
      else if (sortKey === 'pipeline_stage') { av = a.pipeline_stage || ''; bv = b.pipeline_stage || ''; }
      else if (sortKey === 'priority') { av = PRIORITY_ORDER[a.priority] ?? 99; bv = PRIORITY_ORDER[b.priority] ?? 99; }
      else if (sortKey === 'google_rating') { av = a.google_rating ?? -1; bv = b.google_rating ?? -1; }
      else if (sortKey === 'last_contact_date') { av = a.last_contact_date ? new Date(a.last_contact_date).getTime() : 0; bv = b.last_contact_date ? new Date(b.last_contact_date).getTime() : 0; }
      else if (sortKey === 'next_follow_up') { av = a.next_follow_up ? new Date(a.next_follow_up).getTime() : Infinity; bv = b.next_follow_up ? new Date(b.next_follow_up).getTime() : Infinity; }
      else { av = new Date(a.created_at).getTime(); bv = new Date(b.created_at).getTime(); }
      if (av === null || av === undefined) av = '';
      if (bv === null || bv === undefined) bv = '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [leads, sortKey, sortDir]);

  const SortTh = ({ label, skey, className = '' }: { label: string; skey: SortKey; className?: string }) => (
    <th
      className={`px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 select-none whitespace-nowrap ${className}`}
      onClick={() => toggleSort(skey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className="text-[10px]">
          {sortKey === skey ? (sortDir === 'asc' ? '↑' : '↓') : <span className="opacity-20">↕</span>}
        </span>
      </span>
    </th>
  );

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total{selected.size > 0 && ` · ${selected.size} selected`}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
          {showForm ? 'Cancel' : '+ Add Lead'}
        </button>
      </div>

      {/* Add Lead Form */}
      {showForm && (
        <form onSubmit={handleCreateLead} className="bg-slate-900 border border-emerald-500/20 rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">New Lead</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <FInput label="Business Name" value={form.business_name} onChange={v => setForm(f => ({ ...f, business_name: v }))} placeholder="The Fox & Hound" />
            <FInput label="First Name" value={form.first_name} onChange={v => setForm(f => ({ ...f, first_name: v }))} />
            <FInput label="Last Name" value={form.last_name} onChange={v => setForm(f => ({ ...f, last_name: v }))} />
            <FInput label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
            <FInput label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} type="tel" />
            <FInput label="Location" value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="Wells, Somerset" />
            <FInput label="Website" value={form.website} onChange={v => setForm(f => ({ ...f, website: v }))} placeholder="https://" />
            <FSelect label="Type" value={form.property_type} onChange={v => setForm(f => ({ ...f, property_type: v }))} options={PROPERTY_TYPES} />
            <FSelect label="Stage" value={form.pipeline_stage} onChange={v => setForm(f => ({ ...f, pipeline_stage: v }))} options={stages.map(s => s.slug)} labels={Object.fromEntries(stages.map(s => [s.slug, s.name]))} />
            <FSelect label="Priority" value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} options={PRIORITIES} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea value={form.admin_notes} onChange={e => setForm(f => ({ ...f, admin_notes: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" rows={2} />
          </div>
          <button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg">
            {saving ? 'Creating...' : 'Create Lead'}
          </button>
        </form>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex flex-1 min-w-[180px] max-w-sm">
          <input
            type="text" placeholder="Search…" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadLeads()}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-l-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <button onClick={loadLeads} className="bg-slate-800 border border-l-0 border-slate-700 rounded-r-lg px-3 text-slate-400 hover:text-slate-200 text-sm">⌕</button>
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none">
          <option value="">All Stages</option>
          {stages.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>

        {/* Bulk action */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
            <span className="text-xs text-slate-400">{selected.size} selected</span>
            <select value={bulkStage} onChange={e => setBulkStage(e.target.value)} className="bg-slate-700 text-xs text-slate-200 rounded px-2 py-1 focus:outline-none">
              <option value="">Move to…</option>
              {stages.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
            <button onClick={handleBulkStage} disabled={!bulkStage} className="text-xs bg-emerald-500 disabled:opacity-40 hover:bg-emerald-600 text-white px-2 py-1 rounded">Apply</button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-300">✕</button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-slate-500 mb-1">No leads found</p>
          <p className="text-slate-600 text-sm">Add your first lead or adjust filters</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5 w-8">
                    <input type="checkbox" checked={selected.size === sorted.length && sorted.length > 0} onChange={toggleSelectAll}
                      className="accent-emerald-500 cursor-pointer" />
                  </th>
                  <SortTh label="Lead" skey="business_name" className="min-w-[200px]" />
                  <SortTh label="Location" skey="location" className="min-w-[130px]" />
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Contact</th>
                  <SortTh label="Stage" skey="pipeline_stage" className="min-w-[110px]" />
                  <SortTh label="Priority" skey="priority" className="min-w-[90px]" />
                  <SortTh label="Rating" skey="google_rating" className="min-w-[80px]" />
                  <SortTh label="Last Contact" skey="last_contact_date" className="min-w-[110px]" />
                  <SortTh label="Follow-up" skey="next_follow_up" className="min-w-[100px]" />
                  <th className="px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="bg-slate-950 divide-y divide-slate-800/60">
                {sorted.map(lead => {
                  const name = lead.business_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unnamed';
                  const overdue = !!(lead.next_follow_up && new Date(lead.next_follow_up) < new Date());
                  const isSelected = selected.has(lead.id);
                  return (
                    <tr key={lead.id} className={`group transition-colors hover:bg-slate-900/60 ${isSelected ? 'bg-emerald-500/5' : ''}`}>
                      <td className="px-3 py-2.5" onClick={e => { e.stopPropagation(); toggleSelect(lead.id); }}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)} className="accent-emerald-500 cursor-pointer" />
                      </td>
                      <td className="px-3 py-2.5 max-w-[210px]">
                        <InlineText value={name} onSave={v => patchLead(lead.id, { business_name: v })} textClass="text-sm font-medium text-slate-200" />
                        {lead.property_type && <p className="text-[11px] text-slate-600 capitalize mt-0.5">{lead.property_type.replace('_', ' ')}</p>}
                      </td>
                      <td className="px-3 py-2.5 max-w-[150px]">
                        <InlineText value={lead.location || ''} placeholder="Add location…" onSave={v => patchLead(lead.id, { location: v })} textClass="text-xs text-slate-400" />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs text-slate-400 space-y-0.5">
                          {lead.email && <p className="truncate max-w-[160px]">{lead.email}</p>}
                          {lead.phone && <p className="text-slate-500">{lead.phone}</p>}
                          {!lead.email && !lead.phone && <span className="text-slate-600">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <InlineStageCell stageSlug={lead.pipeline_stage} stages={stages} onSave={v => patchLead(lead.id, { pipeline_stage: v as CRMLead['pipeline_stage'] })} />
                      </td>
                      <td className="px-3 py-2.5">
                        <InlinePriorityCell priority={lead.priority} onSave={v => patchLead(lead.id, { priority: v })} />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-400 font-mono">{lead.google_rating ? `${lead.google_rating}★` : '—'}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-500">{lead.last_contact_date ? timeAgo(lead.last_contact_date) : <span className="text-slate-700">Never</span>}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <InlineDateCell value={lead.next_follow_up ? lead.next_follow_up.split('T')[0] : ''} overdue={overdue} onSave={v => patchLead(lead.id, { next_follow_up: v || null } as Partial<CRMLead>)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/crm/leads/${lead.id}`} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 text-sm transition-all">→</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-slate-600">{sorted.length} leads shown</p>
            {selected.size > 0 && <p className="text-xs text-emerald-400">{selected.size} selected</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline cell components ──────────────────────────────────────────
function InlineText({ value, placeholder = 'Add…', onSave, textClass = '' }: {
  value: string; placeholder?: string; onSave: (v: string) => void; textClass?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  function save() {
    const t = draft.trim();
    if (t !== value) onSave(t);
    setEditing(false);
  }
  if (editing) {
    return (
      <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        className="w-full bg-slate-800 border border-emerald-500 rounded px-1.5 py-0.5 text-xs text-slate-100 focus:outline-none" />
    );
  }
  return (
    <span onClick={() => setEditing(true)}
      className={`${textClass} cursor-pointer hover:text-emerald-400 transition-colors truncate block group/ic`}
      title="Click to edit">
      {value || <span className="text-slate-700 italic text-xs">{placeholder}</span>}
      <span className="ml-1 opacity-0 group-hover/ic:opacity-50 text-[9px]">✎</span>
    </span>
  );
}

function InlineStageCell({ stageSlug, stages, onSave }: {
  stageSlug: string; stages: CRMStage[]; onSave: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const stg = stages.find(s => s.slug === stageSlug);
  const c = stageColors(stg?.color || 'slate');
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)}
        className={`text-[10px] px-2 py-0.5 rounded-full font-medium border transition-opacity hover:opacity-80 cursor-pointer ${c.badgeBg} ${c.badgeText} ${c.badgeBorder}`}>
        {stg?.name || stageSlug} ▾
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-30 bg-slate-800 border border-slate-700 rounded-xl p-1.5 shadow-xl space-y-0.5 min-w-[140px]">
          {stages.map(s => {
            const sc = stageColors(s.color);
            const active = s.slug === stageSlug;
            return (
              <button key={s.slug} onClick={() => { onSave(s.slug); setOpen(false); }}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
                  active ? `${sc.badgeBg} ${sc.badgeText}` : 'text-slate-400 hover:bg-slate-700'
                }`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                {s.name}
                {active && <span className="ml-auto opacity-60 text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InlinePriorityCell({ priority, onSave }: { priority: string; onSave: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const ps = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ps.dot}`} />
        <span className={`text-xs capitalize ${ps.text}`}>{priority}</span>
        <span className="text-[9px] text-slate-600">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-30 bg-slate-800 border border-slate-700 rounded-xl p-1.5 shadow-xl space-y-0.5 min-w-[110px]">
          {PRIORITIES.map(p => {
            const s = PRIORITY_STYLES[p] || PRIORITY_STYLES.medium;
            const active = p === priority;
            return (
              <button key={p} onClick={() => { onSave(p); setOpen(false); }}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
                  active ? `${s.bg} ${s.text}` : 'text-slate-400 hover:bg-slate-700'
                }`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                <span className="capitalize">{p}</span>
                {active && <span className="ml-auto opacity-60 text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InlineDateCell({ value, overdue, onSave }: { value: string; overdue: boolean; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  if (editing) {
    return (
      <input ref={inputRef} type="date" defaultValue={value}
        onChange={e => { onSave(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        className="bg-slate-800 border border-emerald-500 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:outline-none w-[130px]" />
    );
  }
  return (
    <button onClick={() => setEditing(true)}
      className={`text-xs font-medium hover:opacity-80 transition-opacity text-left ${
        overdue ? 'text-red-400' : value ? 'text-slate-400' : 'text-slate-700 hover:text-slate-500'
      }`}>
      {value
        ? `${new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}${overdue ? ' ⚠' : ''}`
        : 'Set date…'}
    </button>
  );
}

function FInput({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500" />
    </div>
  );
}

function FSelect({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
        {options.map(o => <option key={o} value={o}>{labels?.[o] || o.charAt(0).toUpperCase() + o.slice(1).replace(/_/g, ' ')}</option>)}
      </select>
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
