'use client';

import { useEffect, useState } from 'react';
import { crmApi } from '@/lib/api';

interface CRMSettingsMap {
  [key: string]: string;
}

const SETTING_LABELS: Record<string, { label: string; description: string; type: 'text' | 'number' | 'json' }> = {
  auto_mode_threshold: { label: 'Auto-Mode Accuracy Threshold (%)', description: 'AI will go autonomous once learning accuracy reaches this percentage', type: 'number' },
  default_chaser_days: { label: 'Default Chaser Schedule (days)', description: 'JSON array of days after initial email to send chasers. e.g. [3, 7, 14]', type: 'json' },
  ai_provider: { label: 'AI Provider', description: 'Which AI provider to use for email generation', type: 'text' },
  ai_model: { label: 'AI Model', description: 'Which model to use (e.g. gpt-4o-mini, gpt-4o)', type: 'text' },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<CRMSettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await crmApi.getSettings();
      const map: CRMSettingsMap = {};
      res.settings.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
      setSettings(map);
    } catch {} finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await crmApi.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {} finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-100">CRM Settings</h1>

      <div className="space-y-4">
        {Object.entries(SETTING_LABELS).map(([key, { label, description, type }]) => (
          <div key={key} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-200 mb-0.5">{label}</label>
            <p className="text-xs text-slate-500 mb-2">{description}</p>
            <input
              type={type === 'number' ? 'number' : 'text'}
              value={settings[key] || ''}
              onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-xs text-emerald-400">✓ Saved</span>}
      </div>

      {/* System Info */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mt-8">
        <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">System Info</h3>
        <div className="space-y-1 text-xs text-slate-500">
          <p>CRM Version: 1.0.0</p>
          <p>Phase: 1 — Manual Operations</p>
          <p>AI Features: Pending Phase 3 implementation</p>
        </div>
      </div>
    </div>
  );
}
