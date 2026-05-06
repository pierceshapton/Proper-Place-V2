'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { crmApi, type CRMLead, type CRMStage, type CRMActivity, type CRMTask, type CRMSiteVisit, type CRMEmailLog } from '@/lib/api';
import { stageColors } from '@/lib/stageColors';

const DEFAULT_STAGES: CRMStage[] = [
  { id: 1, slug: 'new',         name: 'New',         color: 'blue',    sort_order: 1, is_won: false, is_lost: false },
  { id: 2, slug: 'contacted',   name: 'Contacted',   color: 'amber',   sort_order: 2, is_won: false, is_lost: false },
  { id: 3, slug: 'assessing',   name: 'Assessing',   color: 'violet',  sort_order: 3, is_won: false, is_lost: false },
  { id: 4, slug: 'negotiating', name: 'Negotiating', color: 'orange',  sort_order: 4, is_won: false, is_lost: false },
  { id: 5, slug: 'converted',   name: 'Converted',   color: 'emerald', sort_order: 5, is_won: true,  is_lost: false },
  { id: 6, slug: 'lost',        name: 'Lost',        color: 'red',     sort_order: 6, is_won: false, is_lost: true  },
];

const PRIORITY_COLORS: Record<string, string> = {
  hot: 'text-red-400 bg-red-500/10',
  warm: 'text-orange-400 bg-orange-500/10',
  medium: 'text-slate-400 bg-slate-500/10',
  cold: 'text-blue-400 bg-blue-500/10',
};

