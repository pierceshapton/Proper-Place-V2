'use client';

import { useEffect, useState, useRef } from 'react';
import { crmApi, adminApi, ApiError, type CRMStage, type CRMCustomField } from '@/lib/api';
import { AVAILABLE_COLORS, COLOR_MAP, COLOR_GROUPS, COLOR_HEX, FIELD_TYPE_BADGES } from '@/lib/stageColors';

type Tab = 'stages' | 'fields' | 'general';
type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'url';

// ─── Color Picker ────────────────────────────────────────────────────
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const triggerHex = COLOR_HEX[value] ?? '#64748b';
  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        style={{ backgroundColor: triggerHex }}
        className="w-5 h-5 rounded-full border-2 border-slate-700 hover:border-slate-400 transition-colors flex-shrink-0"
        title="Change colour"
      />
      {open && (
        <div className="absolute left-0 top-7 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-2">
          {/* 3 rows: light (300) / medium (500) / dark (700) - 19 cols, one per hue */}
          {[0, 1, 2].map(row => (
            <div key={row} className="flex gap-1" style={{ marginBottom: row < 2 ? 4 : 0 }}>
              {COLOR_GROUPS.map(group => {
                const key = group.shades[row];
                const hex = COLOR_HEX[key] ?? '#64748b';
                const selected = value === key;
                return (
                  <button
                    key={key}
                    title={key}
                    onClick={() => { onChange(key); setOpen(false); }}
                    style={{ backgroundColor: hex }}
                    className={`w-5 h-5 rounded-sm transition-transform hover:scale-110 flex-shrink-0 relative${selected ? ' ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}`}
                  >
                    {selected && (
                      <svg className="absolute inset-0 m-auto w-3 h-3" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stage Row ───────────────────────────────────────────────────────
function StageRow({ stage, isFirst, isLast, onUpdate, onDelete, onMoveUp, onMoveDown }: {
  stage: CRMStage; isFirst: boolean; isLast: boolean;
  onUpdate: (id: number, data: Partial<CRMStage>) => void;
  onDelete: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setName(stage.name); }, [stage.name]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function saveName() {
    const t = name.trim();
    if (t && t !== stage.name) onUpdate(stage.id, { name: t }); else setName(stage.name);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg group hover:bg-slate-800/40 transition-colors">
      <div className="flex flex-col gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onMoveUp(stage.id)} disabled={isFirst} className="text-slate-600 hover:text-slate-300 disabled:opacity-20 text-[10px] leading-none px-0.5">▲</button>
        <button onClick={() => onMoveDown(stage.id)} disabled={isLast} className="text-slate-600 hover:text-slate-300 disabled:opacity-20 text-[10px] leading-none px-0.5">▼</button>
      </div>
      <ColorPicker value={stage.color} onChange={c => onUpdate(stage.id, { color: c })} />
      {editing ? (
        <input ref={inputRef} value={name} onChange={e => setName(e.target.value)} onBlur={saveName}
          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(stage.name); setEditing(false); } }}
          className="flex-1 bg-slate-700 border border-emerald-500 rounded px-2 py-0.5 text-sm text-slate-100 focus:outline-none" />
      ) : (
        <span className="flex-1 text-sm text-slate-200 cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => setEditing(true)} title="Click to rename">{stage.name}</span>
      )}
      <code className="text-[10px] text-slate-600 font-mono bg-slate-800/60 px-1.5 py-0.5 rounded hidden sm:block">{stage.slug}</code>
      <button onClick={() => onUpdate(stage.id, { is_won: !stage.is_won, is_lost: false })} className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${stage.is_won ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'border-slate-700 text-slate-600 hover:border-slate-500 hover:text-slate-400'}`}>Won</button>
      <button onClick={() => onUpdate(stage.id, { is_lost: !stage.is_lost, is_won: false })} className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${stage.is_lost ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'border-slate-700 text-slate-600 hover:border-slate-500 hover:text-slate-400'}`}>Lost</button>
      <button onClick={() => onDelete(stage.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-sm ml-1" title="Delete">✕</button>
    </div>
  );
}

// ─── Field Row ───────────────────────────────────────────────────────
function FieldRow({ field, isFirst, isLast, onUpdate, onDelete, onMoveUp, onMoveDown }: {
  field: CRMCustomField; isFirst: boolean; isLast: boolean;
  onUpdate: (id: number, data: Partial<CRMCustomField>) => void;
  onDelete: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(field.name);
  const [showOptions, setShowOptions] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [newOptionColor, setNewOptionColor] = useState('blue');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setName(field.name); }, [field.name]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function saveName() {
    const t = name.trim();
    if (t && t !== field.name) onUpdate(field.id, { name: t }); else setName(field.name);
    setEditing(false);
  }

  function addOption() {
    if (!newOption.trim()) return;
    onUpdate(field.id, { options: [...(field.options || []), { label: newOption.trim(), color: newOptionColor }] });
    setNewOption('');
  }

  const badge = FIELD_TYPE_BADGES[field.field_type] || FIELD_TYPE_BADGES.text;

  return (
    <div className="rounded-lg group hover:bg-slate-800/40 transition-colors">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="flex flex-col gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onMoveUp(field.id)} disabled={isFirst} className="text-slate-600 hover:text-slate-300 disabled:opacity-20 text-[10px] leading-none px-0.5">▲</button>
          <button onClick={() => onMoveDown(field.id)} disabled={isLast} className="text-slate-600 hover:text-slate-300 disabled:opacity-20 text-[10px] leading-none px-0.5">▼</button>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
        {editing ? (
          <input ref={inputRef} value={name} onChange={e => setName(e.target.value)} onBlur={saveName}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(field.name); setEditing(false); } }}
            className="flex-1 bg-slate-700 border border-emerald-500 rounded px-2 py-0.5 text-sm text-slate-100 focus:outline-none" />
        ) : (
          <span className="flex-1 text-sm text-slate-200 cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => setEditing(true)} title="Click to rename">{field.name}</span>
        )}
        <button onClick={() => onUpdate(field.id, { show_in_table: !field.show_in_table })} className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors flex-shrink-0 ${field.show_in_table ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'border-slate-800 text-slate-600 hover:border-slate-700'}`} title="Show in leads table">Table</button>
        {field.field_type === 'select' && (
          <button onClick={() => setShowOptions(o => !o)} className="text-[10px] text-violet-400 hover:text-violet-300 flex-shrink-0">{showOptions ? '▲ opts' : '▼ opts'}</button>
        )}
        <button onClick={() => onDelete(field.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-sm ml-1">✕</button>
      </div>
      {field.field_type === 'select' && showOptions && (
        <div className="mx-3 mb-2 bg-slate-900 border border-slate-700/50 rounded-lg p-3 space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Options</p>
          <div className="flex flex-wrap gap-1.5">
            {(field.options || []).map((opt, i) => (
              <span key={i} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${COLOR_MAP[opt.color]?.badgeBg || 'bg-slate-800'} ${COLOR_MAP[opt.color]?.badgeText || 'text-slate-400'} ${COLOR_MAP[opt.color]?.badgeBorder || 'border-slate-700'}`}>
                {opt.label}
                <button onClick={() => onUpdate(field.id, { options: field.options.filter((_, j) => j !== i) })} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
              </span>
            ))}
            {!(field.options?.length) && <span className="text-xs text-slate-600">No options yet</span>}
          </div>
          <div className="flex items-center gap-2">
            <ColorPicker value={newOptionColor} onChange={setNewOptionColor} />
            <input value={newOption} onChange={e => setNewOption(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOption()} placeholder="New option…"
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" />
            <button onClick={addOption} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded">Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('stages');

  const [stages, setStages] = useState<CRMStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('blue');
  const [stageError, setStageError] = useState('');

  const [fields, setFields] = useState<CRMCustomField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [fieldError, setFieldError] = useState('');

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => { loadStages(); loadFields(); loadSettings(); }, []);

  async function loadStages() {
    setStagesLoading(true);
    try { const r = await crmApi.getStages(); setStages(r.stages); }
    catch {} finally { setStagesLoading(false); }
  }
  async function loadFields() {
    setFieldsLoading(true);
    try { const r = await crmApi.getCustomFields(); setFields(r.fields); }
    catch {} finally { setFieldsLoading(false); }
  }
  async function loadSettings() {
    setSettingsLoading(true);
    try {
      const r = await crmApi.getSettings();
      const map: Record<string, string> = {};
      r.settings.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
      setSettings(map);
    } catch {} finally { setSettingsLoading(false); }
  }

  async function handleUpdateStage(id: number, data: Partial<CRMStage>) {
    setStageError('');
    try { const r = await crmApi.updateStage(id, data); setStages(p => p.map(s => s.id === id ? r.stage : s)); }
    catch (e: unknown) { setStageError((e as Error).message || 'Failed to update'); }
  }
  async function handleDeleteStage(id: number) {
    setStageError('');
    try { await crmApi.deleteStage(id); setStages(p => p.filter(s => s.id !== id)); }
    catch (e: unknown) { setStageError((e as Error).message || 'Failed to delete'); }
  }
  async function handleMoveStage(id: number, dir: 'up' | 'down') {
    const sorted = [...stages].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(s => s.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === sorted.length - 1) return;
    const si = dir === 'up' ? idx - 1 : idx + 1;
    const newOrder = sorted.map((s, i) => {
      if (i === idx) return { id: s.id, sort_order: sorted[si].sort_order };
      if (i === si)  return { id: s.id, sort_order: sorted[idx].sort_order };
      return { id: s.id, sort_order: s.sort_order };
    });
    setStages(p => p.map(s => { const o = newOrder.find(n => n.id === s.id); return o ? { ...s, sort_order: o.sort_order } : s; }));
    try { await crmApi.reorderStages(newOrder); } catch { loadStages(); }
  }
  async function handleAddStage(e: React.FormEvent) {
    e.preventDefault(); setStageError('');
    if (!newStageName.trim()) return;
    try {
      const r = await crmApi.createStage({ name: newStageName.trim(), color: newStageColor });
      setStages(p => [...p, r.stage]); setNewStageName(''); setNewStageColor('blue');
    } catch (e: unknown) { setStageError((e as Error).message || 'Failed to create'); }
  }

  async function handleUpdateField(id: number, data: Partial<CRMCustomField>) {
    try { const r = await crmApi.updateCustomField(id, data); setFields(p => p.map(f => f.id === id ? r.field : f)); }
    catch { setFieldError('Failed to update field'); }
  }
  async function handleDeleteField(id: number) {
    setFieldError('');
    try { await crmApi.deleteCustomField(id); setFields(p => p.filter(f => f.id !== id)); }
    catch { setFieldError('Failed to delete field'); }
  }
  async function handleMoveField(id: number, dir: 'up' | 'down') {
    const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(f => f.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === sorted.length - 1) return;
    const si = dir === 'up' ? idx - 1 : idx + 1;
    await Promise.all([
      crmApi.updateCustomField(sorted[idx].id, { sort_order: sorted[si].sort_order }),
      crmApi.updateCustomField(sorted[si].id, { sort_order: sorted[idx].sort_order }),
    ]);
    loadFields();
  }
  async function handleAddField(e: React.FormEvent) {
    e.preventDefault(); setFieldError('');
    if (!newFieldName.trim()) return;
    try {
      const r = await crmApi.createCustomField({ name: newFieldName.trim(), field_type: newFieldType });
      setFields(p => [...p, r.field]); setNewFieldName(''); setNewFieldType('text');
    } catch { setFieldError('Failed to create field'); }
  }

  async function handleSaveSettings() {
    setSettingsSaving(true);
    try { await crmApi.updateSettings(settings); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000); }
    catch {} finally { setSettingsSaving(false); }
  }

  const sortedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order);
  const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-100">CRM Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Customise your pipeline, fields, and preferences</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {(['stages', 'fields', 'general'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
            {t === 'stages' ? 'Pipeline Stages' : t === 'fields' ? 'Custom Fields' : 'General'}
          </button>
        ))}
      </div>

      {/* ── Pipeline Stages ── */}
      {tab === 'stages' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2">
            Click a <span className="text-slate-300">name</span> to rename it. Click the <span className="text-slate-300">colour dot</span> to change colour. Mark stages as <span className="text-emerald-400">Won</span> or <span className="text-red-400">Lost</span> for reporting. The <code className="text-slate-500">slug</code> is stored on each lead and cannot be changed after creation.
          </p>
          {stageError && <div className="text-xs px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">{stageError}</div>}
          {stagesLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" /></div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {sortedStages.map((stage, i) => (
                <StageRow key={stage.id} stage={stage} isFirst={i === 0} isLast={i === sortedStages.length - 1}
                  onUpdate={handleUpdateStage} onDelete={handleDeleteStage}
                  onMoveUp={id => handleMoveStage(id, 'up')} onMoveDown={id => handleMoveStage(id, 'down')} />
              ))}
              <div className="border-t border-slate-800 p-3">
                <form onSubmit={handleAddStage} className="flex items-center gap-2">
                  <ColorPicker value={newStageColor} onChange={setNewStageColor} />
                  <input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="New stage name…"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600" />
                  <button type="submit" disabled={!newStageName.trim()} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">Add Stage</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Custom Fields ── */}
      {tab === 'fields' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2">
            Custom fields appear on every lead. Click a <span className="text-slate-300">name</span> to rename it. Toggle <span className="text-slate-300">Table</span> to show/hide as a column in the leads grid. For Select fields, expand <span className="text-violet-400">opts</span> to manage options with colours.
          </p>
          {fieldError && <div className="text-xs px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">{fieldError}</div>}
          {fieldsLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" /></div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {sortedFields.length === 0 && <p className="text-center py-6 text-slate-600 text-sm">No custom fields yet - add one below</p>}
              {sortedFields.map((field, i) => (
                <FieldRow key={field.id} field={field} isFirst={i === 0} isLast={i === sortedFields.length - 1}
                  onUpdate={handleUpdateField} onDelete={handleDeleteField}
                  onMoveUp={id => handleMoveField(id, 'up')} onMoveDown={id => handleMoveField(id, 'down')} />
              ))}
              <div className="border-t border-slate-800 p-3">
                <form onSubmit={handleAddField} className="flex items-center gap-2">
                  <input value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="Field name…"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600" />
                  <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as FieldType)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:outline-none">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Select</option>
                    <option value="date">Date</option>
                    <option value="checkbox">Yes/No</option>
                    <option value="url">URL</option>
                  </select>
                  <button type="submit" disabled={!newFieldName.trim()} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">Add Field</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── General ── */}
      {tab === 'general' && (
        <div className="space-y-4">
          {settingsLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" /></div>
          ) : (
            <>
              {[
                { key: 'auto_mode_threshold', label: 'Auto-Mode Accuracy Threshold (%)', desc: 'AI goes autonomous once learning accuracy reaches this %', type: 'number' },
                { key: 'default_chaser_days', label: 'Default Chaser Schedule (days)', desc: 'JSON array of days after initial email, e.g. [3, 7, 14]', type: 'text' },
                { key: 'ai_provider', label: 'AI Provider', desc: 'Provider to use for email generation', type: 'text' },
                { key: 'ai_model', label: 'AI Model', desc: 'Model name, e.g. gpt-4o-mini, gpt-4o', type: 'text' },
              ].map(({ key, label, desc, type }) => (
                <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-200 mb-0.5">{label}</label>
                  <p className="text-xs text-slate-500 mb-2">{desc}</p>
                  <input type={type} value={settings[key] || ''} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-500" />
                </div>
              ))}

              {/* Email Signature */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <label className="block text-sm font-medium text-slate-200 mb-0.5">Email Signature</label>
                <p className="text-xs text-slate-500 mb-2">Appended to every outgoing CRM email. Plain text or HTML accepted.</p>
                <textarea
                  value={settings['email_signature'] || ''}
                  onChange={e => setSettings(s => ({ ...s, email_signature: e.target.value }))}
                  rows={6}
                  placeholder={`Kind regards,\nPierce Shapton\nProper Place\n\nwww.proper-place.co.uk`}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-500 resize-y placeholder:text-slate-600"
                />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleSaveSettings} disabled={settingsSaving} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg">
                  {settingsSaving ? 'Saving…' : 'Save Settings'}
                </button>
                {settingsSaved && <span className="text-xs text-emerald-400">✓ Saved</span>}
              </div>

              {/* Sample booking email previews */}
              <SampleBookingEmailsPanel />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SampleBookingEmailsPanel() {
  const [email, setEmail] = useState('pierce.shapton@nookparcelbox.com');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async () => {
    setSending(true);
    setMsg(null);
    try {
      const res = await adminApi.sendSampleBookingEmails(email.trim());
      const failed = res.results.filter(r => !r.ok);
      if (failed.length) {
        setMsg({ ok: false, text: `${res.message}. Failed: ${failed.map(f => `${f.label} (${f.error})`).join(', ')}` });
      } else {
        setMsg({ ok: true, text: res.message });
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Failed to send' });
    }
    setSending(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-0.5">Preview booking emails</label>
        <p className="text-xs text-slate-500 mb-2">Sends one of each booking template (new request, submitted, confirmed, rejected, cancelled) to the address below.</p>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={send}
          disabled={sending || !email.trim()}
          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
        >
          {sending ? 'Sending…' : 'Send 5 samples'}
        </button>
      </div>
      {msg && (
        <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
      )}
    </div>
  );
}
