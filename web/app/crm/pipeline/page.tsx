'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  crmApi,
  type CRMActivity,
  type CRMEmailLog,
  type CRMEmailTemplate,
  type CRMLead,
  type CRMSiteVisit,
  type CRMStage,
  type CRMTask,
} from '@/lib/api';
import { generatePersonalizedDraft, mergeTemplate } from '@/lib/crmEmailDraft';
import { stageColors } from '@/lib/stageColors';

const DEFAULT_STAGES: CRMStage[] = [
  { id: 1, slug: 'reviewed', name: 'Reviewed', color: 'blue', sort_order: 1, is_won: false, is_lost: false },
  { id: 2, slug: 'contacted', name: 'Contacted', color: 'amber', sort_order: 2, is_won: false, is_lost: false },
  { id: 3, slug: 'assessing', name: 'Assessing', color: 'violet', sort_order: 3, is_won: false, is_lost: false },
  { id: 4, slug: 'negotiating', name: 'Negotiating', color: 'orange', sort_order: 4, is_won: false, is_lost: false },
  { id: 5, slug: 'converted', name: 'Converted', color: 'emerald', sort_order: 5, is_won: true, is_lost: false },
  { id: 6, slug: 'lost', name: 'Lost', color: 'red', sort_order: 6, is_won: false, is_lost: true },
];

