'use client';

import { useEffect, useState } from 'react';
import { autoMessagesApi, placesApi, type AutoMessageTemplate, type Place } from '@/lib/api';

const TRIGGERS = [
  { type: 'on_booking', label: 'When Booking is Made', desc: 'Sent immediately after a guest books your site.', icon: '📅', defaultMsg: 'Thank you for booking! We look forward to hosting you.' },
  { type: '24h_before_checkin', label: '24 Hours Before Check-in', desc: 'Sent 24 hours before the guest\'s check-in date.', icon: '⏰', defaultMsg: 'Reminder: Your stay begins tomorrow. See you soon!' },
  { type: '1h_before_arrival', label: '1 Hour Before Arrival', desc: 'Sent 1 hour before the estimated arrival time.', icon: '🚐', defaultMsg: 'Almost here! Let us know if you need any help finding us.' },
  { type: 'at_checkout', label: 'At Checkout', desc: 'Sent when checkout time arrives.', icon: '👋', defaultMsg: 'Thank you for visiting! We hope you enjoyed your stay. Safe travels!' },
];

interface TemplateState {
  trigger_type: string;
  message_content: string;
  enabled: boolean;
}

export default function AutoMessagesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<TemplateState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load host's places
  useEffect(() => {
    placesApi.myPlaces()
      .then(data => {
        const approved = (data.places || []).filter(p => p.status === 'approved');
        setPlaces(approved);
        if (approved.length > 0) setSelectedPlaceId(approved[0].id);
      })
      .catch(() => setError('Failed to load your places'))
      .finally(() => setLoading(false));
  }, []);

  // Load templates when place changes
  useEffect(() => {
    if (!selectedPlaceId) return;
    setLoading(true);
    autoMessagesApi.getTemplates(selectedPlaceId)
      .then(data => {
        const existing = data.templates || [];
        const merged = TRIGGERS.map(t => {
          const saved = existing.find((e: AutoMessageTemplate) => e.trigger_type === t.type);
          return {
            trigger_type: t.type,
            message_content: saved?.message_content || '',
            enabled: saved?.enabled ?? false,
          };
        });
        setTemplates(merged);
      })
      .catch(() => {
        setTemplates(TRIGGERS.map(t => ({ trigger_type: t.type, message_content: '', enabled: false })));
      })
      .finally(() => setLoading(false));
  }, [selectedPlaceId]);

  const updateTemplate = (triggerType: string, field: 'message_content' | 'enabled', value: string | boolean) => {
    setTemplates(prev => prev.map(t =>
      t.trigger_type === triggerType ? { ...t, [field]: value } : t
    ));
  };

  const handleSave = async () => {
    if (!selectedPlaceId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await autoMessagesApi.saveTemplates(selectedPlaceId, templates);
      const saved = result.templates || [];
      const merged = TRIGGERS.map(t => {
        const s = saved.find((e: AutoMessageTemplate) => e.trigger_type === t.type);
        return {
          trigger_type: t.type,
          message_content: s?.message_content || '',
          enabled: s?.enabled ?? false,
        };
      });
      setTemplates(merged);
      setSuccess('Auto-messages saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to save auto-messages');
    }
    setSaving(false);
  };

  const useDefault = (triggerType: string) => {
    const trigger = TRIGGERS.find(t => t.type === triggerType);
    if (trigger) updateTemplate(triggerType, 'message_content', trigger.defaultMsg);
  };

  if (loading && places.length === 0) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;
  }

  if (places.length === 0) {
    return (
      <div className="text-center py-16 card bg-white">
        <p className="text-4xl mb-3">🏕️</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No approved places</h2>
        <p className="text-gray-500">You need at least one approved place to set up auto-messages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auto-Messages</h1>
        <p className="text-gray-500 mt-1">Set up automatic messages that are sent to guests at key moments during their booking.</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Place selector */}
      {places.length > 1 && (
        <div className="card bg-white p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Place</label>
          <select
            value={selectedPlaceId || ''}
            onChange={e => setSelectedPlaceId(Number(e.target.value))}
            className="bg-white border-gray-300 text-gray-900 rounded-lg"
          >
            {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {places.length === 1 && (
        <div className="card bg-white p-4 flex items-center gap-3">
          <span className="text-xl">📍</span>
          <span className="font-medium text-gray-900">{places[0].name}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-light-blue"></div></div>
      ) : (
        <>
          <div className="space-y-4">
            {TRIGGERS.map(trigger => {
              const t = templates.find(tp => tp.trigger_type === trigger.type);
              if (!t) return null;
              return (
                <div key={trigger.type} className={`card bg-white p-5 border-l-4 transition-colors ${t.enabled ? 'border-l-green-500' : 'border-l-gray-200'}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{trigger.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{trigger.label}</h3>
                        <p className="text-sm text-gray-500">{trigger.desc}</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <span className={`text-xs font-medium ${t.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                        {t.enabled ? 'On' : 'Off'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={t.enabled}
                        onClick={() => updateTemplate(trigger.type, 'enabled', !t.enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${t.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${t.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <textarea
                      value={t.message_content}
                      onChange={e => updateTemplate(trigger.type, 'message_content', e.target.value)}
                      rows={3}
                      placeholder={trigger.defaultMsg}
                      className="bg-white border-gray-300 text-gray-900 rounded-lg text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">Variables: {'{guest_name}'}, {'{place_name}'}, {'{check_in}'}, {'{check_out}'}</p>
                      {!t.message_content && (
                        <button onClick={() => useDefault(trigger.type)} className="text-xs text-light-blue hover:underline">
                          Use default message
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary py-2.5 px-8 text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Auto-Messages'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
