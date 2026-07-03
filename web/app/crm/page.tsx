'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { crmApi, type CRMStats } from '@/lib/api';

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  assessing: 'Assessing',
  negotiating: 'Negotiating',
  converted: 'Converted',
  lost: 'Lost',
};

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-amber-500',
  assessing: 'bg-violet-500',
  negotiating: 'bg-orange-500',
  converted: 'bg-emerald-500',
  lost: 'bg-red-500',
};

export default function CRMDashboard() {
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crmApi.stats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  const t = stats?.totals;
  const totalLeads = parseInt(t?.total_leads || '0');
  const converted = parseInt(t?.converted || '0');
  const hotLeads = parseInt(t?.hot_leads || '0');
  const newThisWeek = parseInt(t?.new_this_week || '0');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Pipeline overview and recent activity</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Leads" value={totalLeads} icon="◉" color="text-blue-400" />
        <MetricCard label="Converted" value={converted} sub={t?.conversion_rate ? `${t.conversion_rate}%` : undefined} icon="✓" color="text-emerald-400" />
        <MetricCard label="Hot Leads" value={hotLeads} icon="🔥" color="text-red-400" />
        <MetricCard label="New This Week" value={newThisWeek} icon="+" color="text-violet-400" />
      </div>

      {/* Task alerts */}
      {(stats?.overdue_tasks || 0) > 0 || (stats?.upcoming_tasks || 0) > 0 ? (
        <div className="flex flex-wrap gap-3">
          {(stats?.overdue_tasks || 0) > 0 && (
            <Link href="/crm/tasks" className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors">
              <span>⚠</span>
              <span>{stats?.overdue_tasks} overdue task{stats?.overdue_tasks !== 1 ? 's' : ''}</span>
            </Link>
          )}
          {(stats?.upcoming_tasks || 0) > 0 && (
            <Link href="/crm/tasks" className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors">
              <span>📋</span>
              <span>{stats?.upcoming_tasks} task{stats?.upcoming_tasks !== 1 ? 's' : ''} due soon</span>
            </Link>
          )}
        </div>
      ) : null}

      {/* Pipeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Pipeline</h2>
          <Link href="/crm/pipeline" className="text-xs text-emerald-400 hover:text-emerald-300">View board →</Link>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.keys(STAGE_LABELS).map(stage => {
            const stageData = stats?.pipeline.find(p => p.pipeline_stage === stage);
            const count = parseInt(stageData?.count || '0');
            return (
              <Link key={stage} href={`/crm/leads?pipeline_stage=${stage}`} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg p-3 text-center transition-colors">
                <div className={`w-2 h-2 rounded-full ${STAGE_COLORS[stage]} mx-auto mb-2`}></div>
                <p className="text-xl font-bold text-slate-100 font-mono">{count}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{STAGE_LABELS[stage]}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Recent Activity</h2>
          <div className="space-y-2">
            {stats?.recent_activities && stats.recent_activities.length > 0 ? (
              stats.recent_activities.map(a => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-slate-800/50 last:border-0">
                  <ActivityIcon type={a.activity_type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {a.business_name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Unknown'}
                      <span className="mx-1">·</span>
                      {timeAgo(a.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600 py-4 text-center">No activity yet. Start adding leads!</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/crm/leads?new=true" className="flex items-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg px-4 py-3 transition-colors">
              <span className="text-emerald-400">+</span>
              <div>
                <p className="text-sm font-medium text-emerald-400">Add New Lead</p>
                <p className="text-xs text-slate-500">Manually add a prospect</p>
              </div>
            </Link>
            <Link href="/crm/discover" className="flex items-center gap-3 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-lg px-4 py-3 transition-colors">
              <span className="text-violet-400">⊕</span>
              <div>
                <p className="text-sm font-medium text-violet-400">Discover Leads</p>
                <p className="text-xs text-slate-500">Find pubs & sites via Google Maps</p>
              </div>
            </Link>
            <Link href="/crm/emails" className="flex items-center gap-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg px-4 py-3 transition-colors">
              <span className="text-blue-400">✉</span>
              <div>
                <p className="text-sm font-medium text-blue-400">Email Templates</p>
                <p className="text-xs text-slate-500">Create outreach templates</p>
              </div>
            </Link>
            <Link href="/crm/pipeline" className="flex items-center gap-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg px-4 py-3 transition-colors">
              <span className="text-amber-400">◫</span>
              <div>
                <p className="text-sm font-medium text-amber-400">Pipeline Board</p>
                <p className="text-xs text-slate-500">Drag leads through stages</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Emails sent */}
      <div className="text-xs text-slate-600 text-center">
        {stats?.emails_sent_30d || 0} emails sent in last 30 days
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon, color }: { label: string; value: number; sub?: string; icon: string; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-lg ${color}`}>{icon}</span>
        {sub && <span className="text-xs text-emerald-400 font-mono">{sub}</span>}
      </div>
      <p className="text-2xl font-bold text-slate-100 font-mono">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
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
  };
  const icons: Record<string, string> = {
    email: '✉', call: '📞', site_visit: '📍', stage_change: '→',
    note: '📝', task_created: '☐', lead_created: '+',
  };
  const c = colors[type] || 'bg-slate-500/20 text-slate-400';
  return (
    <div className={`w-7 h-7 rounded-lg ${c} flex items-center justify-center text-xs flex-shrink-0`}>
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
