'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { crmApi, type CRMLead, type CRMActivity, type CRMTask, type CRMEmailLog, type CRMSiteVisit } from '@/lib/api';

const STAGES = ['new', 'contacted', 'assessing', 'negotiating', 'converted', 'lost'];
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

  // Add activity form
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [actForm, setActForm] = useState({ activity_type: 'note', title: '', description: '' });

  // Add task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', due_date: '', priority: 'medium' });

  // Send email form
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '' });

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

  useEffect(() => {
    loadAll();
  }, [leadId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [leadRes, actRes, taskRes, emailRes, visitRes] = await Promise.all([
        crmApi.getLead(leadId),
        crmApi.getActivities(leadId),
        crmApi.getTasks({ lead_id: String(leadId) }),
        crmApi.getEmailLog(leadId),
        crmApi.getSiteVisits(leadId),
      ]);
      setLead(leadRes.lead);
      setActivities(actRes.activities);
      setTasks(taskRes.tasks);
      setEmails(emailRes.emails);
      setVisits(visitRes.visits);
    } catch {
      router.push('/crm/leads');
    } finally {
      setLoading(false);
    }
  }

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
    await crmApi.sendEmail(leadId, emailForm);
    setShowSendEmail(false);
    setEmailForm({ subject: '', body: '' });
    loadAll();
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
            <button onClick={() => setShowSendEmail(true)} className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
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
          <div className="flex gap-1">
            {STAGES.map(s => (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${
                  lead.pipeline_stage === s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
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

      {/* Send Email Form */}
      {showSendEmail && (
        <form onSubmit={handleSendEmail} className="bg-slate-900 border border-blue-500/30 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-blue-400">Send Email to {lead.email}</h3>
          <CRMInput label="Subject" value={emailForm.subject} onChange={v => setEmailForm(f => ({ ...f, subject: v }))} placeholder="Quick intro from Proper Place" />
          <div>
            <label className="block text-xs text-slate-400 mb-1">Body (HTML supported, use {'{{business_name}}'} etc. for merge fields)</label>
            <textarea
              value={emailForm.body}
              onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              rows={6}
              placeholder="Hi {{first_name}},&#10;&#10;I noticed {{business_name}} has a great location for motorhome guests..."
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Send Email</button>
            <button type="button" onClick={() => setShowSendEmail(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg">Cancel</button>
          </div>
        </form>
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
            {activities.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-8">No activity recorded yet</p>
            ) : (
              <div className="space-y-1">
                {activities.map(a => (
                  <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-slate-800/50">
                    <ActivityIcon type={a.activity_type} />
                    <div className="flex-1">
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
                  <div key={t.id} className={`flex items-center gap-3 py-2.5 border-b border-slate-800/50 ${t.status === 'completed' ? 'opacity-50' : ''}`}>
                    <button
                      onClick={() => t.status !== 'completed' && handleCompleteTask(t.id)}
                      className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] transition-colors ${
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

        {/* Emails Tab */}
        {activeTab === 'emails' && (
          <div className="space-y-3">
            <button onClick={() => setShowSendEmail(true)} className="text-xs text-blue-400 hover:text-blue-300">+ Send email</button>
            {emails.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-8">No emails sent</p>
            ) : (
              <div className="space-y-2">
                {emails.map(e => (
                  <div key={e.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
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
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <Field label="Source" value={lead.source || '—'} />
              <Field label="Property Type" value={lead.property_type || '—'} />
              <Field label="Website" value={lead.website ? lead.website : '—'} isLink={!!lead.website} />
              <Field label="Parking Type" value={lead.parking_type || '—'} />
              <Field label="Parking Spaces" value={lead.parking_spaces?.toString() || '—'} />
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
        )}
      </div>
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
