'use client';

import { useEffect, useState } from 'react';
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
                <LeadCard key={lead.id} lead={lead} onDragStart={handleDragStart} />
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
              <Link href={`/crm/leads/${lead.id}`} className="block">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{lead.business_name || `${lead.first_name} ${lead.last_name}`.trim()}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{lead.location || '—'}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[lead.priority] || PRIORITY_COLORS.medium}`}>
                    {lead.priority}
                  </span>
                </div>
              </Link>
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
    </div>
  );
}

function LeadCard({ lead, onDragStart }: { lead: CRMLead; onDragStart: (e: React.DragEvent, id: number) => void }) {
  return (
    <Link href={`/crm/leads/${lead.id}`}>
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
    </Link>
  );
}
