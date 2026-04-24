'use client';

import { useEffect, useState } from 'react';
import { crmApi, type CRMEmailTemplate } from '@/lib/api';
import { mergeTemplate } from '@/lib/crmEmailDraft';
import type { CRMLead } from '@/lib/api';

// Sample lead used for template preview
const PREVIEW_LEAD: Partial<CRMLead> = {
  id: 0,
  first_name: 'Sarah',
  last_name: 'Mitchell',
  business_name: 'The Crown Inn',
  location: 'Cotswolds',
  property_type: 'Pub',
  email: 'sarah@thecrowninn.co.uk',
  website: 'https://thecrowninn.co.uk',
  source: 'Google Maps',
  parking_spaces: 8,
  parking_type: 'private car park',
  google_rating: 4.7,
  google_reviews_count: 182,
};

function OutlookPreview({
  subject,
  body,
  signature,
}: {
  subject: string;
  body: string;
  signature: string;
}) {
  const mergedSubject = mergeTemplate(subject, PREVIEW_LEAD as CRMLead);
  const mergedBody = mergeTemplate(body, PREVIEW_LEAD as CRMLead);
  const isHtmlBody = mergedBody.includes('<');
  const isHtmlSig = signature.includes('<');

  // Build the full HTML that would actually be sent
  const bodyHtml = isHtmlBody
    ? mergedBody
    : mergedBody.split('\n').map(l => l ? `<p style="margin:0 0 12px 0">${l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>` : '<p style="margin:0 0 12px 0">&nbsp;</p>').join('');

  const sigHtml = signature
    ? isHtmlSig
      ? signature
      : signature.split('\n').map(l => l ? `<span>${l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>` : '<span>&nbsp;</span>').join('<br/>')
    : '';

  const fullHtml = `
    <div style="font-family:Calibri,'Segoe UI',Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;">
      ${bodyHtml}
      ${sigHtml ? `<div style="border-top:1px solid #e1e1e1;margin-top:16px;padding-top:12px;color:#444;font-size:13px;">${sigHtml}</div>` : ''}
    </div>
  `;

  return (
    <div className="rounded-lg overflow-hidden border border-[#d1d1d1] shadow-sm bg-[#f3f2f1]">
      {/* Outlook-style window chrome */}
      <div className="bg-[#0078d4] px-3 py-1.5 flex items-center gap-2">
        <span className="text-white text-xs font-semibold tracking-wide">New Message</span>
        <div className="ml-auto flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Toolbar strip */}
      <div className="bg-[#f3f2f1] border-b border-[#d1d1d1] px-3 py-1 flex gap-3">
        {['Send', 'Discard', 'Attach', 'Signature'].map(label => (
          <button key={label} type="button" tabIndex={-1}
            className="text-[11px] text-[#323130] px-2 py-0.5 rounded hover:bg-[#e1dfdd] transition-colors cursor-default">
            {label}
          </button>
        ))}
      </div>

      {/* Header fields */}
      <div className="bg-white border-b border-[#e1e1e1]">
        <div className="flex items-center border-b border-[#eeeeee] px-4 py-2">
          <span className="text-[12px] text-[#605e5c] w-14 flex-shrink-0">From</span>
          <span className="text-[13px] text-[#323130]">Pierce Shapton &lt;pierce.shapton@proper-place.co.uk&gt;</span>
        </div>
        <div className="flex items-center border-b border-[#eeeeee] px-4 py-2">
          <span className="text-[12px] text-[#605e5c] w-14 flex-shrink-0">To</span>
          <span className="text-[13px] text-[#323130]">Sarah Mitchell &lt;sarah@thecrowninn.co.uk&gt;</span>
        </div>
        <div className="flex items-center px-4 py-2">
          <span className="text-[12px] text-[#605e5c] w-14 flex-shrink-0">Subject</span>
          <span className="text-[13px] font-semibold text-[#323130]">
            {mergedSubject || <span className="text-[#a19f9d] font-normal">No subject</span>}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="bg-white min-h-[180px] max-h-96 overflow-y-auto px-5 py-4"
        dangerouslySetInnerHTML={{ __html: fullHtml }}
      />

      {/* Status bar */}
      <div className="bg-[#f3f2f1] border-t border-[#d1d1d1] px-3 py-1 flex items-center gap-3">
        <span className="text-[10px] text-[#605e5c]">Preview only — sample data used</span>
        <span className="ml-auto text-[10px] text-[#605e5c]">Sarah Mitchell · The Crown Inn · Cotswolds</span>
      </div>
    </div>
  );
}

