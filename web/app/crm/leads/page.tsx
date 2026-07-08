'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { crmApi, type CRMLead, type CRMStage, type CRMEmailTemplate } from '@/lib/api';
import { mergeTemplate, buildEmailWithSignature } from '@/lib/crmEmailDraft';
import { getDefaultTemplateId } from '@/lib/defaultTemplate';
import { stageColors } from '@/lib/stageColors';
import { CRMLeadDetailModal } from '@/components/CRMLeadDetailModal';

const DEFAULT_STAGES: CRMStage[] = [
  { id: 1, slug: 'reviewed',    name: 'Reviewed',    color: 'blue',    sort_order: 1, is_won: false, is_lost: false },
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
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  // Email blast state
  const [showEmailBlast, setShowEmailBlast] = useState(false);
  const [blastSubject, setBlastSubject] = useState('');
  const [blastBody, setBlastBody] = useState('');
  const [blastSending, setBlastSending] = useState(false);
  const [blastProgress, setBlastProgress] = useState<{ sent: number; failed: number; skipped: number; total: number } | null>(null);
  const [blastDone, setBlastDone] = useState(false);
  const [blastPreviewIndex, setBlastPreviewIndex] = useState(0);
  const [templates, setTemplates] = useState<CRMEmailTemplate[]>([]);

  const [form, setForm] = useState({
    business_name: '', first_name: '', last_name: '', email: '', phone: '',
    location: '', website: '', property_type: 'pub', pipeline_stage: 'reviewed', priority: 'medium',
    admin_notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    crmApi.getStages().then(r => setStages(r.stages.sort((a: CRMStage, b: CRMStage) => a.sort_order - b.sort_order))).catch(() => {});
  }, []);
  useEffect(() => {
    crmApi.getTemplates().then(r => setTemplates(r.templates.filter((t: CRMEmailTemplate) => t.is_active))).catch(() => {});
  }, []);
  useEffect(() => { loadLeads(); }, [stageFilter, priorityFilter]);

  const reviewedLeadsWithEmail = useMemo(
    () => leads.filter(l => l.pipeline_stage === 'reviewed' && l.email?.trim()),
    [leads]
  );

  async function handleEmailBlast() {
    if (!blastSubject.trim() || !blastBody.trim() || reviewedLeadsWithEmail.length === 0) return;
    setBlastSending(true);
    setBlastDone(false);
    setBlastProgress({ sent: 0, failed: 0, skipped: 0, total: reviewedLeadsWithEmail.length });
    let sent = 0, failed = 0, skipped = 0;
    for (const lead of reviewedLeadsWithEmail) {
      try {
        const personalSubject = mergeTemplate(blastSubject, lead);
        const personalBody = buildEmailWithSignature(mergeTemplate(blastBody, lead));
        await crmApi.sendEmail(lead.id, { subject: personalSubject, body: personalBody, to_email: lead.email });
        sent++;
      } catch {
        failed++;
      }
      setBlastProgress({ sent, failed, skipped, total: reviewedLeadsWithEmail.length });
      // Small delay to avoid hammering the API
      await new Promise(r => setTimeout(r, 150));
    }
    setBlastSending(false);
    setBlastDone(true);
  }

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
      setForm({ business_name: '', first_name: '', last_name: '', email: '', phone: '', location: '', website: '', property_type: 'pub', pipeline_stage: 'reviewed', priority: 'medium', admin_notes: '' });
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
    <>
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total{selected.size > 0 && ` · ${selected.size} selected`}</p>
        </div>
        <div className="flex items-center gap-2">
          {reviewedLeadsWithEmail.length > 0 && (
            <button
              onClick={() => {
                setShowEmailBlast(true);
                setBlastDone(false);
                setBlastProgress(null);
                setBlastPreviewIndex(0);
                const defId = getDefaultTemplateId();
                const def = defId ? templates.find(t => t.id === defId) : null;
                if (def) { setBlastSubject(def.subject); setBlastBody(def.body); }
                else { setBlastSubject(''); setBlastBody(''); }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              Email Reviewed ({reviewedLeadsWithEmail.length})
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
            {showForm ? 'Cancel' : '+ Add Lead'}
          </button>
        </div>
      </div>

      {/* Add Lead Form */}
      {showForm && (        <form onSubmit={handleCreateLead} className="bg-slate-900 border border-emerald-500/20 rounded-xl p-4 space-y-3">
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

      {/* Email Reviewed Leads Modal */}
      {showEmailBlast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Email All Reviewed Leads</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sending from <span className="text-blue-400">pierce.shapton@proper-place.co.uk</span>
                  {' · '}{reviewedLeadsWithEmail.length} lead{reviewedLeadsWithEmail.length !== 1 ? 's' : ''} with email addresses
                </p>
              </div>
              <button onClick={() => { setShowEmailBlast(false); setBlastDone(false); setBlastProgress(null); }} className="text-slate-500 hover:text-slate-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Template selector */}
              {templates.length > 0 && !blastDone && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Load from template{getDefaultTemplateId() ? ' (default pre-loaded)' : ''}</label>
                  <select
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 w-full"
                    value={(() => {
                      const m = templates.find(t => t.subject === blastSubject && t.body === blastBody);
                      return m ? String(m.id) : '';
                    })()}
                    onChange={e => {
                      const tpl = templates.find(t => String(t.id) === e.target.value);
                      if (tpl) { setBlastSubject(tpl.subject); setBlastBody(tpl.body); }
                      else { setBlastSubject(''); setBlastBody(''); }
                    }}
                  >
                    <option value="">- choose a template -</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}{getDefaultTemplateId() === t.id ? ' ★' : ''}</option>)}
                  </select>
                </div>
              )}

              {/* Merge tag hints */}
              {!blastDone && (
                <div className="flex flex-wrap gap-1.5">
                  {['{{first_name}}', '{{business_name}}', '{{location}}', '{{property_type}}', '{{google_rating}}', '{{parking_spaces}}', '{{website}}'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setBlastBody(b => b + tag)}
                      className="text-[10px] font-mono bg-slate-800 border border-slate-700 hover:border-blue-500 hover:text-blue-400 text-slate-400 px-2 py-0.5 rounded transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                  <span className="text-[10px] text-slate-600 self-center ml-1">Click to insert merge tag</span>
                </div>
              )}

              {/* Subject & Body */}
              {!blastDone && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Subject</label>
                    <input
                      type="text"
                      value={blastSubject}
                      onChange={e => setBlastSubject(e.target.value)}
                      placeholder="e.g. Quick idea for {{business_name}}"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Body</label>
                    <textarea
                      value={blastBody}
                      onChange={e => setBlastBody(e.target.value)}
                      rows={10}
                      placeholder="Hi {{first_name}},&#10;&#10;I wanted to reach out about {{business_name}} in {{location}}…"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono resize-y"
                    />
                  </div>

                  {/* Live preview for first lead */}
                  {reviewedLeadsWithEmail.length > 0 && (blastSubject || blastBody) && (
                    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Preview - {reviewedLeadsWithEmail[blastPreviewIndex]?.business_name || reviewedLeadsWithEmail[blastPreviewIndex]?.first_name || 'Lead'}</p>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setBlastPreviewIndex(i => Math.max(0, i - 1))} disabled={blastPreviewIndex === 0} className="text-slate-500 hover:text-slate-300 disabled:opacity-30 text-xs px-1">‹</button>
                          <span className="text-[10px] text-slate-600">{blastPreviewIndex + 1}/{reviewedLeadsWithEmail.length}</span>
                          <button onClick={() => setBlastPreviewIndex(i => Math.min(reviewedLeadsWithEmail.length - 1, i + 1))} disabled={blastPreviewIndex === reviewedLeadsWithEmail.length - 1} className="text-slate-500 hover:text-slate-300 disabled:opacity-30 text-xs px-1">›</button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 font-medium mb-1">
                        To: <span className="text-blue-400">{reviewedLeadsWithEmail[blastPreviewIndex]?.email}</span>
                      </p>
                      {blastSubject && (
                        <p className="text-xs text-slate-300 mb-2">Subject: <span className="text-slate-100">{mergeTemplate(blastSubject, reviewedLeadsWithEmail[blastPreviewIndex])}</span></p>
                      )}
                      {blastBody && (
                        <div className="text-xs text-slate-400 border-t border-slate-700 pt-2 mt-1 [&_a]:text-blue-400 [&_strong]:text-slate-200" dangerouslySetInnerHTML={{ __html: buildEmailWithSignature(mergeTemplate(blastBody, reviewedLeadsWithEmail[blastPreviewIndex])) }} />
                      )}
                      {!blastBody && (
                        <div className="text-xs text-slate-600 border-t border-slate-700 pt-2 mt-1 [&_a]:text-blue-400 [&_strong]:text-slate-400" dangerouslySetInnerHTML={{ __html: buildEmailWithSignature('') }} />
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Leads without email warning */}
              {!blastDone && (() => {
                const noEmail = leads.filter(l => l.pipeline_stage === 'reviewed' && !l.email?.trim());
                return noEmail.length > 0 ? (
                  <p className="text-xs text-amber-500/80">
                    ⚠ {noEmail.length} reviewed lead{noEmail.length !== 1 ? 's' : ''} have no email address and will be skipped.
                  </p>
                ) : null;
              })()}

              {/* Progress */}
              {blastProgress && (
                <div className="space-y-2">
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all bg-blue-500"
                      style={{ width: `${((blastProgress.sent + blastProgress.failed) / blastProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    {blastSending ? 'Sending…' : 'Done!'} {blastProgress.sent} sent · {blastProgress.failed} failed · {blastProgress.total} total
                  </p>
                </div>
              )}

              {/* Done state */}
              {blastDone && blastProgress && (
                <div className="text-center py-6 space-y-2">
                  <p className="text-2xl">✅</p>
                  <p className="text-sm font-semibold text-slate-100">Emails sent!</p>
                  <p className="text-xs text-slate-400">{blastProgress.sent} sent · {blastProgress.failed} failed</p>
                  <button
                    onClick={() => { setShowEmailBlast(false); setBlastDone(false); setBlastProgress(null); setBlastSubject(''); setBlastBody(''); }}
                    className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg"
                  >Close</button>
                </div>
              )}
            </div>

            {/* Footer */}
            {!blastDone && (
              <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-600">Each email is personalised with the lead&apos;s data using merge tags.</p>
                <button
                  onClick={handleEmailBlast}
                  disabled={blastSending || !blastSubject.trim() || !blastBody.trim() || reviewedLeadsWithEmail.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2 rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
                >
                  {blastSending ? (
                    <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
                  ) : (
                    <>Send to {reviewedLeadsWithEmail.length} lead{reviewedLeadsWithEmail.length !== 1 ? 's' : ''}</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-start">
        <div className="flex min-w-0 sm:max-w-sm">
          <input
            type="text" placeholder="Search…" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadLeads()}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-l-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <button onClick={loadLeads} className="bg-slate-800 border border-l-0 border-slate-700 rounded-r-lg px-3 text-slate-400 hover:text-slate-200 text-sm">⌕</button>
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none min-w-0">
          <option value="">All Stages</option>
          {stages.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none min-w-0">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>

        {/* Bulk action */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 sm:col-span-full">
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
        <>
          <div className="space-y-3 md:hidden">
            {sorted.map(lead => {
              const name = lead.business_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unnamed';
              const overdue = !!(lead.next_follow_up && new Date(lead.next_follow_up) < new Date());
              const isSelected = selected.has(lead.id);
              return (
                <div key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className={`rounded-xl border p-3 bg-slate-900 cursor-pointer ${isSelected ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800'}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)} onClick={e => e.stopPropagation()} className="accent-emerald-500 cursor-pointer mt-1" />
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-100 truncate">{name}</p>
                          {lead.property_type && <p className="text-[11px] text-slate-500 capitalize mt-0.5">{lead.property_type.replace('_', ' ')}</p>}
                        </div>
                        <Link href={`/crm/leads/${lead.id}`} className="text-xs text-slate-500 hover:text-slate-300 flex-shrink-0 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded-md transition-colors">
                          Edit
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-xs text-slate-400">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Location</p>
                          <span className="text-xs text-slate-300">{lead.location || <span className="text-slate-600">-</span>}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Stage</p>
                            {(() => { const s = stages.find(x => x.slug === lead.pipeline_stage); const c = s ? stageColors(s.color) : stageColors('blue'); return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.bg} text-white`}>{s?.name || lead.pipeline_stage}</span>; })()}
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Priority</p>
                            {lead.priority ? <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[lead.priority]?.bg || 'bg-slate-500/10'} ${PRIORITY_STYLES[lead.priority]?.text || 'text-slate-400'}`}>{lead.priority}</span> : <span className="text-slate-600">-</span>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Rating</p>
                            <span className="text-xs text-slate-300 font-mono">{lead.google_rating ? `${lead.google_rating}★` : '-'}</span>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Follow-up</p>
                            {lead.next_follow_up ? <span className={`text-xs ${overdue ? 'text-red-400' : 'text-slate-300'}`}>{lead.next_follow_up.split('T')[0]}{overdue && ' ⚠'}</span> : <span className="text-slate-600">-</span>}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Contact</p>
                          <div className="space-y-0.5">
                            {lead.email && <p className="truncate">{lead.email}</p>}
                            {(lead.phone || lead.linked_place?.owner_phone) && <p className="text-slate-500">{lead.phone || lead.linked_place?.owner_phone}</p>}
                            {!lead.email && !lead.phone && !lead.linked_place?.owner_phone && <p className="text-slate-600">-</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block rounded-xl border border-slate-800 overflow-hidden">
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
                    <tr key={lead.id} className={`group transition-colors hover:bg-slate-900/60 cursor-pointer ${isSelected ? 'bg-emerald-500/5' : ''}`} onClick={() => setSelectedLeadId(lead.id)}>
                      <td className="px-3 py-2.5" onClick={e => { e.stopPropagation(); toggleSelect(lead.id); }}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)} className="accent-emerald-500 cursor-pointer" />
                      </td>
                      <td className="px-3 py-2.5 max-w-[210px]">
                        <p className="text-sm font-medium text-slate-200 truncate">{name}</p>
                        {lead.property_type && <p className="text-[11px] text-slate-600 capitalize mt-0.5">{lead.property_type.replace('_', ' ')}</p>}
                      </td>
                      <td className="px-3 py-2.5 max-w-[150px]">
                        <span className="text-xs text-slate-400 truncate block">{lead.location || <span className="text-slate-700">-</span>}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs text-slate-400 space-y-0.5">
                          {lead.email && <p className="truncate max-w-[160px]">{lead.email}</p>}
                          {(lead.phone || lead.linked_place?.owner_phone) && <p className="text-slate-500">{lead.phone || lead.linked_place?.owner_phone}</p>}
                          {!lead.email && !lead.phone && !lead.linked_place?.owner_phone && <span className="text-slate-600">-</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {(() => { const s = stages.find(x => x.slug === lead.pipeline_stage); const c = s ? stageColors(s.color) : stageColors('blue'); return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.bg} text-white`}>{s?.name || lead.pipeline_stage}</span>; })()}
                      </td>
                      <td className="px-3 py-2.5">
                        {lead.priority ? <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[lead.priority]?.bg || 'bg-slate-500/10'} ${PRIORITY_STYLES[lead.priority]?.text || 'text-slate-400'}`}>{lead.priority}</span> : <span className="text-slate-700 text-xs">-</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-400 font-mono">{lead.google_rating ? `${lead.google_rating}★` : '-'}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-500">{lead.last_contact_date ? timeAgo(lead.last_contact_date) : <span className="text-slate-700">Never</span>}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {lead.next_follow_up ? <span className={`text-xs ${overdue ? 'text-red-400' : 'text-slate-400'}`}>{lead.next_follow_up.split('T')[0]}{overdue && ' ⚠'}</span> : <span className="text-slate-700 text-xs">-</span>}
                      </td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <Link href={`/crm/leads/${lead.id}`} className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded-md transition-all whitespace-nowrap" title="Edit lead">
                          Edit
                        </Link>
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
        </>
      )}
    </div>

      {selectedLeadId && (
        <CRMLeadDetailModal
          leadId={selectedLeadId}
          stages={stages}
          onClose={() => setSelectedLeadId(null)}
          onStageChange={(id, stage) => setLeads(ls => ls.map(l => l.id === id ? { ...l, pipeline_stage: stage } : l))}
        />
      )}
    </>
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