const PRIORITIES = ['hot', 'warm', 'medium', 'cold'];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [draggedLead, setDraggedLead] = useState<number | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  useEffect(() => {
    loadLeads();
    crmApi
      .getStages()
      .then(response => setStages(response.stages.sort((a, b) => a.sort_order - b.sort_order)))
      .catch(() => {});
  }, []);

  async function loadLeads() {
    try {
      const response = await crmApi.getLeads({ limit: '500' });
      setLeads(response.leads);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function moveToStage(leadId: number, newStage: string) {
    try {
      await crmApi.updateLead(leadId, { pipeline_stage: newStage } as Partial<CRMLead>);
      setLeads(prev => prev.map(lead => (lead.id === leadId ? { ...lead, pipeline_stage: newStage } : lead)));
    } catch {
      // ignore
    }
  }

  function handleDragStart(event: React.DragEvent, leadId: number) {
    setDraggedLead(leadId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(event: React.DragEvent, stage: string) {
    event.preventDefault();
    if (draggedLead !== null) {
      moveToStage(draggedLead, stage);
      setDraggedLead(null);
    }
  }

  const getPendingTasksCount = (lead: CRMLead): number => {
    const raw = lead.pending_tasks;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredLeads = leads.filter(lead => {
    const matchesQuery =
      normalizedQuery === '' ||
      [
        lead.business_name,
        `${lead.first_name} ${lead.last_name}`.trim(),
        lead.email,
        lead.phone,
        lead.location,
        lead.source,
        lead.property_type,
      ].some(value => (value || '').toLowerCase().includes(normalizedQuery));

    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    const needsAttention = isLeadOverdue(lead) || getPendingTasksCount(lead) > 0;

    return matchesQuery && matchesPriority && (!attentionOnly || needsAttention);
  });

  const leadsByStage = (stage: string) => filteredLeads.filter(lead => lead.pipeline_stage === stage);
  const hotLeads = filteredLeads.filter(lead => lead.priority === 'hot').length;
  const overdueFollowUps = filteredLeads.filter(isLeadOverdue).length;
  const openTasks = filteredLeads.reduce((total, lead) => total + getPendingTasksCount(lead), 0);

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
          <p className="text-sm text-slate-500 mt-1">{filteredLeads.length} of {leads.length} leads shown</p>
        </div>
        <Link href="/crm/leads?new=true" className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Add Lead
        </Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard label="Visible Leads" value={filteredLeads.length.toString()} tone="slate" />
        <SummaryCard label="Hot Prospects" value={hotLeads.toString()} tone="red" />
        <SummaryCard label="Overdue Follow-ups" value={overdueFollowUps.toString()} tone="amber" />
        <SummaryCard label="Open Tasks" value={openTasks.toString()} tone="blue" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_auto_auto]">
          <div>
            <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1.5">Search</label>
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search name, business, email, phone, location..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
            <select
              value={priorityFilter}
              onChange={event => setPriorityFilter(event.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All priorities</option>
              {PRIORITIES.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-300 h-[42px] px-3 rounded-lg border border-slate-700 bg-slate-800/60">
              <input
                type="checkbox"
                checked={attentionOnly}
                onChange={event => setAttentionOnly(event.target.checked)}
                className="accent-emerald-500"
              />
              Needs attention
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span className="px-2 py-1 rounded-full bg-slate-800 border border-slate-700">Searches across name, business, email, phone, source, and location</span>
          {attentionOnly && <span className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">Showing only overdue follow-ups or leads with open tasks</span>}
        </div>
      </div>

      <div className="hidden lg:grid gap-3 min-h-[calc(100vh-12rem)]" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map(stage => (
          <div
            key={stage.slug}
            className="bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col"
            onDragOver={handleDragOver}
            onDrop={event => handleDrop(event, stage.slug)}
          >
            <div className={`px-3 py-2.5 border-b border-slate-800 border-t-2 ${stageColors(stage.color).border} rounded-t-xl`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{stage.name}</span>
                <span className="text-xs font-mono text-slate-500">{leadsByStage(stage.slug).length}</span>
              </div>
            </div>

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

      <div className="lg:hidden">
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

        <div className="space-y-2 mt-3">
          {leadsByStage(activeTab).map(lead => (
            <div key={lead.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div onClick={() => setSelectedLeadId(lead.id)} className="block cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{lead.business_name || `${lead.first_name} ${lead.last_name}`.trim()}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{lead.location || '—'}</p>
                    {lead.next_follow_up && (
                      <p className={`text-[11px] mt-1 ${isLeadOverdue(lead) ? 'text-red-400' : 'text-slate-500'}`}>
                        Follow-up: {formatDateShort(lead.next_follow_up)}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[lead.priority] || PRIORITY_COLORS.medium}`}>
                    {lead.priority}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 mt-2 overflow-x-auto">
                {stages.filter(stage => stage.slug !== lead.pipeline_stage).map(stage => (
                  <button
                    key={stage.slug}
                    onClick={() => moveToStage(lead.id, stage.slug)}
                    className="flex-shrink-0 text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                  >
                    → {stage.name}
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

      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          stages={stages}
          onClose={() => setSelectedLeadId(null)}
          onStageChange={(id, stage) => {
            setLeads(prev => prev.map(lead => (lead.id === id ? { ...lead, pipeline_stage: stage } : lead)));
          }}
          onLeadUpdate={updatedLead => {
            setLeads(prev => prev.map(lead => (lead.id === updatedLead.id ? { ...lead, ...updatedLead } : lead)));
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'red' | 'amber' | 'blue' }) {
  const tones = {
    slate: 'text-slate-300 border-slate-800 bg-slate-900',
    red: 'text-red-400 border-red-500/20 bg-red-500/10',
    amber: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
    blue: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function LeadCard({ lead, onDragStart, onClick }: { lead: CRMLead; onDragStart: (event: React.DragEvent, id: number) => void; onClick: () => void }) {
  const overdue = isLeadOverdue(lead);

  return (
    <div onClick={onClick}>
      <div
        draggable
        onDragStart={event => onDragStart(event, lead.id)}
        className="bg-slate-800 hover:bg-slate-750 border border-slate-700/50 hover:border-slate-600 rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all group"
      >
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-medium text-slate-200 truncate flex-1">
            {lead.business_name || `${lead.first_name} ${lead.last_name}`.trim() || 'Unnamed'}
          </p>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${
            lead.priority === 'hot' ? 'bg-red-500' : lead.priority === 'warm' ? 'bg-orange-400' : lead.priority === 'cold' ? 'bg-blue-400' : 'bg-slate-500'
          }`}></span>
        </div>
        {lead.location && <p className="text-[11px] text-slate-500 mt-1 truncate">📍 {lead.location}</p>}
        {lead.google_rating && <p className="text-[11px] text-slate-500 mt-0.5">⭐ {lead.google_rating}</p>}
        {lead.source && <p className="text-[11px] text-slate-600 mt-0.5 truncate">Source: {lead.source}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          {(lead.pending_tasks || 0) > 0 && <span className="text-[10px] text-amber-400">☐ {lead.pending_tasks}</span>}
          {overdue && <span className="text-[10px] text-red-400">⚠ overdue</span>}
        </div>
        {lead.next_follow_up && (
          <p className={`text-[10px] mt-1 ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
            Follow-up: {formatDateShort(lead.next_follow_up)}
          </p>
        )}
      </div>
    </div>
  );
}

const PRIORITY_BADGE: Record<string, string> = {
  hot: 'bg-red-500 text-white',
  warm: 'bg-orange-500 text-white',
  medium: 'bg-slate-500 text-white',
  cold: 'bg-blue-500 text-white',
};

function LeadDetailModal({
  leadId,
  stages,
  onClose,
  onStageChange,
  onLeadUpdate,
}: {
  leadId: number;
  stages: CRMStage[];
  onClose: () => void;
  onStageChange: (id: number, stage: string) => void;
  onLeadUpdate: (lead: CRMLead) => void;
}) {
  const [lead, setLead] = useState<CRMLead | null>(null);
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [visits, setVisits] = useState<CRMSiteVisit[]>([]);
  const [emails, setEmails] = useState<CRMEmailLog[]>([]);
  const [templates, setTemplates] = useState<CRMEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('activity');
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CRMLead>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [showSendEmail, setShowSendEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', template_id: '' });

  const [showLogReply, setShowLogReply] = useState(false);
  const [replyForm, setReplyForm] = useState({ subject: '', body: '', from_name: '', received_at: new Date().toISOString().slice(0, 16) });

  const [showAddNote, setShowAddNote] = useState(false);
  const [noteForm, setNoteForm] = useState({ activity_type: 'note', title: '', description: '' });

  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '', priority: 'medium' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, actRes, taskRes, visitRes, emailRes, templateRes] = await Promise.all([
        crmApi.getLead(leadId),
        crmApi.getActivities(leadId),
        crmApi.getTasks({ lead_id: String(leadId) }),
        crmApi.getSiteVisits(leadId),
        crmApi.getEmailLog(leadId),
        crmApi.getTemplates(),
      ]);
      setLead(leadRes.lead);
      setEditForm({
        business_name: leadRes.lead.business_name || '',
        first_name: leadRes.lead.first_name || '',
        last_name: leadRes.lead.last_name || '',
        email: leadRes.lead.email || '',
        phone: leadRes.lead.phone || '',
        location: leadRes.lead.location || '',
        website: leadRes.lead.website || '',
        source: leadRes.lead.source || '',
        property_type: leadRes.lead.property_type || '',
        parking_type: leadRes.lead.parking_type || '',
        parking_spaces: leadRes.lead.parking_spaces,
        estimated_value: leadRes.lead.estimated_value,
        next_follow_up: leadRes.lead.next_follow_up ? formatDateInput(leadRes.lead.next_follow_up) : '',
        admin_notes: leadRes.lead.admin_notes || '',
      });
      setActivities(actRes.activities);
      setTasks(taskRes.tasks);
      setVisits(visitRes.visits);
      setEmails(emailRes.emails || []);
      setTemplates(templateRes.templates || []);
    } catch {
      onClose();
    } finally {
      setLoading(false);
    }
  }, [leadId, onClose]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleStageChange(stage: string) {
    if (!lead) return;
    await crmApi.updateLead(leadId, { pipeline_stage: stage } as Partial<CRMLead>);
    const updatedLead = { ...lead, pipeline_stage: stage };
    setLead(updatedLead);
    onStageChange(leadId, stage);
    onLeadUpdate(updatedLead);
  }

  async function handlePriorityChange(priority: string) {
    if (!lead) return;
    await crmApi.updateLead(leadId, { priority } as Partial<CRMLead>);
    const updatedLead = { ...lead, priority };
    setLead(updatedLead);
    onLeadUpdate(updatedLead);
  }

  async function handleSaveEdit() {
    if (!lead) return;

    setSavingEdit(true);
    try {
      const payload: Partial<CRMLead> = {
        business_name: normalizeOptionalString(editForm.business_name),
        first_name: stringValue(editForm.first_name),
        last_name: stringValue(editForm.last_name),
        email: stringValue(editForm.email),
        phone: stringValue(editForm.phone),
        location: normalizeOptionalString(editForm.location),
        website: normalizeOptionalString(editForm.website),
        source: normalizeOptionalString(editForm.source),
        property_type: normalizeOptionalString(editForm.property_type),
        parking_type: normalizeOptionalString(editForm.parking_type),
        parking_spaces: normalizeOptionalNumber(editForm.parking_spaces),
        estimated_value: normalizeOptionalNumber(editForm.estimated_value),
        next_follow_up: normalizeOptionalString(editForm.next_follow_up),
        admin_notes: normalizeOptionalString(editForm.admin_notes),
      };

      const response = await crmApi.updateLead(leadId, payload);
      setLead(response.lead);
      onLeadUpdate(response.lead);
      setShowQuickEdit(false);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleAddNote(event: React.FormEvent) {
    event.preventDefault();
    await crmApi.createActivity(leadId, noteForm);
    setShowAddNote(false);
    setNoteForm({ activity_type: 'note', title: '', description: '' });
    loadData();
  }

  async function handleAddTask(event: React.FormEvent) {
    event.preventDefault();
    await crmApi.createTask({ lead_id: leadId, ...taskForm });
    setShowAddTask(false);
    setTaskForm({ title: '', due_date: '', priority: 'medium' });
    loadData();
  }

  async function handleCompleteTask(taskId: number) {
    await crmApi.updateTask(taskId, { status: 'completed' });
    loadData();
  }

  async function handleSendEmail(event: React.FormEvent) {
    event.preventDefault();
    await crmApi.sendEmail(leadId, {
      subject: emailForm.subject,
      body: emailForm.body,
      template_id: emailForm.template_id ? Number(emailForm.template_id) : undefined,
    });
    setShowSendEmail(false);
    setEmailForm({ subject: '', body: '', template_id: '' });
    loadData();
  }

  async function handleLogReply(event: React.FormEvent) {
    event.preventDefault();
    await crmApi.logInboundEmail(leadId, {
      subject: replyForm.subject || undefined,
      body: replyForm.body,
      from_name: replyForm.from_name || undefined,
      received_at: replyForm.received_at ? new Date(replyForm.received_at).toISOString() : undefined,
    });
    setShowLogReply(false);
    setReplyForm({ subject: '', body: '', from_name: '', received_at: new Date().toISOString().slice(0, 16) });
    loadData();
  }

  function handleTemplateSelect(templateId: string) {
    if (!lead) return;

    const template = templates.find(item => String(item.id) === templateId);
    if (!template) {
      setEmailForm({ template_id: '', subject: '', body: '' });
      return;
    }

    // On template select, show exact merged template values so the user can verify every field before send.
    setEmailForm({
      template_id: templateId,
      subject: mergeTemplate(template.subject || '', lead),
      body: mergeTemplate(template.body || '', lead),
    });
  }

  function handlePrewriteDraft() {
    if (!lead) return;
    const template = templates.find(item => String(item.id) === emailForm.template_id);
    const draft = generatePersonalizedDraft(lead, template);
    setEmailForm(current => ({ ...current, subject: draft.subject, body: draft.body }));
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
        onClick={event => event.stopPropagation()}
      >
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

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setShowQuickEdit(current => !current)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${showQuickEdit ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              {showQuickEdit ? 'Hide quick edit' : 'Quick edit'}
            </button>
            <div className="flex flex-wrap gap-1">
              {stages.map(stage => {
                const active = lead.pipeline_stage === stage.slug;
                const colors = stageColors(stage.color);
                return (
                  <button
                    key={stage.slug}
                    onClick={() => handleStageChange(stage.slug)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${
                      active ? `${colors.bg} text-white` : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                    }`}
                  >
                    {stage.name}
                  </button>
                );
              })}
            </div>
            <div className="border-l border-slate-700 pl-2 flex gap-1">
              {PRIORITIES.map(priority => (
                <button
                  key={priority}
                  onClick={() => handlePriorityChange(priority)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${
                    lead.priority === priority ? PRIORITY_BADGE[priority] : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {showQuickEdit && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <QuickEditInput label="Business Name" value={stringValue(editForm.business_name)} onChange={value => setEditForm(form => ({ ...form, business_name: value }))} />
                <QuickEditInput label="Lead Source" value={stringValue(editForm.source)} onChange={value => setEditForm(form => ({ ...form, source: value }))} />
                <QuickEditInput label="Contact First Name" value={stringValue(editForm.first_name)} onChange={value => setEditForm(form => ({ ...form, first_name: value }))} />
                <QuickEditInput label="Contact Last Name" value={stringValue(editForm.last_name)} onChange={value => setEditForm(form => ({ ...form, last_name: value }))} />
                <QuickEditInput label="Email" value={stringValue(editForm.email)} onChange={value => setEditForm(form => ({ ...form, email: value }))} type="email" />
                <QuickEditInput label="Phone" value={stringValue(editForm.phone)} onChange={value => setEditForm(form => ({ ...form, phone: value }))} />
                <QuickEditInput label="Location" value={stringValue(editForm.location)} onChange={value => setEditForm(form => ({ ...form, location: value }))} />
                <QuickEditInput label="Website" value={stringValue(editForm.website)} onChange={value => setEditForm(form => ({ ...form, website: value }))} type="url" />
                <QuickEditInput label="Property Type" value={stringValue(editForm.property_type)} onChange={value => setEditForm(form => ({ ...form, property_type: value }))} />
                <QuickEditInput label="Parking Type" value={stringValue(editForm.parking_type)} onChange={value => setEditForm(form => ({ ...form, parking_type: value }))} />
                <QuickEditInput label="Parking Spaces" value={numberValue(editForm.parking_spaces)} onChange={value => setEditForm(form => ({ ...form, parking_spaces: value === '' ? null : Number(value) }))} type="number" />
                <QuickEditInput label="Est. Value" value={numberValue(editForm.estimated_value)} onChange={value => setEditForm(form => ({ ...form, estimated_value: value === '' ? null : Number(value) }))} type="number" />
                <QuickEditInput label="Next Follow-up" value={stringValue(editForm.next_follow_up)} onChange={value => setEditForm(form => ({ ...form, next_follow_up: value }))} type="date" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1.5">Admin notes</label>
                <textarea
                  value={stringValue(editForm.admin_notes)}
                  onChange={event => setEditForm(form => ({ ...form, admin_notes: event.target.value }))}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} disabled={savingEdit} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg">
                  {savingEdit ? 'Saving…' : 'Save lead changes'}
                </button>
                <button onClick={() => setShowQuickEdit(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg">Close</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-1 border-b border-slate-800 px-5">
          {[
            { key: 'activity', label: 'Activity', count: activities.length },
            { key: 'emails', label: 'Emails', count: emails.length },
            { key: 'tasks', label: 'Tasks', count: tasks.filter(task => task.status === 'pending').length },
            { key: 'visits', label: 'Visits', count: visits.length },
            { key: 'info', label: 'Details' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === item.key ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <span className="ml-1 bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full">{item.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {tab === 'activity' && (
            <div className="space-y-3">
              <button onClick={() => setShowAddNote(current => !current)} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add note</button>
              {showAddNote && (
                <form onSubmit={handleAddNote} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                  <select
                    value={noteForm.activity_type}
                    onChange={event => setNoteForm(form => ({ ...form, activity_type: event.target.value }))}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {['note', 'call', 'email', 'meeting', 'site_visit'].map(option => (
                      <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}</option>
                    ))}
                  </select>
                  <input
                    value={noteForm.title}
                    onChange={event => setNoteForm(form => ({ ...form, title: event.target.value }))}
                    placeholder="Title..."
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <textarea
                    value={noteForm.description}
                    onChange={event => setNoteForm(form => ({ ...form, description: event.target.value }))}
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
                  {activities.map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 py-2.5 border-b border-slate-800/50">
                      <ActivityIcon type={activity.activity_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300">{activity.title}</p>
                        {activity.description && <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>}
                        <p className="text-[11px] text-slate-600 mt-1">{activity.created_by_name || 'System'} · {timeAgo(activity.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-3">
              <button onClick={() => setShowAddTask(current => !current)} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add task</button>
              {showAddTask && (
                <form onSubmit={handleAddTask} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                  <input
                    value={taskForm.title}
                    onChange={event => setTaskForm(form => ({ ...form, title: event.target.value }))}
                    placeholder="Task title..."
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={taskForm.due_date}
                      onChange={event => setTaskForm(form => ({ ...form, due_date: event.target.value }))}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                    <select
                      value={taskForm.priority}
                      onChange={event => setTaskForm(form => ({ ...form, priority: event.target.value }))}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      {['hot', 'medium', 'cold'].map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg">Add Task</button>
                </form>
              )}
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-6">No tasks</p>
              ) : (
                <div className="space-y-1">
                  {tasks.map(task => (
                    <div key={task.id} className={`flex items-center gap-3 py-2.5 border-b border-slate-800/50 ${task.status === 'completed' ? 'opacity-50' : ''}`}>
                      <button
                        onClick={() => task.status !== 'completed' && handleCompleteTask(task.id)}
                        className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
                          task.status === 'completed' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-600 hover:border-emerald-500'
                        }`}
                      >
                        {task.status === 'completed' ? '✓' : ''}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{task.title}</p>
                        {task.due_date && (
                          <p className={`text-[11px] mt-0.5 ${new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-red-400' : 'text-slate-500'}`}>
                            Due: {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {new Date(task.due_date) < new Date() && task.status !== 'completed' && ' ⚠ overdue'}
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
            <div className="space-y-0">
              {/* Action bar */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">{emails.length} message{emails.length !== 1 ? 's' : ''}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setShowLogReply(true); setShowSendEmail(false); }}
                    className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 px-2.5 py-1 rounded-lg transition-colors">
                    + Log their reply
                  </button>
                  <button onClick={() => { setShowSendEmail(true); setShowLogReply(false); setEmailForm({ subject: '', body: '', template_id: '' }); }}
                    className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/50 px-2.5 py-1 rounded-lg transition-colors">
                    ✉ Compose
                  </button>
                </div>
              </div>

              {/* Thread */}
              {emails.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-8">No emails yet</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {emails.map((e, idx) => (
                    <PipelineEmailThreadItem
                      key={e.id}
                      email={e}
                      isInbound={e.direction === 'inbound'}
                      isLast={idx === emails.length - 1}
                      leadName={displayName}
                      leadEmail={lead.email}
                    />
                  ))}
                </div>
              )}

              {/* Log inbound reply form */}
              {showLogReply && (
                <form onSubmit={handleLogReply} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-300">Log received reply</h3>
                    <button type="button" onClick={() => setShowLogReply(false)} className="text-slate-600 hover:text-slate-400 text-lg leading-none">×</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">From (name)</label>
                      <input value={replyForm.from_name} onChange={ev => setReplyForm(f => ({ ...f, from_name: ev.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500"
                        placeholder={displayName} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Received at</label>
                      <input type="datetime-local" value={replyForm.received_at}
                        onChange={ev => setReplyForm(f => ({ ...f, received_at: ev.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Subject (optional)</label>
                    <input value={replyForm.subject} onChange={ev => setReplyForm(f => ({ ...f, subject: ev.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500"
                      placeholder="Re: Quick intro from Proper Place" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Their message</label>
                    <textarea value={replyForm.body} onChange={ev => setReplyForm(f => ({ ...f, body: ev.target.value }))} required
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500 resize-y"
                      rows={4} placeholder="Paste their reply here..." />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Log Reply</button>
                    <button type="button" onClick={() => setShowLogReply(false)} className="text-slate-500 text-sm px-3 py-2 hover:text-slate-300">Cancel</button>
                  </div>
                </form>
              )}

              {/* Compose form */}
              {showSendEmail && (
                <form onSubmit={handleSendEmail} className="bg-slate-900 border border-blue-500/20 rounded-xl overflow-hidden mt-2">
                  <div className="bg-[#1e3a5f] px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-200">New Message</span>
                    <button type="button" onClick={() => setShowSendEmail(false)} className="text-blue-300 hover:text-white text-lg leading-none">×</button>
                  </div>
                  <div className="bg-slate-900 divide-y divide-slate-800">
                    <div className="flex items-center px-4 py-2">
                      <span className="text-xs text-slate-500 w-16 flex-shrink-0">To</span>
                      <span className="text-sm text-slate-300">{lead.email || '(no email)'}</span>
                    </div>
                    <div className="flex items-center px-4 py-2">
                      <span className="text-xs text-slate-500 w-16 flex-shrink-0">Template</span>
                      <select value={emailForm.template_id} onChange={ev => handleTemplateSelect(ev.target.value)}
                        className="flex-1 bg-transparent text-sm text-slate-300 focus:outline-none">
                        <option value="">— none —</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      {emailForm.template_id && (
                        <button type="button" onClick={handlePrewriteDraft} className="text-[11px] text-emerald-400 hover:text-emerald-300 ml-2 flex-shrink-0">Auto-fill</button>
                      )}
                    </div>
                    <div className="flex items-center px-4 py-2">
                      <span className="text-xs text-slate-500 w-16 flex-shrink-0">Subject</span>
                      <input value={emailForm.subject} onChange={ev => setEmailForm(f => ({ ...f, subject: ev.target.value }))} required
                        className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none placeholder:text-slate-600"
                        placeholder="Quick intro from Proper Place" />
                    </div>
                  </div>
                  <textarea value={emailForm.body} onChange={ev => setEmailForm(f => ({ ...f, body: ev.target.value }))} required
                    className="w-full bg-slate-950 text-sm text-slate-200 px-4 py-3 focus:outline-none resize-y font-mono placeholder:text-slate-700"
                    rows={7}
                    placeholder={`Hi ${lead.first_name || 'there'},\n\n`} />
                  <div className="px-4 py-2.5 border-t border-slate-800 flex items-center gap-3">
                    <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">Send</button>
                    <div className="flex flex-wrap gap-1 ml-2">
                      {['{{first_name}}', '{{business_name}}', '{{location}}'].map(token => (
                        <button key={token} type="button"
                          onClick={() => setEmailForm(f => ({ ...f, body: f.body + token }))}
                          className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-500 hover:text-emerald-400 rounded font-mono transition-colors">
                          {token}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              )}


            </div>
          )}

          {tab === 'visits' && (
            <div className="space-y-3">
              {visits.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-6">No site visits recorded</p>
              ) : (
                visits.map(visit => (
                  <div key={visit.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">
                        {new Date(visit.visit_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      {visit.verdict && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          visit.verdict === 'convert' ? 'bg-emerald-500/10 text-emerald-400' : visit.verdict === 'promising' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                        }`}>{visit.verdict.replace(/_/g, ' ')}</span>
                      )}
                    </div>
                    {visit.contact_name && <p className="text-xs text-slate-400">Spoke to: {visit.contact_name} ({visit.contact_role || '—'})</p>}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <InfoField label="Surface" value={visit.car_park_surface} />
                      <InfoField label="Spaces" value={visit.car_park_spaces?.toString()} />
                      <InfoField label="Access" value={visit.motorhome_access} />
                      <InfoField label="Reaction" value={visit.owner_reaction?.replace('_', ' ')} />
                    </div>
                    {visit.notes && <p className="text-xs text-slate-400 italic">{visit.notes}</p>}
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

function QuickEditInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
      />
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
    email: '✉',
    call: '📞',
    site_visit: '📍',
    stage_change: '→',
    note: '📝',
    task_created: '☐',
    lead_created: '+',
    meeting: '🤝',
  };

  return (
    <div className={`w-7 h-7 rounded-lg ${colors[type] || 'bg-slate-500/20 text-slate-400'} flex items-center justify-center text-xs flex-shrink-0`}>
      {icons[type] || '•'}
    </div>
  );
}

function PipelineEmailThreadItem({
  email, isInbound, isLast, leadName, leadEmail,
}: {
  email: CRMEmailLog;
  isInbound: boolean;
  isLast: boolean;
  leadName: string;
  leadEmail: string | null | undefined;
}) {
  const [expanded, setExpanded] = useState(isLast);
  const isHtml = email.body?.includes('<');

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isInbound ? 'border-slate-700 bg-slate-900' : 'border-blue-900/40 bg-[#0d1f35]'
    }`}>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          isInbound ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {isInbound ? (email.from_name?.[0] || leadName[0] || '?').toUpperCase() : 'P'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-slate-200 truncate">
              {isInbound ? (email.from_name || leadName || leadEmail || 'Lead') : 'You'}
            </span>
            {!expanded && email.subject && (
              <span className="text-xs text-slate-500 truncate hidden sm:block">{email.subject}</span>
            )}
          </div>
          {expanded && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isInbound ? 'To: you' : `To: ${email.to_email || leadEmail || leadName}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isInbound && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Reply</span>
          )}
          <span className="text-[11px] text-slate-500">{timeAgo(email.sent_at)}</span>
          <span className="text-slate-600 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && email.subject && (
        <div className="px-4 pb-1 border-t border-slate-800/50">
          <p className="text-xs font-semibold text-slate-300 pt-2">{email.subject}</p>
        </div>
      )}

      {expanded && (
        <div className="px-4 py-3 border-t border-slate-800/50">
          {isHtml ? (
            <div
              className="text-sm text-slate-300 leading-relaxed [&_a]:text-blue-400 [&_a]:underline [&_p]:mb-2"
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
          ) : (
            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{email.body}</pre>
          )}
        </div>
      )}
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

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatDateInput(dateStr: string) {
  return new Date(dateStr).toISOString().split('T')[0];
}

function isLeadOverdue(lead: CRMLead) {
  return !!lead.next_follow_up && new Date(lead.next_follow_up) <= new Date();
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown) {
  return typeof value === 'number' ? String(value) : '';
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeOptionalNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}