'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { bookingsApi, ApiError, type Booking } from '@/lib/api';

export default function HostBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionErr, setActionErr] = useState('');

  const load = async () => {
    try {
      const data = await bookingsApi.hostBookings();
      setBookings(data.bookings || data as unknown as Booking[]);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: number) => {
    setActionErr('');
    try { await bookingsApi.approve(id); load(); } catch (err) { setActionErr(err instanceof ApiError ? err.message : 'Failed'); }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Reason for rejection (optional):') || '';
    setActionErr('');
    try { await bookingsApi.reject(id, reason); load(); } catch (err) { setActionErr(err instanceof ApiError ? err.message : 'Failed'); }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
  const tabs = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
  const statusColor = (s: string) => {
    switch (s) { case 'confirmed': return 'bg-green-100 text-green-700'; case 'pending': return 'bg-yellow-100 text-yellow-700'; case 'completed': return 'bg-blue-100 text-blue-700'; case 'cancelled': return 'bg-red-100 text-red-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Guest Bookings</h1>
      <p className="text-gray-500">Manage booking requests from guests at your places.</p>

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
                      <button onClick={() => handleReject(b.id)} className="bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm py-1.5 px-4 font-medium transition-colors">Reject</button>
                    </>
                  )}
                  <Link href={`/dashboard/messages/${b.user_id}`} className="text-light-blue hover:underline text-sm text-center">Message</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
