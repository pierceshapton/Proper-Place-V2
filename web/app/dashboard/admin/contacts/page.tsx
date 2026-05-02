'use client';

import { useEffect, useRef, useState } from 'react';
import { contactsApi, ApiError, type Contact, type ContactReply } from '@/lib/api';

type ContactWithReplies = Contact & { replies: ContactReply[] };

function statusGroup(status: string): 'open' | 'in_progress' | 'resolved' {
  if (['new', 'read', 'open'].includes(status)) return 'open';
  if (status === 'in_progress') return 'in_progress';
  return 'resolved';
}

function statusLabel(status: string) {
  switch (statusGroup(status)) {
    case 'open': return 'Open';
    case 'in_progress': return 'In Progress';
    default: return 'Resolved';
  }
}

function statusColor(status: string) {
  switch (statusGroup(status)) {
    case 'open': return 'bg-blue-100 text-blue-700';
    case 'in_progress': return 'bg-amber-100 text-amber-700';
    default: return 'bg-green-100 text-green-700';
  }
}

function urgencyBadge(urgency?: string, score?: number) {
  const high = urgency === 'high' || (score || 0) > 70;
  const medium = !high && (urgency === 'medium' || (score || 0) > 40);
  if (high) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">urgent</span>;
  if (medium) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">medium</span>;
  return null;
}

