'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { crmApi, type CRMLead, type CRMActivity, type CRMTask, type CRMEmailLog, type CRMSiteVisit, type CRMStage, type CRMCustomField, type CRMEmailTemplate } from '@/lib/api';
import { generatePersonalizedDraft, mergeTemplate, buildEmailWithSignature } from '@/lib/crmEmailDraft';
import { getDefaultTemplateId } from '@/lib/defaultTemplate';
import { stageColors } from '@/lib/stageColors';

const DEFAULT_STAGES: CRMStage[] = [
  { id: 1, slug: 'reviewed',    name: 'Reviewed',    color: 'blue',    sort_order: 1, is_won: false, is_lost: false },
  { id: 2, slug: 'contacted',   name: 'Contacted',   color: 'amber',   sort_order: 2, is_won: false, is_lost: false },
  { id: 3, slug: 'assessing',   name: 'Assessing',   color: 'violet',  sort_order: 3, is_won: false, is_lost: false },
  { id: 4, slug: 'negotiating', name: 'Negotiating', color: 'orange',  sort_order: 4, is_won: false, is_lost: false },
  { id: 5, slug: 'converted',   name: 'Converted',   color: 'emerald', sort_order: 5, is_won: true,  is_lost: false },
  { id: 6, slug: 'lost',        name: 'Lost',        color: 'red',     sort_order: 6, is_won: false, is_lost: true  },
];
const PRIORITIES = ['hot', 'warm', 'medium', 'cold'];

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = Number(params.id);

  const [lead, setLead] = useState<CRMLead | null>(null);
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [emails, setEmails] = useState<CRMEmailLog[]>([]);
  const [visits, setVisits] = useState<CRMSiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CRMLead>>({});
  const [stages, setStages] = useState<CRMStage[]>(DEFAULT_STAGES);
  const [customFields, setCustomFields] = useState<CRMCustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<number, string>>({});
  const [customValuesDirty, setCustomValuesDirty] = useState<Record<number, string>>({});
  const [customValuesSaving, setCustomValuesSaving] = useState(false);
  const [templates, setTemplates] = useState<CRMEmailTemplate[]>([]);

  // Add activity form
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [actForm, setActForm] = useState({ activity_type: 'note', title: '', description: '' });

  // Add task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', due_date: '', priority: 'medium' });

  // Send email form
  const [showSendEmail, setShowSendEmail] = useState(true);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', template_id: '', to_email: '' });

  // Log inbound reply form
  const [showLogReply, setShowLogReply] = useState(false);
  const [replyForm, setReplyForm] = useState({ subject: '', body: '', from_name: '', received_at: new Date().toISOString().slice(0, 16) });

  // Site visit form
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitForm, setVisitForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    contact_name: '', contact_role: '', car_park_surface: 'tarmac',
    car_park_spaces: '', motorhome_access: 'easy', level_ground: true,
    electric_hookup: '', water_access: false, ownership_type: 'freehold',
    owner_reaction: 'very_interested', objections: '', follow_up_agreed: true,
    follow_up_date: '', verdict: 'promising', verdict_reason: '', notes: '',
  });

  // Linked place / contract
  const [contractUploading, setContractUploading] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeSearchResults, setPlaceSearchResults] = useState<Array<{ id: number; name: string; address: string; city: string; approval_status: string; place_type: string | null; price_per_night: number | null; owner_name: string; owner_email: string; owner_phone: string | null }>>([]);
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [syncingPhone, setSyncingPhone] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, actRes, taskRes, emailRes, visitRes, templateRes] = await Promise.all([
        crmApi.getLead(leadId),
        crmApi.getActivities(leadId),
        crmApi.getTasks({ lead_id: String(leadId) }),
        crmApi.getEmailLog(leadId),
        crmApi.getSiteVisits(leadId),
        crmApi.getTemplates(),
      ]);
      setLead(leadRes.lead);
      setActivities(actRes.activities);
      setTasks(taskRes.tasks);
      setEmails(emailRes.emails);
      setVisits(visitRes.visits);
      setTemplates(templateRes.templates || []);
      // Auto-fill compose with default template if user hasn't started writing
      const defId = getDefaultTemplateId();
      const def = defId ? (templateRes.templates || []).find((t: CRMEmailTemplate) => t.id === defId) : null;
      setEmailForm(f => {
        if (f.subject || f.body) return { ...f, to_email: leadRes.lead.email || '' };
        if (def) {
          return {
            ...f,
            template_id: String(def.id),
            subject: mergeTemplate(def.subject || '', leadRes.lead),
            body: mergeTemplate(def.body || '', leadRes.lead),
            to_email: leadRes.lead.email || '',
          };
        }
        return { ...f, to_email: leadRes.lead.email || '' };
      });
      // Load custom values
      try {
        const cv = await crmApi.getCustomValues(leadId);
        const map: Record<number, string> = {};
        cv.values.forEach((v: { field_id: number; value: string }) => { map[v.field_id] = v.value; });
        setCustomValues(map);
        setCustomValuesDirty(map);
      } catch {}
    } catch {
      router.push('/crm/leads');
    } finally {
      setLoading(false);
    }
  }, [leadId, router]);

  useEffect(() => {
    loadAll();
    crmApi.getStages().then(r => setStages(r.stages.sort((a: CRMStage, b: CRMStage) => a.sort_order - b.sort_order))).catch(() => {});
    crmApi.getCustomFields().then(r => setCustomFields(r.fields.sort((a: CRMCustomField, b: CRMCustomField) => a.sort_order - b.sort_order))).catch(() => {});
  }, [leadId, loadAll]);

  async function handleStageChange(stage: string) {
    if (!lead) return;
    await crmApi.updateLead(leadId, { pipeline_stage: stage } as Partial<CRMLead>);
    setLead({ ...lead, pipeline_stage: stage });
    loadAll();
  }

  async function handlePriorityChange(priority: string) {
    if (!lead) return;
    await crmApi.updateLead(leadId, { priority } as Partial<CRMLead>);
    setLead({ ...lead, priority });
  }

  async function handleSaveEdit() {
    await crmApi.updateLead(leadId, editForm);
    setEditing(false);
    loadAll();
  }

  async function handleContractUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lead) return;
    setContractUploading(true);
    try {
      const res = await crmApi.uploadContract(leadId, file);
      setLead({ ...lead, contract_url: res.contract_url });
    } catch { /* error handled silently */ } finally {
      setContractUploading(false);
      e.target.value = '';
    }
  }

  async function handlePlaceSearch(q: string) {
    setPlaceSearchQuery(q);
    if (q.length < 2) { setPlaceSearchResults([]); return; }
    setPlaceSearchLoading(true);
    try {
      const res = await crmApi.searchPlaces(q);
      setPlaceSearchResults(res.places);
    } catch { setPlaceSearchResults([]); } finally {
      setPlaceSearchLoading(false);
    }
  }

  async function handleLinkPlace(placeId: number) {
    if (!lead) return;
    await crmApi.updateLead(leadId, { place_id: placeId } as Partial<CRMLead>);
    setPlaceSearchOpen(false);
    setPlaceSearchQuery('');
    setPlaceSearchResults([]);
    loadAll();
  }

  async function handleUnlinkPlace() {
    if (!lead) return;
    await crmApi.updateLead(leadId, { place_id: null } as Partial<CRMLead>);
    loadAll();
  }

  async function handleSyncPhone() {
    if (!lead?.linked_place?.owner_phone) return;
    setSyncingPhone(true);
    try {
      await crmApi.updateLead(leadId, { phone: lead.linked_place.owner_phone } as Partial<CRMLead>);
      loadAll();
    } finally { setSyncingPhone(false); }
  }

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    await crmApi.createActivity(leadId, actForm);
    setShowAddActivity(false);
    setActForm({ activity_type: 'note', title: '', description: '' });
    loadAll();
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    await crmApi.createTask({ lead_id: leadId, ...taskForm });
    setShowAddTask(false);
    setTaskForm({ title: '', description: '', due_date: '', priority: 'medium' });
    loadAll();
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    await crmApi.sendEmail(leadId, {
      subject: emailForm.subject,
      body: buildEmailWithSignature(emailForm.body),
      template_id: emailForm.template_id ? Number(emailForm.template_id) : undefined,
      to_email: emailForm.to_email || undefined,
    });
    setShowSendEmail(false);
    setEmailForm({ subject: '', body: '', template_id: '', to_email: lead?.email || '' });
    loadAll();
  }

  async function handleLogReply(e: React.FormEvent) {
    e.preventDefault();
    await crmApi.logInboundEmail(leadId, {
      subject: replyForm.subject || undefined,
      body: replyForm.body,
      from_name: replyForm.from_name || undefined,
      received_at: replyForm.received_at ? new Date(replyForm.received_at).toISOString() : undefined,
    });
    setShowLogReply(false);
    setReplyForm({ subject: '', body: '', from_name: '', received_at: new Date().toISOString().slice(0, 16) });
    loadAll();
  }

  function handleTemplateSelect(templateId: string) {
    if (!lead) return;
    const template = templates.find(item => String(item.id) === templateId);
    if (!template) {
      setEmailForm(f => ({ ...f, template_id: '', subject: '', body: '' }));
      return;
    }

    // On template select, keep content deterministic and pre-filled from this lead's details.
    setEmailForm(f => ({
      ...f,
      template_id: templateId,
      subject: mergeTemplate(template.subject || '', lead),
      body: mergeTemplate(template.body || '', lead),
    }));
  }

  function handlePrewriteDraft() {
    if (!lead) return;
    const template = templates.find(item => String(item.id) === emailForm.template_id);
    const draft = generatePersonalizedDraft(lead, template);
    setEmailForm(current => ({ ...current, subject: draft.subject, body: draft.body }));
  }

  async function handleCompleteTask(taskId: number) {
    await crmApi.updateTask(taskId, { status: 'completed' });
    loadAll();
  }

  async function handleSiteVisit(e: React.FormEvent) {
    e.preventDefault();
    await crmApi.createSiteVisit(leadId, {
      ...visitForm,
      car_park_spaces: visitForm.car_park_spaces ? parseInt(visitForm.car_park_spaces) : null,
    } as unknown as Partial<CRMSiteVisit>);
    setShowVisitForm(false);
    loadAll();
  }

  async function handleSaveCustomValues() {
    setCustomValuesSaving(true);
    try {
      const values = Object.entries(customValuesDirty).map(([fieldId, value]) => ({ field_id: Number(fieldId), value }));
      await crmApi.setCustomValues(leadId, values);
      setCustomValues({ ...customValuesDirty });
    } catch {} finally { setCustomValuesSaving(false); }
  }

  if (loading || !lead) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  const displayName = lead.business_name || `${lead.first_name} ${lead.last_name}`.trim() || 'Unnamed Lead';

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/crm/leads" className="hover:text-slate-300">Leads</Link>
        <span>›</span>
        <span className="text-slate-300">{displayName}</span>
      </div>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-100">{displayName}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {lead.location && <span className="text-sm text-slate-400">📍 {lead.location}</span>}
              {lead.google_rating && <span className="text-sm text-slate-400">⭐ {lead.google_rating} ({lead.google_reviews_count} reviews)</span>}
              {lead.email && <span className="text-sm text-slate-400">✉ {lead.email}</span>}
              {lead.phone && <span className="text-sm text-slate-400">📞 {lead.phone}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => { setActiveTab('emails'); setShowSendEmail(true); }} className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              ✉ Email
            </button>
            <button onClick={() => setShowVisitForm(true)} className="bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              📍 Log Visit
            </button>
            <button onClick={() => { setEditing(true); setEditForm(lead); }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              ✎ Edit
            </button>
          </div>
        </div>

        {/* Stage + Priority controls */}
        <div className="flex flex-wrap gap-2 mt-4">
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
                    ? `${p === 'hot' ? 'bg-red-500' : p === 'warm' ? 'bg-orange-500' : p === 'cold' ? 'bg-blue-500' : 'bg-slate-500'} text-white`
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {editing && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-emerald-400">Edit Lead</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <CRMInput label="Business Name" value={editForm.business_name || ''} onChange={v => setEditForm(f => ({ ...f, business_name: v }))} />
            <CRMInput label="First Name" value={editForm.first_name || ''} onChange={v => setEditForm(f => ({ ...f, first_name: v }))} />
            <CRMInput label="Last Name" value={editForm.last_name || ''} onChange={v => setEditForm(f => ({ ...f, last_name: v }))} />
            <CRMInput label="Email" value={editForm.email || ''} onChange={v => setEditForm(f => ({ ...f, email: v }))} />
            <CRMInput label="Phone" value={editForm.phone || ''} onChange={v => setEditForm(f => ({ ...f, phone: v }))} />
            <CRMInput label="Location" value={editForm.location || ''} onChange={v => setEditForm(f => ({ ...f, location: v }))} />
            <CRMInput label="Website" value={editForm.website || ''} onChange={v => setEditForm(f => ({ ...f, website: v }))} />
            <CRMInput label="Next Follow-up" value={editForm.next_follow_up ? editForm.next_follow_up.split('T')[0] : ''} onChange={v => setEditForm(f => ({ ...f, next_follow_up: v }))} type="date" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea
              value={editForm.admin_notes || ''}
              onChange={e => setEditForm(f => ({ ...f, admin_notes: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Save</button>
            <button onClick={() => setEditing(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Site Visit Form */}
      {showVisitForm && (
        <form onSubmit={handleSiteVisit} className="bg-slate-900 border border-violet-500/30 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-violet-400">Log Site Visit</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <CRMInput label="Visit Date" value={visitForm.visit_date} onChange={v => setVisitForm(f => ({ ...f, visit_date: v }))} type="date" />
            <CRMInput label="Contact Name" value={visitForm.contact_name} onChange={v => setVisitForm(f => ({ ...f, contact_name: v }))} placeholder="Sarah Jenkins" />
            <CRMInput label="Contact Role" value={visitForm.contact_role} onChange={v => setVisitForm(f => ({ ...f, contact_role: v }))} placeholder="Owner / Manager" />
            <CRMSelect label="Car Park Surface" value={visitForm.car_park_surface} onChange={v => setVisitForm(f => ({ ...f, car_park_surface: v }))} options={['tarmac', 'gravel', 'grass', 'concrete', 'mixed']} />
            <CRMInput label="Car Park Spaces" value={visitForm.car_park_spaces} onChange={v => setVisitForm(f => ({ ...f, car_park_spaces: v }))} type="number" placeholder="~30" />
            <CRMSelect label="Motorhome Access" value={visitForm.motorhome_access} onChange={v => setVisitForm(f => ({ ...f, motorhome_access: v }))} options={['easy', 'moderate', 'tight', 'impossible']} />
            <CRMSelect label="Ownership" value={visitForm.ownership_type} onChange={v => setVisitForm(f => ({ ...f, ownership_type: v }))} options={['freehold', 'leasehold', 'managed', 'tenant', 'unknown']} />
            <CRMSelect label="Owner Reaction" value={visitForm.owner_reaction} onChange={v => setVisitForm(f => ({ ...f, owner_reaction: v }))} options={['very_interested', 'interested', 'neutral', 'skeptical', 'not_interested']} />
            <CRMSelect label="Verdict" value={visitForm.verdict} onChange={v => setVisitForm(f => ({ ...f, verdict: v }))} options={['convert', 'promising', 'not_suitable', 'owner_not_interested']} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={visitForm.level_ground} onChange={e => setVisitForm(f => ({ ...f, level_ground: e.target.checked }))} className="accent-emerald-500" /> Level ground
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={visitForm.water_access} onChange={e => setVisitForm(f => ({ ...f, water_access: e.target.checked }))} className="accent-emerald-500" /> Water access
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={visitForm.follow_up_agreed} onChange={e => setVisitForm(f => ({ ...f, follow_up_agreed: e.target.checked }))} className="accent-emerald-500" /> Follow-up agreed
            </label>
          </div>
          <CRMInput label="Electric Hookup" value={visitForm.electric_hookup} onChange={v => setVisitForm(f => ({ ...f, electric_hookup: v }))} placeholder="Yes - outbuilding nearby" />
          <div>
            <label className="block text-xs text-slate-400 mb-1">Objections</label>
            <textarea value={visitForm.objections} onChange={e => setVisitForm(f => ({ ...f, objections: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500" rows={2} placeholder="Insurance concerns, noise worries..." />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea value={visitForm.notes} onChange={e => setVisitForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500" rows={3} placeholder="Great spot. Sarah was enthusiastic..." />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Save Visit</button>
            <button type="button" onClick={() => setShowVisitForm(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-800 pb-px">
        {[
          { key: 'activity', label: 'Activity', count: activities.length },
          { key: 'tasks', label: 'Tasks', count: tasks.filter(t => t.status === 'pending').length },
          { key: 'emails', label: 'Emails', count: emails.length },
          { key: 'visits', label: 'Visits', count: visits.length },
          { key: 'info', label: 'Details' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            <button onClick={() => setShowAddActivity(!showAddActivity)} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add note / activity</button>
            {showAddActivity && (
              <form onSubmit={handleAddActivity} className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  <CRMSelect label="Type" value={actForm.activity_type} onChange={v => setActForm(f => ({ ...f, activity_type: v }))} options={['note', 'call', 'email', 'meeting', 'site_visit']} />
                  <div className="flex-1">
                    <CRMInput label="Title" value={actForm.title} onChange={v => setActForm(f => ({ ...f, title: v }))} placeholder="Called to discuss..." />
                  </div>
                </div>
                <textarea
                  value={actForm.description}
                  onChange={e => setActForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Details..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  rows={2}
                />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg">Add</button>
              </form>
            )}
            {activities.length === 0 && emails.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-8">No activity recorded yet</p>
            ) : (
              <div className="space-y-1">
                {(() => {
                  type FeedItem = { kind: 'activity'; data: CRMActivity; date: string } | { kind: 'email'; data: CRMEmailLog; date: string };
                  const feed: FeedItem[] = [
                    ...activities.map(a => ({ kind: 'activity' as const, data: a, date: a.created_at })),
                    ...emails.map(e => ({ kind: 'email' as const, data: e, date: e.sent_at })),
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  return feed.map(item => {
                    if (item.kind === 'activity') {
                      const a = item.data;
                      return (
                        <div key={`a-${a.id}`} className="flex items-start gap-3 py-2.5 border-b border-slate-800/50">
                          <ActivityIcon type={a.activity_type} />
                          <div className="flex-1">
                            <p className="text-sm text-slate-300">{a.title}</p>
                            {a.description && <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>}
                            <p className="text-[11px] text-slate-600 mt-1">{a.created_by_name || 'System'} · {timeAgo(a.created_at)}</p>
                          </div>
                        </div>
                      );
                    }
                    const e = item.data;
                    const inbound = e.direction === 'inbound';
                    const isHtml = e.body?.includes('<');
                    return (
                      <div key={`e-${e.id}`} className="flex items-start gap-3 py-2.5 border-b border-slate-800/50">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${inbound ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>
                          {inbound ? '↓' : '↑'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${inbound ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              {inbound ? 'Reply received' : 'Email sent'}
                            </span>
                            <p className="text-sm text-slate-300 truncate">{e.subject || '(no subject)'}</p>
                          </div>
                          {e.body && (
                            isHtml ? (
                              <div className="text-xs text-slate-500 mt-1 line-clamp-3 [&_a]:text-blue-400 [&_p]:m-0 [&_strong]:text-slate-400" dangerouslySetInnerHTML={{ __html: e.body }} />
                            ) : (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-3 whitespace-pre-wrap">{e.body}</p>
                            )
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-1">
                            <span>{inbound ? (e.from_name || 'them') : 'you'} → {inbound ? 'you' : (e.to_email || 'them')}</span>
                            <span>·</span>
                            <span>{timeAgo(e.sent_at)}</span>
                            <button onClick={() => setActiveTab('emails')} className="ml-auto text-blue-400 hover:text-blue-300">View thread →</button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <button onClick={() => setShowAddTask(!showAddTask)} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add task</button>
            {showAddTask && (
              <form onSubmit={handleAddTask} className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
                <CRMInput label="Task" value={taskForm.title} onChange={v => setTaskForm(f => ({ ...f, title: v }))} placeholder="Call back Thursday..." />
                <div className="flex gap-2">
                  <CRMInput label="Due Date" value={taskForm.due_date} onChange={v => setTaskForm(f => ({ ...f, due_date: v }))} type="date" />
                  <CRMSelect label="Priority" value={taskForm.priority} onChange={v => setTaskForm(f => ({ ...f, priority: v }))} options={['hot', 'medium', 'cold']} />
                </div>
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg">Add Task</button>
              </form>
            )}
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-8">No tasks</p>
            ) : (
              <div className="space-y-1">
                {tasks.map(t => (
                  <div key={t.id} className={`flex items-start gap-3 py-2.5 border-b border-slate-800/50 ${t.status === 'completed' ? 'opacity-50' : ''}`}>
                    <button
                      onClick={() => t.status !== 'completed' && handleCompleteTask(t.id)}
                      className={`w-5 h-5 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] transition-colors ${
                        t.status === 'completed' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-600 hover:border-emerald-500'
                      }`}
                    >
                      {t.status === 'completed' ? '✓' : ''}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.source_email_id && (
                          <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">✉ email</span>
                        )}
                        <p className={`text-sm ${t.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{t.title}</p>
                      </div>
                      {t.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{t.description}</p>
                      )}
                      {t.due_date && (
                        <p className={`text-[11px] mt-0.5 ${new Date(t.due_date) < new Date() && t.status !== 'completed' ? 'text-red-400' : 'text-slate-500'}`}>
                          Due: {new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {new Date(t.due_date) < new Date() && t.status !== 'completed' && ' ⚠ overdue'}
                        </p>
                      )}
                      {t.source_email_id && t.status !== 'completed' && (
                        <button
                          onClick={() => { setActiveTab('emails'); setShowSendEmail(true); setShowLogReply(false); }}
                          className="mt-1 text-[11px] text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 px-2 py-0.5 rounded transition-colors"
                        >
                          ✉ Reply now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Emails Tab */}
        {activeTab === 'emails' && (
          <div className="space-y-0">
            {/* Action bar */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500">{emails.length} message{emails.length !== 1 ? 's' : ''}</span>
              <div className="flex gap-2">
                <button onClick={() => { setShowLogReply(true); setShowSendEmail(false); }}
                  className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 px-2.5 py-1 rounded-lg transition-colors">
                  + Log their reply
                </button>
                <button onClick={() => { setShowSendEmail(true); setShowLogReply(false);
                  const defId = getDefaultTemplateId();
                  const def = defId ? templates.find(t => t.id === defId) : null;
                  if (def && lead) {
                    setEmailForm({ subject: mergeTemplate(def.subject || '', lead), body: mergeTemplate(def.body || '', lead), template_id: String(def.id), to_email: lead.email || '' });
                  } else {
                    setEmailForm({ subject: '', body: '', template_id: '', to_email: lead?.email || '' });
                  }
                }}
                  className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/50 px-2.5 py-1 rounded-lg transition-colors">
                  ✉ Compose
                </button>
              </div>
            </div>

            {/* Thread */}
            {emails.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-8">No emails yet — compose your first message below</p>
            ) : (
              <div className="space-y-2 mb-4">
                {emails.map((e, idx) => {
                  const isInbound = e.direction === 'inbound';
                  const isLast = idx === emails.length - 1;
                  return (
                    <EmailThreadItem
                      key={e.id}
                      email={e}
                      isInbound={isInbound}
                      isLast={isLast}
                      leadName={displayName}
                      leadEmail={lead.email}
                    />
                  );
                })}
              </div>
            )}

            {/* Log inbound reply form */}
            {showLogReply && (
              <form onSubmit={handleLogReply} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-300">Log received reply</h3>
                  <button type="button" onClick={() => setShowLogReply(false)} className="text-slate-600 hover:text-slate-400 text-lg leading-none">×</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CRMInput label="From (name)" value={replyForm.from_name} onChange={v => setReplyForm(f => ({ ...f, from_name: v }))} placeholder={displayName} />
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Received at</label>
                    <input type="datetime-local" value={replyForm.received_at}
                      onChange={e => setReplyForm(f => ({ ...f, received_at: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500" />
                  </div>
                </div>
                <CRMInput label="Subject (optional)" value={replyForm.subject} onChange={v => setReplyForm(f => ({ ...f, subject: v }))} placeholder="Re: Quick intro from Proper Place" />
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Their message</label>
                  <textarea value={replyForm.body} onChange={e => setReplyForm(f => ({ ...f, body: e.target.value }))} required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500 resize-y"
                    rows={5} placeholder="Paste their reply here..." />
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
                {/* Outlook-style compose header */}
                <div className="bg-[#1e3a5f] px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-200">New Message</span>
                  <button type="button" onClick={() => setShowSendEmail(false)} className="text-blue-300 hover:text-white text-lg leading-none">×</button>
                </div>
                <div className="bg-slate-900 divide-y divide-slate-800">
                  <div className="flex items-center px-4 py-2">
                    <span className="text-xs text-slate-500 w-16 flex-shrink-0">To</span>
                    <input
                      type="email"
                      value={emailForm.to_email}
                      onChange={e => setEmailForm(f => ({ ...f, to_email: e.target.value }))}
                      className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none placeholder:text-slate-600"
                      placeholder="recipient@example.com"
                    />
                  </div>
                  <div className="flex items-center px-4 py-2">
                    <span className="text-xs text-slate-500 w-16 flex-shrink-0">Template</span>
                    <select value={emailForm.template_id} onChange={e => handleTemplateSelect(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-slate-300 focus:outline-none">
                      <option value="">— none —</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}{getDefaultTemplateId() === t.id ? ' ★' : ''}</option>)}
                    </select>
                    {emailForm.template_id && (
                      <button type="button" onClick={handlePrewriteDraft} className="text-[11px] text-emerald-400 hover:text-emerald-300 ml-2 flex-shrink-0">Auto-fill</button>
                    )}
                  </div>
                  <div className="flex items-center px-4 py-2">
                    <span className="text-xs text-slate-500 w-16 flex-shrink-0">Subject</span>
                    <input value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} required
                      className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none placeholder:text-slate-600"
                      placeholder="Quick intro from Proper Place" />
                  </div>
                </div>
                <textarea value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} required
                  className="w-full bg-slate-950 text-sm text-slate-200 px-4 py-3 focus:outline-none resize-y font-mono placeholder:text-slate-700"
                  rows={8}
                  placeholder={`Hi ${lead.first_name || 'there'},\n\n`} />
                {/* Signature preview */}
                <div className="px-4 py-3 bg-slate-900/60 border-t border-slate-800 text-xs [&_a]:text-blue-400 [&_strong]:text-slate-300 pointer-events-none select-none" dangerouslySetInnerHTML={{ __html: buildEmailWithSignature('').replace(/^<div[^>]*>|<\/div>$/g, '').replace(/<p[^>]*><\/p>/g, '') }} />
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

        {/* Visits Tab */}
        {activeTab === 'visits' && (
          <div className="space-y-3">
            <button onClick={() => setShowVisitForm(true)} className="text-xs text-violet-400 hover:text-violet-300">+ Log visit</button>
            {visits.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-8">No site visits recorded</p>
            ) : (
              <div className="space-y-3">
                {visits.map(v => (
                  <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">
                        Visit on {new Date(v.visit_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <VerdictBadge verdict={v.verdict} />
                    </div>
                    {v.contact_name && <p className="text-xs text-slate-400">Spoke to: {v.contact_name} ({v.contact_role || '—'})</p>}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      <Field label="Surface" value={v.car_park_surface} />
                      <Field label="Spaces" value={v.car_park_spaces?.toString()} />
                      <Field label="Access" value={v.motorhome_access} />
                      <Field label="Ownership" value={v.ownership_type} />
                      <Field label="Reaction" value={v.owner_reaction?.replace('_', ' ')} />
                      <Field label="Level" value={v.level_ground ? 'Yes' : 'No'} />
                      <Field label="Water" value={v.water_access ? 'Yes' : 'No'} />
                      <Field label="Electric" value={v.electric_hookup || '—'} />
                    </div>
                    {v.objections && <p className="text-xs text-red-400/80">Objections: {v.objections}</p>}
                    {v.notes && <p className="text-xs text-slate-400 italic">{v.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <Field label="Source" value={lead.source || '—'} />
                <Field label="Property Type" value={lead.property_type || '—'} />
                <Field label="Website" value={lead.website ? lead.website : '—'} isLink={!!lead.website} />
                <Field label="Parking Type" value={lead.parking_type || '—'} />                <Field label="Parking Spaces" value={lead.parking_spaces?.toString() || '—'} />
                <Field label="Ownership" value={lead.ownership_type || '—'} />
                <Field label="Created" value={new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <Field label="Last Updated" value={new Date(lead.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <Field label="Estimated Value" value={lead.estimated_value ? `£${lead.estimated_value}` : '—'} />
              </div>
              {lead.admin_notes && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{lead.admin_notes}</p>
                </div>
              )}
              {lead.tags && lead.tags.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tags</p>
                  <div className="flex gap-1 flex-wrap">
                    {lead.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Opening Hours */}
            {lead.opening_hours_text && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Opening Hours</p>
                <div className="space-y-0.5">
                  {lead.opening_hours_text.split('\n').map((line, i) => {
                    const [day, ...rest] = line.split(': ');
                    return (
                      <div key={i} className="flex justify-between text-sm gap-3">
                        <span className="text-slate-400 font-medium w-28 shrink-0">{day}</span>
                        <span className="text-slate-300 text-right">{rest.join(': ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Linked Place */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Linked Place</p>
                {lead.linked_place
                  ? <button onClick={handleUnlinkPlace} className="text-xs text-red-400 hover:text-red-300">Unlink</button>
                  : <button onClick={() => setPlaceSearchOpen(o => !o)} className="text-xs text-emerald-400 hover:text-emerald-300">+ Link a place</button>
                }
              </div>

              {/* Place search overlay */}
              {placeSearchOpen && !lead.linked_place && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={placeSearchQuery}
                    onChange={e => handlePlaceSearch(e.target.value)}
                    placeholder="Search by name, address or host name…"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {placeSearchLoading && <p className="text-xs text-slate-500">Searching…</p>}
                  {placeSearchResults.length > 0 && (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {placeSearchResults.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleLinkPlace(p.id)}
                          className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 space-y-0.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-200 font-medium">{p.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${p.approval_status === 'approved' ? 'bg-emerald-900/60 text-emerald-400' : p.approval_status === 'pending' ? 'bg-amber-900/60 text-amber-400' : 'bg-red-900/60 text-red-400'}`}>{p.approval_status}</span>
                          </div>
                          <p className="text-xs text-slate-500">{p.address}, {p.city} · Host: {p.owner_name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {!placeSearchLoading && placeSearchQuery.length >= 2 && placeSearchResults.length === 0 && (
                    <p className="text-xs text-slate-500">No places found</p>
                  )}
                </div>
              )}

              {lead.linked_place ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-200">{lead.linked_place.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${lead.linked_place.approval_status === 'approved' ? 'bg-emerald-900/60 text-emerald-400' : lead.linked_place.approval_status === 'pending' ? 'bg-amber-900/60 text-amber-400' : 'bg-red-900/60 text-red-400'}`}>
                      {lead.linked_place.approval_status}
                    </span>
                    {lead.linked_place.place_type && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{lead.linked_place.place_type.replace('_', ' ')}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div><span className="text-slate-500">Address</span><p className="text-slate-300">{lead.linked_place.address}, {lead.linked_place.city}</p></div>
                    {lead.linked_place.price_per_night && <div><span className="text-slate-500">Price/night</span><p className="text-slate-300">£{lead.linked_place.price_per_night}</p></div>}
                    <div><span className="text-slate-500">Host</span><p className="text-slate-300">{lead.linked_place.owner_name}</p></div>
                    {lead.linked_place.owner_phone && (
                      <div>
                        <span className="text-slate-500">Host phone</span>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-300">{lead.linked_place.owner_phone}</p>
                          {lead.linked_place.owner_phone !== lead.phone && (
                            <button
                              onClick={handleSyncPhone}
                              disabled={syncingPhone}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900 disabled:opacity-50"
                            >
                              {syncingPhone ? '…' : 'Sync to lead'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <a
                    href={`/admin/places/${lead.linked_place.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs text-blue-400 hover:text-blue-300 mt-1"
                  >
                    View place in admin →
                  </a>
                </div>
              ) : (
                !placeSearchOpen && <p className="text-xs text-slate-500">No place linked yet. This lead has not been converted to an active listing.</p>
              )}
            </div>

            {/* Contract */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contract</p>
              {lead.contract_url ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <a href={lead.contract_url} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:text-blue-300 underline">
                    View contract ↗
                  </a>
                  <label className={`text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 cursor-pointer ${contractUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {contractUploading ? 'Uploading…' : 'Replace'}
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleContractUpload} />
                  </label>
                </div>
              ) : (
                <label className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-200 cursor-pointer ${contractUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {contractUploading ? 'Uploading…' : '↑ Upload contract (PDF or Word)'}
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleContractUpload} />
                </label>
              )}
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custom Fields</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customFields.map(field => {
                    const val = customValuesDirty[field.id] ?? '';
                    const setVal = (v: string) => setCustomValuesDirty(d => ({ ...d, [field.id]: v }));
                    return (
                      <div key={field.id}>
                        <label className="block text-xs text-slate-500 mb-1">{field.name}</label>
                        {field.field_type === 'text' && <input type="text" value={val} onChange={e => setVal(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />}
                        {field.field_type === 'number' && <input type="number" value={val} onChange={e => setVal(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />}
                        {field.field_type === 'date' && <input type="date" value={val} onChange={e => setVal(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />}
                        {field.field_type === 'url' && <input type="url" value={val} onChange={e => setVal(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />}
                        {field.field_type === 'checkbox' && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={val === 'true'} onChange={e => setVal(e.target.checked ? 'true' : 'false')} className="accent-emerald-500 w-4 h-4" />
                            <span className="text-sm text-slate-300">{val === 'true' ? 'Yes' : 'No'}</span>
                          </label>
                        )}
                        {field.field_type === 'select' && (
                          <select value={val} onChange={e => setVal(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                            <option value="">—</option>
                            {(field.options || []).map(opt => <option key={opt.label} value={opt.label}>{opt.label}</option>)}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
                {JSON.stringify(customValuesDirty) !== JSON.stringify(customValues) && (
                  <button onClick={handleSaveCustomValues} disabled={customValuesSaving} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-medium px-4 py-1.5 rounded-lg">
                    {customValuesSaving ? 'Saving…' : 'Save Custom Fields'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmailThreadItem({
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
      isInbound
        ? 'border-slate-700 bg-slate-900'
        : 'border-blue-900/40 bg-[#0d1f35]'
    }`}>
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Avatar */}
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
              {isInbound
                ? `To: you`
                : `To: ${email.to_email || leadEmail || leadName}`}
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

      {/* Subject line when expanded */}
      {expanded && email.subject && (
        <div className="px-4 pb-1 border-t border-slate-800/50">
          <p className="text-xs font-semibold text-slate-300 pt-2">{email.subject}</p>
        </div>
      )}

      {/* Body */}
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

function CRMInput({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500" />
    </div>
  );
}

function CRMSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
        {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1).replace(/_/g, ' ')}</option>)}
      </select>
    </div>
  );
}

function Field({ label, value, isLink }: { label: string; value: string | undefined | null; isLink?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</p>
      {isLink && value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline truncate block">{value}</a>
      ) : (
        <p className="text-xs text-slate-300">{value || '—'}</p>
      )}
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string | null }) {
  const colors: Record<string, string> = {
    convert: 'bg-emerald-500/10 text-emerald-400',
    promising: 'bg-amber-500/10 text-amber-400',
    not_suitable: 'bg-red-500/10 text-red-400',
    owner_not_interested: 'bg-slate-500/10 text-slate-400',
  };
  return verdict ? (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[verdict] || colors.promising}`}>
      {verdict.replace(/_/g, ' ')}
    </span>
  ) : null;
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
