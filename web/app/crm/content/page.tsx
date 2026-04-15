'use client';

import { useEffect, useState, useCallback } from 'react';
import { crmApi, type CmsRow } from '@/lib/api';

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero Banner',
  about: 'About Section',
  how: 'How It Works',
  motorhomers: 'For Motorhomers',
  hosts: 'For Hosts / Landowners',
  cta: 'Bottom Call-to-Action',
};

const PAGE_LABELS: Record<string, string> = {
  homepage: 'Homepage',
};

export default function ContentPage() {
  const [rows, setRows] = useState<CmsRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crmApi.getCmsContent();
      setRows(data.rows);
      const initial: Record<string, string> = {};
      data.rows.forEach(r => { initial[r.key] = r.value; });
      setDraft(initial);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setSaved(null);
    try {
      const updates = rows
        .filter(r => draft[r.key] !== r.value)
        .map(r => ({ key: r.key, value: draft[r.key] ?? r.value }));

      if (updates.length === 0) {
        setSaved('No changes to save.');
        setSaving(false);
        return;
      }

      await crmApi.updateCmsContent(updates);
      // Refresh rows so the "no changes" check resets
      setRows(prev => prev.map(r => ({ ...r, value: draft[r.key] ?? r.value })));
      setSaved(`Saved ${updates.length} change${updates.length > 1 ? 's' : ''}. Changes will be live within ~60 seconds.`);
    } catch {
      setSaved('Save failed — please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Group rows by page → section
  const grouped: Record<string, Record<string, CmsRow[]>> = {};
  rows.forEach(row => {
    if (!grouped[row.page]) grouped[row.page] = {};
    if (!grouped[row.page][row.section]) grouped[row.page][row.section] = [];
    grouped[row.page][row.section].push(row);
  });

  const hasChanges = rows.some(r => draft[r.key] !== r.value);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Website Content</h1>
          <p className="text-sm text-slate-500 mt-1">Edit the text shown on the public website. Changes go live within ~60 seconds.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {saved && (
        <div className={`text-sm px-4 py-3 rounded-lg border ${
          saved.includes('failed')
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          {saved}
        </div>
      )}

      {/* Sections */}
      {Object.entries(grouped).map(([page, sections]) => (
        <div key={page}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            {PAGE_LABELS[page] || page}
          </p>

          <div className="space-y-4">
            {Object.entries(sections).map(([section, fields]) => (
              <div key={section} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
                  <h2 className="text-sm font-semibold text-slate-300">
                    {SECTION_LABELS[section] || section}
                  </h2>
                </div>

                <div className="p-4 space-y-4">
                  {fields.map(field => (
                    <div key={field.key}>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                        {field.label}
                        {draft[field.key] !== field.value && (
                          <span className="ml-2 text-amber-400 text-[10px]">● unsaved</span>
                        )}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          value={draft[field.key] ?? field.value}
                          onChange={e => setDraft(d => ({ ...d, [field.key]: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 resize-y"
                        />
                      ) : (
                        <input
                          type="text"
                          value={draft[field.key] ?? field.value}
                          onChange={e => setDraft(d => ({ ...d, [field.key]: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Bottom save */}
      {hasChanges && (
        <div className="flex justify-end pb-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save All Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
