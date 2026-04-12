'use client';

import { useEffect, useState } from 'react';
import { autoMessagesApi, ApiError } from '@/lib/api';

interface AutoMessage {
  id: number;
  trigger: string;
  template: string;
  is_active: boolean;
}

const TRIGGERS = [
  { value: 'booking_confirmed', label: 'Booking Confirmed', desc: 'Sent when you approve a booking' },
  { value: 'booking_rejected', label: 'Booking Rejected', desc: 'Sent when you reject a booking' },
  { value: 'check_in_reminder', label: 'Check-in Reminder', desc: 'Sent before the guest checks in' },
  { value: 'check_out_reminder', label: 'Check-out Reminder', desc: 'Sent before the guest checks out' },
  { value: 'welcome', label: 'Welcome Message', desc: 'Sent when a new booking arrives' },
  { value: 'review_request', label: 'Review Request', desc: 'Sent after a guest checks out' },
];

export default function AutoMessagesPage() {
  const [messages, setMessages] = useState<AutoMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AutoMessage | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newForm, setNewForm] = useState({ trigger: 'booking_confirmed', template: '' });

  const load = async () => {
    try {
      const data = await autoMessagesApi.list();
      setMessages((data as { autoMessages?: AutoMessage[] }).autoMessages || data as unknown as AutoMessage[]);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newForm.template.trim()) return;
    setError(''); setSuccess('');
    try {
      await autoMessagesApi.create({ trigger: newForm.trigger, template: newForm.template });
      setNewForm({ trigger: 'booking_confirmed', template: '' });
      setCreating(false);
      setSuccess('Auto-message created!');
      load();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to create'); }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setError(''); setSuccess('');
    try {
      await autoMessagesApi.update(editing.id, { template: editing.template, is_active: editing.is_active });
      setEditing(null);
      setSuccess('Auto-message updated!');
      load();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to update'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this auto-message?')) return;
    try { await autoMessagesApi.delete(id); load(); } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to delete'); }
  };

  const handleToggle = async (msg: AutoMessage) => {
    try {
      await autoMessagesApi.update(msg.id, { is_active: !msg.is_active });
      load();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed'); }
  };

  const getTriggerLabel = (t: string) => TRIGGERS.find(tr => tr.value === t)?.label || t;

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auto-Messages</h1>
          <p className="text-gray-500">Set up automatic messages for booking events.</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="btn-primary text-sm py-2 px-4">+ New Auto-Message</button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {creating && (
        <div className="card bg-white p-6 space-y-4 border-2 border-light-blue">
          <h2 className="font-semibold text-gray-900">New Auto-Message</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
            <select value={newForm.trigger} onChange={e => setNewForm(f => ({ ...f, trigger: e.target.value }))} className="bg-white border-gray-300 text-gray-900">
              {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message Template</label>
            <textarea value={newForm.template} onChange={e => setNewForm(f => ({ ...f, template: e.target.value }))} rows={4} placeholder="Hi {guest_name}, your booking at {place_name} has been confirmed!..." className="bg-white border-gray-300 text-gray-900" />
            <p className="text-xs text-gray-400 mt-1">Variables: {'{guest_name}'}, {'{place_name}'}, {'{check_in}'}, {'{check_out}'}, {'{total}'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-primary text-sm py-2 px-4">Create</button>
            <button onClick={() => setCreating(false)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
          </div>
        </div>
      )}

      {messages.length === 0 && !creating ? (
        <div className="text-center py-16 card bg-white">
          <p className="text-4xl mb-3">🤖</p>
          <p className="text-gray-500 mb-2">No auto-messages configured.</p>
          <p className="text-sm text-gray-400">Set up automatic messages to save time responding to booking events.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className="card bg-white p-5">
              {editing?.id === msg.id ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{getTriggerLabel(msg.trigger)}</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-gray-500">Active</span>
                      <input type="checkbox" checked={editing.is_active} onChange={e => setEditing(prev => prev ? { ...prev, is_active: e.target.checked } : null)} className="rounded" />
                    </label>
                  </div>
                  <textarea value={editing.template} onChange={e => setEditing(prev => prev ? { ...prev, template: e.target.value } : null)} rows={3} className="bg-white border-gray-300 text-gray-900" />
                  <div className="flex gap-2">
                    <button onClick={handleUpdate} className="btn-primary text-sm py-1.5 px-4">Save</button>
                    <button onClick={() => setEditing(null)} className="btn-secondary text-sm py-1.5 px-4">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{getTriggerLabel(msg.trigger)}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${msg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {msg.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-2">{msg.template}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleToggle(msg)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${msg.is_active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      {msg.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => setEditing({ ...msg })} className="text-xs text-light-blue hover:underline py-1.5">Edit</button>
                    <button onClick={() => handleDelete(msg.id)} className="text-xs text-red-500 hover:underline py-1.5">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