export default function EmailsPage() {
  const [templates, setTemplates] = useState<CRMEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '', template_type: 'outreach' });
  const [showPreview, setShowPreview] = useState(false);
  const [signature, setSignature] = useState('');

  useEffect(() => {
    loadTemplates();
    crmApi.getSettings().then(r => {
      const sig = r.settings.find((s: { key: string; value: string }) => s.key === 'email_signature');
      if (sig) setSignature(sig.value);
    }).catch(() => {});
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await crmApi.getTemplates();
      setTemplates(res.templates);
    } catch {} finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      await crmApi.updateTemplate(editingId, form);
    } else {
      await crmApi.createTemplate(form);
    }
    setShowAdd(false);
    setEditingId(null);
    setShowPreview(false);
    setForm({ name: '', subject: '', body: '', template_type: 'outreach' });
    loadTemplates();
  }

  function startEdit(t: CRMEmailTemplate) {
    setEditingId(t.id);
    setForm({ name: t.name, subject: t.subject, body: t.body, template_type: t.template_type || 'outreach' });
    setShowPreview(false);
    setShowAdd(true);
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this template?')) return;
    await crmApi.deleteTemplate(id);
    loadTemplates();
  }

  const mergeFields = ['{{first_name}}', '{{last_name}}', '{{business_name}}', '{{location}}', '{{property_type}}'];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Email Templates</h1>
        <button onClick={() => { setShowAdd(true); setEditingId(null); setShowPreview(false); setForm({ name: '', subject: '', body: '', template_type: 'outreach' }); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
          + New Template
        </button>
      </div>

      {/* Merge fields reference */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Available merge fields</p>
        <div className="flex flex-wrap gap-1.5">
          {mergeFields.map(f => (
            <code key={f} className="text-[11px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-mono">{f}</code>
          ))}
        </div>
      </div>

      {/* Form */}
      {showAdd && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-400">{editingId ? 'Edit Template' : 'New Template'}</h3>
            <div className="flex gap-0.5 bg-slate-800 rounded-lg p-0.5">
              <button type="button" onClick={() => setShowPreview(false)}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${!showPreview ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
                Edit
              </button>
              <button type="button" onClick={() => setShowPreview(true)}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${showPreview ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
                Preview
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Template Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                placeholder="Initial Outreach - Pubs" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select value={form.template_type} onChange={e => setForm(f => ({ ...f, template_type: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                <option value="outreach">Outreach</option>
                <option value="follow_up">Follow Up</option>
                <option value="chaser">Chaser</option>
                <option value="onboarding">Onboarding</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Subject Line</label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              placeholder="Motorhome parking opportunity for {{business_name}}" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Body (HTML supported)</label>
            {showPreview ? (
              <OutlookPreview
                subject={form.subject}
                body={form.body}
                signature={signature}
              />
            ) : (
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                rows={10}
                placeholder={`Hi {{first_name}},\n\nI noticed {{business_name}} in {{location}} has a fantastic setting...\n\nWould you be open to a quick chat about how this works?`} />
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
              {editingId ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {/* Template list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-600 text-sm">No templates yet — create your first one to speed up outreach</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 group">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-200">{t.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                      {(t.template_type || 'outreach').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Subject: {t.subject}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(t)} className="text-xs text-slate-500 hover:text-emerald-400">Edit</button>
                  <button onClick={() => handleDelete(t.id)} className="text-xs text-slate-500 hover:text-red-400">Delete</button>
                </div>
              </div>
              <div className="mt-3 bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono">{t.body}</pre>
              </div>
              {t.usage_count !== undefined && (
                <p className="text-[10px] text-slate-600 mt-2">Used {t.usage_count} time{t.usage_count === 1 ? '' : 's'}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
