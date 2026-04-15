'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { crmApi, type CRMLead } from '@/lib/api';

const STAGES = ['new', 'contacted', 'assessing', 'negotiating', 'converted', 'lost'];
const PRIORITIES = ['hot', 'warm', 'medium', 'cold'];

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  contacted: 'bg-amber-500/10 text-amber-400',
  assessing: 'bg-violet-500/10 text-violet-400',
  negotiating: 'bg-orange-500/10 text-orange-400',
  converted: 'bg-emerald-500/10 text-emerald-400',
  lost: 'bg-red-500/10 text-red-400',
};

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState(searchParams.get('pipeline_stage') || '');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showForm, setShowForm] = useState(searchParams.get('new') === 'true');

  // New lead form
  const [form, setForm] = useState({
    business_name: '', first_name: '', last_name: '', email: '', phone: '',
    location: '', website: '', property_type: 'pub', pipeline_stage: 'new', priority: 'medium',
    admin_notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLeads();
  }, [stageFilter, priorityFilter]);

  async function loadLeads() {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (stageFilter) params.pipeline_stage = stageFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;
      const res = await crmApi.getLeads(params);
      setLeads(res.leads);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    loadLeads();
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await crmApi.createLead(form as unknown as Partial<CRMLead>);
      setShowForm(false);
      setForm({
        business_name: '', first_name: '', last_name: '', email: '', phone: '',
        location: '', website: '', property_type: 'pub', pipeline_stage: 'new', priority: 'medium',
        admin_notes: '',
      });
      loadLeads();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Leads</h1>
          <p className="text-sm text-slate-500 mt-1">{total} total</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Lead'}
        </button>
      </div>

      {/* Add Lead Form */}
      {showForm && (
        <form onSubmit={handleCreateLead} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">New Lead</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Input label="Business Name" value={form.business_name} onChange={v => setForm(f => ({ ...f, business_name: v }))} placeholder="The Fox & Hound" />
            <Input label="First Name" value={form.first_name} onChange={v => setForm(f => ({ ...f, first_name: v }))} />
            <Input label="Last Name" value={form.last_name} onChange={v => setForm(f => ({ ...f, last_name: v }))} />
            <Input label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
            <Input label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} type="tel" />
            <Input label="Location" value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="Wells, Somerset" />
            <Input label="Website" value={form.website} onChange={v => setForm(f => ({ ...f, website: v }))} placeholder="https://" />
            <Select label="Type" value={form.property_type} onChange={v => setForm(f => ({ ...f, property_type: v }))} options={['pub', 'farm', 'campsite', 'hotel', 'caravan_park', 'other']} />
            <Select label="Priority" value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} options={PRIORITIES} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea
              value={form.admin_notes}
              onChange={e => setForm(f => ({ ...f, admin_notes: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Creating...' : 'Create Lead'}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="flex">
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-l-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <button onClick={handleSearch} className="bg-slate-800 border border-l-0 border-slate-700 rounded-r-lg px-3 text-slate-400 hover:text-slate-200">
              ⌕
            </button>
          </div>
        </div>
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
        >
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {/* Lead List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-slate-500 text-lg mb-2">No leads found</p>
          <p className="text-slate-600 text-sm">Add your first lead or discover new ones</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {/* Table header - desktop */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-2 px-4 py-2 bg-slate-800/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <div className="col-span-3">Lead</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-1">Stage</div>
            <div className="col-span-1">Priority</div>
            <div className="col-span-1">Rating</div>
            <div className="col-span-2">Last Contact</div>
            <div className="col-span-2">Follow-up</div>
          </div>

          {/* Rows */}
          {leads.map(lead => (
            <Link key={lead.id} href={`/crm/leads/${lead.id}`}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 lg:gap-2 px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer">
                {/* Lead name + email */}
                <div className="col-span-3">
                  <p className="text-sm font-medium text-slate-200 truncate">{lead.business_name || `${lead.first_name} ${lead.last_name}`.trim() || 'Unnamed'}</p>
                  <p className="text-xs text-slate-500 truncate">{lead.email || '—'}</p>
                </div>
                {/* Location */}
                <div className="col-span-2 flex items-center">
                  <span className="text-xs text-slate-400 truncate">{lead.location || '—'}</span>
                </div>
                {/* Stage */}
                <div className="col-span-1 flex items-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[lead.pipeline_stage] || 'bg-slate-500/10 text-slate-400'}`}>
                    {lead.pipeline_stage}
                  </span>
                </div>
                {/* Priority */}
                <div className="col-span-1 flex items-center">
                  <span className={`w-2 h-2 rounded-full ${
                    lead.priority === 'hot' ? 'bg-red-500' :
                    lead.priority === 'warm' ? 'bg-orange-400' :
                    lead.priority === 'cold' ? 'bg-blue-400' : 'bg-slate-500'
                  }`}></span>
                  <span className="text-xs text-slate-400 ml-1.5">{lead.priority}</span>
                </div>
                {/* Rating */}
                <div className="col-span-1 flex items-center">
                  <span className="text-xs text-slate-400 font-mono">{lead.google_rating ? `${lead.google_rating} ⭐` : '—'}</span>
                </div>
                {/* Last contact */}
                <div className="col-span-2 flex items-center">
                  <span className="text-xs text-slate-500">{lead.last_contact_date ? timeAgo(lead.last_contact_date) : 'Never'}</span>
                </div>
                {/* Follow-up */}
                <div className="col-span-2 flex items-center">
                  {lead.next_follow_up ? (
                    <span className={`text-xs ${new Date(lead.next_follow_up) < new Date() ? 'text-red-400' : 'text-slate-400'}`}>
                      {new Date(lead.next_follow_up).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {new Date(lead.next_follow_up) < new Date() && ' ⚠'}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
      >
        {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1).replace('_', ' ')}</option>)}
      </select>
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
