'use client';

export default function DiscoverPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-bold text-slate-100">Discover Leads</h1>

      {/* Coming Soon Notice */}
      <div className="bg-gradient-to-br from-violet-500/10 to-emerald-500/10 border border-violet-500/20 rounded-xl p-8 text-center space-y-4">
        <div className="text-4xl">🛰️</div>
        <h2 className="text-lg font-semibold text-slate-200">AI Lead Discovery — Phase 3</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Automatically find pubs, farms, and rural venues with large car parks using Google Places,
          satellite imagery, and GPT-4 Vision analysis.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <FeatureCard icon="🔍" title="Google Places" desc="Search by area, type, and rating to find potential hosts" />
          <FeatureCard icon="🛰️" title="Satellite Analysis" desc="GPT-4o analyses aerial imagery to identify large car parks" />
          <FeatureCard icon="✉️" title="Auto-Outreach" desc="AI-personalised emails sent to qualifying leads" />
        </div>
      </div>

      {/* Phase Roadmap */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300">Roadmap</h3>
        <div className="space-y-3">
          <Phase phase="1" title="Manual CRM Operations" status="active" desc="Hand-curate leads, log visits, send manual emails. First 50 sites." />
          <Phase phase="2" title="Email Automation" status="upcoming" desc="Automated chasers, sequence drips, template engine with merge fields." />
          <Phase phase="3" title="AI Lead Discovery" status="upcoming" desc="Google Places integration, satellite car park analysis, GPT-4o scoring." />
          <Phase phase="4" title="Autonomous Mode" status="upcoming" desc="AI finds leads, scores them, sends personalised outreach. Human approval at &lt;75% accuracy." />
        </div>
      </div>

      {/* Manual Add Hint */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-slate-400">For now, add leads manually from the Leads page</p>
        <a href="/crm/leads" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Go to Leads →</a>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="text-xs font-semibold text-slate-300 mb-1">{title}</h4>
      <p className="text-[11px] text-slate-500">{desc}</p>
    </div>
  );
}

function Phase({ phase, title, status, desc }: { phase: string; title: string; status: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'
      }`}>{phase}</div>
      <div>
        <p className={`text-sm font-medium ${status === 'active' ? 'text-emerald-400' : 'text-slate-400'}`}>{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}
