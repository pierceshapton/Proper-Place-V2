'use client';

import { useEffect, useState } from 'react';
import { contactsApi, ApiError, type Contact } from '@/lib/api';

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [actionErr, setActionErr] = useState('');

  const load = async () => {
    try {
      const data = await contactsApi.list();
      setContacts(data.contacts || data as unknown as Contact[]);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStatusUpdate = async (id: number, status: string) => {
    setActionErr('');
    try { await contactsApi.update(id, { status }); load(); } catch (err) { setActionErr(err instanceof ApiError ? err.message : 'Failed'); }
  };

  const filtered = filter === 'all' ? contacts : contacts.filter(c => c.status === filter);
  const tabs = ['open', 'in_progress', 'resolved', 'all'];

  const urgencyColor = (u: string) => {
    switch (u) { case 'high': return 'bg-red-100 text-red-700'; case 'medium': return 'bg-yellow-100 text-yellow-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  const statusColor = (s: string) => {
    switch (s) { case 'open': return 'bg-blue-100 text-blue-700'; case 'in_progress': return 'bg-yellow-100 text-yellow-700'; case 'resolved': return 'bg-green-100 text-green-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
      <p className="text-gray-500">{contacts.length} total contacts</p>

      {actionErr && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{actionErr}</div>}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => {
          const label = t === 'in_progress' ? 'In Progress' : t.charAt(0).toUpperCase() + t.slice(1);
          const count = t === 'all' ? contacts.length : contacts.filter(c => c.status === t).length;
          return (
            <button key={t} onClick={() => setFilter(t)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === t ? 'bg-light-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 card bg-white">
          <p className="text-4xl mb-3">📬</p>
          <p className="text-gray-500">{filter === 'open' ? 'No open tickets!' : 'No tickets found.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="card bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{c.subject || 'No Subject'}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.status)}`}>{c.status?.replace('_', ' ')}</span>
                    {c.urgency && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyColor(c.urgency)}`}>{c.urgency}</span>}
                    {!c.urgency && c.urgency_score !== undefined && c.urgency_score > 7 && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">high</span>}
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c.category || 'general'}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">
                    From: <span className="font-medium text-gray-700">{c.name || c.user?.name || 'Unknown'}</span>
                    {(c.email || c.user_email) && <span className="text-gray-400 ml-1">({c.email || c.user_email})</span>}
                  </p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">{c.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {c.status === 'open' && (
                    <button onClick={() => handleStatusUpdate(c.id, 'in_progress')} className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg text-sm py-1.5 px-3 font-medium transition-colors">In Progress</button>
                  )}
                  {(c.status === 'open' || c.status === 'in_progress') && (
                    <button onClick={() => handleStatusUpdate(c.id, 'resolved')} className="bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm py-1.5 px-3 font-medium transition-colors">Resolve</button>
                  )}
                  {c.status === 'resolved' && (
                    <button onClick={() => handleStatusUpdate(c.id, 'open')} className="bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg text-sm py-1.5 px-3 font-medium transition-colors">Reopen</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
