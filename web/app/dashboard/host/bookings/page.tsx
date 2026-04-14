'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { bookingsApi, ApiError, type Booking } from '@/lib/api';
import ReasonModal from '@/components/ReasonModal';

type ViewMode = 'list' | 'calendar';

function CalendarView({ bookings }: { bookings: Booking[] }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const year = month.getFullYear();
  const mo = month.getMonth();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const firstDow = new Date(year, mo, 1).getDay(); // 0=Sun
  const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Mon=0

  const prev = () => setMonth(new Date(year, mo - 1, 1));
  const next = () => setMonth(new Date(year, mo + 1, 1));
  const today = () => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-200 text-yellow-800 border-yellow-300',
    confirmed: 'bg-green-200 text-green-800 border-green-300',
    completed: 'bg-blue-200 text-blue-800 border-blue-300',
    cancelled: 'bg-red-200 text-red-800 border-red-300',
  };

  // Build a map: day number -> bookings that overlap that day
  const dayBookings: Record<number, Booking[]> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, mo, d);
    dayBookings[d] = bookings.filter(b => {
      const ci = new Date(b.check_in_date || b.check_in);
      const co = new Date(b.check_out_date || b.check_out);
      ci.setHours(0, 0, 0, 0);
      co.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date >= ci && date <= co;
    });
  }

  const todayDate = new Date();
  const isToday = (d: number) => d === todayDate.getDate() && mo === todayDate.getMonth() && year === todayDate.getFullYear();

  return (
    <div className="card bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button onClick={prev} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {month.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={today} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors">Today</button>
        </div>
        <button onClick={next} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells for offset */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-gray-50 bg-gray-50/50" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const bks = dayBookings[d] || [];
          return (
            <div key={d} className={`min-h-[100px] border-b border-r border-gray-100 p-1 ${isToday(d) ? 'bg-blue-50/50' : ''}`}>
              <span className={`text-xs font-medium inline-block w-6 h-6 text-center leading-6 rounded-full ${isToday(d) ? 'bg-light-blue text-white' : 'text-gray-500'}`}>{d}</span>
              <div className="mt-0.5 space-y-0.5">
                {bks.slice(0, 3).map(b => (
                  <Link key={b.id} href={`/dashboard/bookings/${b.id}`} className={`block text-[10px] leading-tight px-1 py-0.5 rounded border truncate ${statusColor[b.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {b.user?.name || b.guest_name || 'Guest'}
                  </Link>
                ))}
                {bks.length > 3 && <p className="text-[10px] text-gray-400 px-1">+{bks.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 border-t border-gray-100">
        {[['Pending', 'bg-yellow-200'], ['Confirmed', 'bg-green-200'], ['Completed', 'bg-blue-200'], ['Cancelled', 'bg-red-200']].map(([label, bg]) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-3 h-3 rounded ${bg}`} />{label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HostBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionErr, setActionErr] = useState('');
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [view, setView] = useState<ViewMode>('list');

  const load = async () => {
    try {
      const data = await bookingsApi.hostBookings();
      setBookings(data.bookings || data as unknown as Booking[]);
      bookingsApi.markSeen([]).catch(() => {});
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: number) => {
    setActionErr('');
    try { await bookingsApi.approve(id); load(); } catch (err) { setActionErr(err instanceof ApiError ? err.message : 'Failed'); }
  };

  const handleReject = async (id: number, reason: string) => {
    setActionErr('');
    try { await bookingsApi.reject(id, reason); setRejectingId(null); load(); } catch (err) { setActionErr(err instanceof ApiError ? err.message : 'Failed'); }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
  const tabs = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
  const statusColor = (s: string) => {
    switch (s) { case 'confirmed': return 'bg-green-100 text-green-700'; case 'pending': return 'bg-yellow-100 text-yellow-700'; case 'completed': return 'bg-blue-100 text-blue-700'; case 'cancelled': return 'bg-red-100 text-red-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Bookings</h1>
          <p className="text-gray-500">Manage booking requests from guests at your places.</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
            List
          </button>
          <button onClick={() => setView('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
            Calendar
          </button>
        </div>
      </div>

      {actionErr && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{actionErr}</div>}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === t ? 'bg-light-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t !== 'all' && <span className="ml-1">({bookings.filter(b => b.status === t).length})</span>}
            {t === 'all' && <span className="ml-1">({bookings.length})</span>}
          </button>
        ))}
      </div>

      {view === 'calendar' ? (
        <CalendarView bookings={filtered} />
      ) : (
      <>
      {filtered.length === 0 ? (
        <div className="text-center py-16 card bg-white">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500">No {filter === 'all' ? '' : filter} bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <div key={b.id} className="card bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Link href={`/dashboard/bookings/${b.id}`} className="font-semibold text-gray-900 hover:text-light-blue truncate">
                      {b.place?.name || b.place_name || `Place #${b.place_id}`}
                    </Link>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(b.status)}`}>{b.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Guest:</span> {b.user?.name || b.guest_name || `User #${b.user_id}`}
                    {(b.user?.email || b.guest_email) && <span className="text-gray-400 ml-1">({b.user?.email || b.guest_email})</span>}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(b.check_in_date || b.check_in).toLocaleDateString()} → {new Date(b.check_out_date || b.check_out).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">£{Number(b.total_price).toFixed(2)}</p>
                  {(b.van_registration || b.vehicle_registration) && <p className="text-xs text-gray-400 mt-1">Vehicle: {b.van_registration || b.vehicle_registration}</p>}
                  {b.special_requests && <p className="text-xs text-gray-400 mt-1 italic">&quot;{b.special_requests}&quot;</p>}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {b.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(b.id)} className="btn-primary text-sm py-1.5 px-4">Approve</button>
                      <button onClick={() => setRejectingId(b.id)} className="bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm py-1.5 px-4 font-medium transition-colors">Reject</button>
                    </>
                  )}
                  <Link href={`/dashboard/messages/${b.user_id}`} className="text-light-blue hover:underline text-sm text-center">Message</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}
      {rejectingId !== null && (
        <ReasonModal
          title="Reject Booking"
          description="Provide a reason for rejecting this booking (optional)."
          placeholder="Rejection reason..."
          confirmLabel="Reject"
          onConfirm={(reason) => handleReject(rejectingId, reason)}
          onCancel={() => setRejectingId(null)}
        />
      )}
    </div>
  );
}
