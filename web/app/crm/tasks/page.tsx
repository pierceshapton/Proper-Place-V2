'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { crmApi, type CRMTask, type CRMLead } from '@/lib/api';

export default function TasksPage() {
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ lead_id: '', title: '', description: '', due_date: '', priority: 'medium' });
  const [leads, setLeads] = useState<CRMLead[]>([]);

  useEffect(() => { loadTasks(); loadLeads(); }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await crmApi.getTasks(filter === 'all' ? {} : { status: filter });
      setTasks(res.tasks);
    } catch {} finally { setLoading(false); }
  }

  async function loadLeads() {
    try {
      const res = await crmApi.getLeads({});
      setLeads(res.leads);
    } catch {}
  }

  useEffect(() => { loadTasks(); }, [filter]);

  async function handleComplete(id: number) {
    await crmApi.updateTask(id, { status: 'completed' });
    loadTasks();
  }

  async function handleReopen(id: number) {
    await crmApi.updateTask(id, { status: 'pending' });
    loadTasks();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete task?')) return;
    await crmApi.deleteTask(id);
    loadTasks();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await crmApi.createTask({ ...form, lead_id: form.lead_id ? parseInt(form.lead_id) : undefined });
    setShowAdd(false);
    setForm({ lead_id: '', title: '', description: '', due_date: '', priority: 'medium' });
    loadTasks();
  }

  const overdue = tasks.filter(t => t.status === 'pending' && t.due_date && new Date(t.due_date) < new Date());
  const upcoming = tasks.filter(t => t.status === 'pending' && t.due_date && new Date(t.due_date) >= new Date());
  const noDue = tasks.filter(t => t.status === 'pending' && !t.due_date);
  const completed = tasks.filter(t => t.status === 'completed');
  const orderedTasks = filter === 'completed' ? completed : [...overdue, ...upcoming, ...noDue];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Tasks</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
          + New Task
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Task</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                placeholder="Follow up with Sarah..." />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Linked Lead (optional)</label>
              <select value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                <option value="">No lead</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.business_name || `${l.first_name} ${l.last_name}`}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                <option value="hot">Hot</option>
                <option value="medium">Medium</option>
                <option value="cold">Cold</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500" rows={2} placeholder="Details..." />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg font-medium">Create</button>
            <button type="button" onClick={() => setShowAdd(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-1">
        {(['pending', 'completed', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === f ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
        </div>
      ) : orderedTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-600 text-sm">{filter === 'completed' ? 'No completed tasks' : 'All clear - no tasks'}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {overdue.length > 0 && filter !== 'completed' && (
            <p className="text-[10px] uppercase tracking-wider text-red-400 pt-2 pb-1">Overdue ({overdue.length})</p>
          )}
          {orderedTasks.map((t, i) => {
            const isOverdue = t.status === 'pending' && t.due_date && new Date(t.due_date) < new Date();
            const showUpcomingLabel = filter !== 'completed' && upcoming.length > 0 && i === overdue.length && overdue.length > 0;
            return (
              <div key={t.id}>
                {showUpcomingLabel && <p className="text-[10px] uppercase tracking-wider text-slate-500 pt-3 pb-1">Upcoming</p>}
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                  isOverdue ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900 border-slate-800'
                } ${t.status === 'completed' ? 'opacity-50' : ''}`}>
                  <button
                    onClick={() => t.status === 'completed' ? handleReopen(t.id) : handleComplete(t.id)}
                    className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] transition-colors ${
                      t.status === 'completed'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'border-slate-600 hover:border-emerald-500'
                    }`}>
                    {t.status === 'completed' ? '✓' : ''}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.due_date && (
                        <span className={`text-[11px] ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                          {new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {isOverdue && ' ⚠'}
                        </span>
                      )}
                      {t.priority && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          t.priority === 'hot' ? 'bg-red-500/10 text-red-400' : t.priority === 'cold' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700/50 text-slate-400'
                        }`}>{t.priority}</span>
                      )}
                      {t.lead_id && (t.business_name || t.first_name) && (
                        <Link href={`/crm/leads/${t.lead_id}`} className="text-[11px] text-emerald-400/70 hover:text-emerald-400 truncate">
                          {t.business_name || `${t.first_name} ${t.last_name || ''}`.trim()}
                        </Link>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(t.id)} className="text-slate-600 hover:text-red-400 text-xs flex-shrink-0 transition-colors">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