function initials(name?: string, email?: string) {
  const src = name || email || '?';
  return src.split(/[\s@]/).map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function Avatar({ name, email, size = 9 }: { name?: string; email?: string; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0`;
  const fontSize = size <= 7 ? 'text-xs' : 'text-sm';
  return <div className={`${cls} ${fontSize}`}>{initials(name, email)}</div>;
}

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [actionErr, setActionErr] = useState('');

  // Panel
  const [selectedTicket, setSelectedTicket] = useState<ContactWithReplies | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyErr, setReplyErr] = useState('');
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const threadBottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const data = await contactsApi.list({ status: 'all' });
      setContacts(data.contacts || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.replies?.length]);

  const openTicket = async (id: number) => {
    setLoadingDetail(true);
    setReplyText('');
    setReplyErr('');
    try {
      const data = await contactsApi.get(id);
      setSelectedTicket(data.contact as ContactWithReplies);
      load();
    } catch { /* empty */ }
    setLoadingDetail(false);
    setTimeout(() => replyRef.current?.focus(), 150);
  };

  const closePanel = () => {
    setSelectedTicket(null);
    setReplyText('');
    setReplyErr('');
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyText.trim() || replySending) return;
    setReplySending(true);
    setReplyErr('');
    try {
      const data = await contactsApi.reply(selectedTicket.id, replyText.trim());
      setSelectedTicket(prev =>
        prev ? { ...prev, status: data.status || prev.status, replies: [...(prev.replies || []), data.reply] } : prev
      );
      setReplyText('');
      load();
    } catch (err) {
      setReplyErr(err instanceof ApiError ? err.message : 'Failed to send reply');
    }
    setReplySending(false);
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    setActionErr('');
    try {
      await contactsApi.update(id, { status });
      load();
      if (selectedTicket?.id === id) {
        setSelectedTicket(prev => prev ? { ...prev, status } : prev);
      }
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  };

  const filtered = contacts.filter(c =>
    filter === 'all' ? true : statusGroup(c.status) === filter
  );

  const tabs = [
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'all', label: 'All' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-gray-500 text-sm mt-1">{contacts.length} total · click any ticket to open</p>
      </div>

      {actionErr && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{actionErr}</div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => {
          const count = t.key === 'all'
            ? contacts.length
            : contacts.filter(c => statusGroup(c.status) === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === t.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-4xl mb-3">📬</p>
          <p className="text-gray-500">{filter === 'open' ? 'No open tickets!' : 'No tickets found.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => openTicket(c.id)}
              className={`w-full text-left bg-white rounded-xl border transition-all shadow-sm p-4 hover:shadow-md hover:border-blue-200 ${selectedTicket?.id === c.id ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'}`}
            >
              <div className="flex items-start gap-3">
                <Avatar name={c.name || c.user?.name} email={c.email || c.user_email} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{c.subject || 'No Subject'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                    {urgencyBadge(c.urgency, c.urgency_score)}
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c.category}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    {c.name || c.user?.name || 'Anonymous'} &middot; {c.email || c.user_email}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">{c.message}</p>
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Backdrop */}
      {(selectedTicket || loadingDetail) && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={closePanel} />
      )}

      {/* Help desk slide-over */}
      {(selectedTicket || loadingDetail) && (
        <div className="fixed top-0 right-0 h-full w-full sm:w-[540px] bg-white shadow-2xl z-50 flex flex-col">
          {loadingDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : selectedTicket ? (
            <>
              {/* Header */}
              <div className="flex items-start gap-3 p-4 border-b border-gray-200 bg-gray-50 shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(selectedTicket.status)}`}>
                      {statusLabel(selectedTicket.status)}
                    </span>
                    <span className="text-xs text-gray-400">#{selectedTicket.id}</span>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{selectedTicket.category}</span>
                    {urgencyBadge(selectedTicket.urgency, selectedTicket.urgency_score)}
                  </div>
                  <h2 className="font-bold text-gray-900 leading-snug text-base">{selectedTicket.subject}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Avatar name={selectedTicket.name || selectedTicket.user?.name} email={selectedTicket.email || selectedTicket.user_email} size={6} />
                    <span className="text-sm text-gray-700 font-medium truncate">
                      {selectedTicket.name || selectedTicket.user?.name || 'Anonymous'}
                    </span>
                    <span className="text-sm text-gray-400 truncate">{selectedTicket.email || selectedTicket.user_email}</span>
                  </div>
                </div>
                <button
                  onClick={closePanel}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors shrink-0 mt-0.5"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status bar */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
                <span className="text-xs text-gray-500">Move to:</span>
                {statusGroup(selectedTicket.status) !== 'in_progress' && statusGroup(selectedTicket.status) !== 'resolved' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedTicket.id, 'in_progress')}
                    className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-1 font-medium transition-colors"
                  >
                    In Progress
                  </button>
                )}
                {statusGroup(selectedTicket.status) !== 'resolved' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedTicket.id, 'resolved')}
                    className="text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg px-3 py-1 font-medium transition-colors"
                  >
                    Resolve
                  </button>
                )}
                {statusGroup(selectedTicket.status) === 'resolved' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedTicket.id, 'open')}
                    className="text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-1 font-medium transition-colors"
                  >
                    Reopen
                  </button>
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  {selectedTicket.created_at
                    ? new Date(selectedTicket.created_at).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>

              {/* Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Original message */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar name={selectedTicket.name || selectedTicket.user?.name} email={selectedTicket.email || selectedTicket.user_email} size={6} />
                    <span className="text-xs font-semibold text-gray-700">
                      {selectedTicket.name || selectedTicket.user?.name || 'User'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {selectedTicket.created_at
                        ? new Date(selectedTicket.created_at).toLocaleString('en-GB', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>
                  <div className="ml-8 bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedTicket.message}</p>
                  </div>
                </div>

                {/* Replies */}
                {(selectedTicket.replies || []).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No replies yet — respond below.</p>
                )}
                {(selectedTicket.replies || []).map(reply => (
                  <div key={reply.id} className="flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-gray-400">
                        {reply.created_at
                          ? new Date(reply.created_at).toLocaleString('en-GB', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                            })
                          : ''}
                      </span>
                      <span className="text-xs font-semibold text-gray-700">{reply.admin_name || 'Support'}</span>
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        PP
                      </div>
                    </div>
                    <div className="mr-8 bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[88%]">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{reply.body}</p>
                    </div>
                    {reply.sent_email && (
                      <span className="text-[11px] text-gray-400 mt-1 mr-8">✓ Email sent to user</span>
                    )}
                    {reply.sent_email === false && (
                      <span className="text-[11px] text-amber-500 mt-1 mr-8">⚠ Email not sent</span>
                    )}
                  </div>
                ))}
                <div ref={threadBottomRef} />
              </div>

              {/* Reply box */}
              <div className="border-t border-gray-200 p-4 bg-white shrink-0">
                {replyErr && <p className="text-red-500 text-xs mb-2">{replyErr}</p>}
                <textarea
                  ref={replyRef}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your reply… an email is sent to the user automatically"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply();
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">⌘↵ to send</span>
                  <button
                    onClick={sendReply}
                    disabled={!replyText.trim() || replySending}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                  >
                    {replySending ? 'Sending…' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}


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