export default function PipelinePage() {
  const [stages, setStages] = useState<CRMStage[]>(DEFAULT_STAGES);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('new');
  const [draggedLead, setDraggedLead] = useState<number | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  useEffect(() => {
    loadLeads();
    crmApi.getStages().then(r => setStages(r.stages.sort((a: CRMStage, b: CRMStage) => a.sort_order - b.sort_order))).catch(() => {});
  }, []);

  async function loadLeads() {
    try {
      const res = await crmApi.getLeads({ limit: '500' });
      setLeads(res.leads);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function moveToStage(leadId: number, newStage: string) {
    try {
      await crmApi.updateLead(leadId, { pipeline_stage: newStage } as Partial<CRMLead>);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pipeline_stage: newStage } : l));
    } catch {
      // ignore
    }
  }

  function handleDragStart(e: React.DragEvent, leadId: number) {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent, stage: string) {
    e.preventDefault();
    if (draggedLead !== null) {
      moveToStage(draggedLead, stage);
      setDraggedLead(null);
    }
  }

  const leadsByStage = (stage: string) => leads.filter(l => l.pipeline_stage === stage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">{leads.length} total leads</p>
        </div>
        <Link href="/crm/leads?new=true" className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Add Lead
        </Link>
      </div>

      {/* Desktop: Kanban columns */}
      <div className={`hidden lg:grid gap-3 min-h-[calc(100vh-12rem)]`} style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map(stage => (
          <div
            key={stage.slug}
            className="bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col"
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, stage.slug)}
          >
            {/* Column header */}
            <div className={`px-3 py-2.5 border-b border-slate-800 border-t-2 ${stageColors(stage.color).border} rounded-t-xl`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{stage.name}</span>
                <span className="text-xs font-mono text-slate-500">{leadsByStage(stage.slug).length}</span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-16rem)]">
              {leadsByStage(stage.slug).map(lead => (
                <LeadCard key={lead.id} lead={lead} onDragStart={handleDragStart} onClick={() => setSelectedLeadId(lead.id)} />
              ))}
              {leadsByStage(stage.slug).length === 0 && (
                <div className="text-center py-8 text-slate-700 text-xs">No leads</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: Tabs + list */}
      <div className="lg:hidden">
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
          {stages.map(stage => (
            <button
              key={stage.slug}
              onClick={() => setActiveTab(stage.slug)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === stage.slug
                  ? `${stageColors(stage.color).bg} text-white`
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {stage.name} ({leadsByStage(stage.slug).length})
            </button>
          ))}
        </div>

        {/* Mobile move controls */}
        <div className="space-y-2 mt-3">
          {leadsByStage(activeTab).map(lead => (
            <div key={lead.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div onClick={() => setSelectedLeadId(lead.id)} className="block cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{lead.business_name || `${lead.first_name} ${lead.last_name}`.trim()}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{lead.location || '—'}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[lead.priority] || PRIORITY_COLORS.medium}`}>
                    {lead.priority}
                  </span>
                </div>
              </div>
              {/* Stage move buttons */}
              <div className="flex gap-1 mt-2 overflow-x-auto">
                {stages.filter(s => s.slug !== lead.pipeline_stage).map(s => (
                  <button
                    key={s.slug}
                    onClick={() => moveToStage(lead.id, s.slug)}
                    className="flex-shrink-0 text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                  >
                    → {s.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {leadsByStage(activeTab).length === 0 && (
            <p className="text-center py-8 text-slate-600 text-sm">No leads in this stage</p>
          )}
        </div>
      </div>

      {/* Lead Detail Modal */}
      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          stages={stages}
          onClose={() => setSelectedLeadId(null)}
          onStageChange={(id, stage) => {
            setLeads(prev => prev.map(l => l.id === id ? { ...l, pipeline_stage: stage } : l));
          }}
        />
      )}
    </div>
  );
}

function LeadCard({ lead, onDragStart, onClick }: { lead: CRMLead; onDragStart: (e: React.DragEvent, id: number) => void; onClick: () => void }) {
  return (
    <div onClick={onClick}>
      <div
        draggable
        onDragStart={e => onDragStart(e, lead.id)}
        className="bg-slate-800 hover:bg-slate-750 border border-slate-700/50 hover:border-slate-600 rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all group"
      >
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-medium text-slate-200 truncate flex-1">
            {lead.business_name || `${lead.first_name} ${lead.last_name}`.trim() || 'Unnamed'}
          </p>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${
            lead.priority === 'hot' ? 'bg-red-500' :
            lead.priority === 'warm' ? 'bg-orange-400' :
            lead.priority === 'cold' ? 'bg-blue-400' : 'bg-slate-500'
          }`}></span>
        </div>
        {lead.location && (
          <p className="text-[11px] text-slate-500 mt-1 truncate">📍 {lead.location}</p>
        )}
        {lead.google_rating && (
          <p className="text-[11px] text-slate-500 mt-0.5">⭐ {lead.google_rating}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {(lead.pending_tasks || 0) > 0 && (
            <span className="text-[10px] text-amber-400">☐ {lead.pending_tasks}</span>
          )}
          {lead.next_follow_up && new Date(lead.next_follow_up) <= new Date() && (
            <span className="text-[10px] text-red-400">⚠ overdue</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Lead Detail Modal ─────────────────────────────────────── */

const PRIORITIES = ['hot', 'warm', 'medium', 'cold'];
const PRIORITY_BADGE: Record<string, string> = {
  hot: 'bg-red-500 text-white',
  warm: 'bg-orange-500 text-white',
  medium: 'bg-slate-500 text-white',
  cold: 'bg-blue-500 text-white',
};

function LeadDetailModal({ leadId, stages, onClose, onStageChange }: {
  leadId: number;
  stages: CRMStage[];
  onClose: () => void;
  onStageChange: (id: number, stage: string) => void;
}) {
  const [lead, setLead] = useState<CRMLead | null>(null);
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [visits, setVisits] = useState<CRMSiteVisit[]>([]);
  const [emails, setEmails] = useState<CRMEmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('activity');

  // Send email form
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', to: '' });

  // Add note form
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteForm, setNoteForm] = useState({ activity_type: 'note', title: '', description: '' });

  // Add task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '', priority: 'medium' });

  useEffect(() => {
    loadData();
  }, [leadId]);

  async function loadData() {
    setLoading(true);
    try {
      const [leadRes, actRes, taskRes, visitRes, emailRes] = await Promise.all([
        crmApi.getLead(leadId),
        crmApi.getActivities(leadId),
        crmApi.getTasks({ lead_id: String(leadId) }),
        crmApi.getSiteVisits(leadId),
        crmApi.getEmailLog(leadId),
      ]);
      setLead(leadRes.lead);
      setActivities(actRes.activities);
      setTasks(taskRes.tasks);
      setVisits(visitRes.visits);
      setEmails(emailRes.emails || []);
    } catch {
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleStageChange(stage: string) {
    if (!lead) return;
    await crmApi.updateLead(leadId, { pipeline_stage: stage } as Partial<CRMLead>);
    setLead({ ...lead, pipeline_stage: stage });
    onStageChange(leadId, stage);
  }

  async function handlePriorityChange(priority: string) {
    if (!lead) return;
    await crmApi.updateLead(leadId, { priority } as Partial<CRMLead>);
    setLead({ ...lead, priority });
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    await crmApi.createActivity(leadId, noteForm);
    setShowAddNote(false);
    setNoteForm({ activity_type: 'note', title: '', description: '' });
    loadData();
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    await crmApi.createTask({ lead_id: leadId, ...taskForm });
    setShowAddTask(false);
    setTaskForm({ title: '', due_date: '', priority: 'medium' });
    loadData();
  }

  async function handleCompleteTask(taskId: number) {
    await crmApi.updateTask(taskId, { status: 'completed' });
    loadData();
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    const to = emailForm.to || lead?.email || '';
    if (!to) return;
    // If a new email was entered and lead has none, save it to the lead
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
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-100 truncate">{displayName}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {lead.location && <span className="text-xs text-slate-400">📍 {lead.location}</span>}
                {lead.google_rating && <span className="text-xs text-slate-400">⭐ {lead.google_rating} ({lead.google_reviews_count} reviews)</span>}
                {lead.phone && <span className="text-xs text-slate-400">📞 {lead.phone}</span>}
                {lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline truncate max-w-[200px] block">🌐 {lead.website}</a>}
                {lead.email && <span className="text-xs text-slate-400">✉ {lead.email}</span>}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none flex-shrink-0 mt-1">✕</button>
          </div>

          {/* Stage + Priority */}
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex flex-wrap gap-1">
              {stages.map(stage => {
                const active = lead.pipeline_stage === stage.slug;
                const c = stageColors(stage.color);
                return (
                  <button
                    key={stage.slug}
                    onClick={() => handleStageChange(stage.slug)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${
                      active ? `${c.bg} text-white` : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                    }`}
                  >
                    {stage.name}
                  </button>
                );
              })}
            </div>
            <div className="border-l border-slate-700 pl-2 flex gap-1">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${
                    lead.priority === p
                      ? `${PRIORITY_BADGE[p]} `
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
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
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {/* Activity tab */}
          {tab === 'activity' && (
            <div className="space-y-3">
              <button onClick={() => setShowAddNote(!showAddNote)} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add note</button>
              {showAddNote && (
                <form onSubmit={handleAddNote} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                  <select
                    value={noteForm.activity_type}
                    onChange={e => setNoteForm(f => ({ ...f, activity_type: e.target.value }))}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {['note', 'call', 'email', 'meeting', 'site_visit'].map(o => (
                      <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1).replace('_', ' ')}</option>
                    ))}
                  </select>
                  <input
                    value={noteForm.title}
                    onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Title..."
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <textarea
                    value={noteForm.description}
                    onChange={e => setNoteForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Details..."
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    rows={2}
                  />
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg">Add</button>
                </form>
              )}
              {activities.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-6">No activity yet</p>
              ) : (
                <div className="space-y-1">
                  {activities.map(a => (
                    <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-slate-800/50">
                      <ActivityIcon type={a.activity_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300">{a.title}</p>
                        {a.description && <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>}
                        <p className="text-[11px] text-slate-600 mt-1">{a.created_by_name || 'System'} · {timeAgo(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tasks tab */}
          {tab === 'tasks' && (
            <div className="space-y-3">
              <button onClick={() => setShowAddTask(!showAddTask)} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add task</button>
              {showAddTask && (
                <form onSubmit={handleAddTask} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                  <input
                    value={taskForm.title}
                    onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Task title..."
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-2">
                    <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" />
                    <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
                      {['hot', 'medium', 'cold'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg">Add Task</button>
                </form>
              )}
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-6">No tasks</p>
              ) : (
                <div className="space-y-1">
                  {tasks.map(t => (
                    <div key={t.id} className={`flex items-center gap-3 py-2.5 border-b border-slate-800/50 ${t.status === 'completed' ? 'opacity-50' : ''}`}>
                      <button
                        onClick={() => t.status !== 'completed' && handleCompleteTask(t.id)}
                        className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
                          t.status === 'completed' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-600 hover:border-emerald-500'
                        }`}
                      >
                        {t.status === 'completed' ? '✓' : ''}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${t.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{t.title}</p>
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

          {/* Emails tab */}
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

          {/* Visits tab */}
          {tab === 'visits' && (
            <div className="space-y-3">
              {visits.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-6">No site visits recorded</p>
              ) : (
                visits.map(v => (
                  <div key={v.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">
                        {new Date(v.visit_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      {v.verdict && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          v.verdict === 'convert' ? 'bg-emerald-500/10 text-emerald-400' :
                          v.verdict === 'promising' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>{v.verdict.replace(/_/g, ' ')}</span>
                      )}
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

          {/* Details tab */}
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
              {lead.tags && lead.tags.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Tags</p>
                  <div className="flex gap-1 flex-wrap">
                    {lead.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* Link to full detail page */}
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
    email: 'bg-blue-500/20 text-blue-400',
    call: 'bg-green-500/20 text-green-400',
    site_visit: 'bg-violet-500/20 text-violet-400',
    stage_change: 'bg-amber-500/20 text-amber-400',
    note: 'bg-slate-500/20 text-slate-400',
    task_created: 'bg-cyan-500/20 text-cyan-400',
    lead_created: 'bg-emerald-500/20 text-emerald-400',
    meeting: 'bg-purple-500/20 text-purple-400',
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
