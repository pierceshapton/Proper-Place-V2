'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { bookingsApi, type Booking } from '@/lib/api';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const data = await bookingsApi.all();
        setBookings(data.bookings || data as unknown as Booking[]);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  const filtered = bookings.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (b.user?.name || b.guest_name || '').toLowerCase().includes(q) ||
        (b.place?.name || b.place_name || '').toLowerCase().includes(q) ||
        b.id.toString().includes(q);
    }
    return true;
  });

  const tabs = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
  const statusColor = (s: string) => {
    switch (s) { case 'confirmed': return 'bg-green-100 text-green-700'; case 'pending': return 'bg-yellow-100 text-yellow-700'; case 'completed': return 'bg-blue-100 text-blue-700'; case 'cancelled': return 'bg-red-100 text-red-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">All Bookings</h1>
      <p className="text-gray-500">{bookings.length} total bookings</p>

      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by guest, place, or booking ID..." className="bg-white border-gray-300 text-gray-900 max-w-md"
      />

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === t ? 'bg-light-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === 'all' ? bookings.length : bookings.filter(b => b.status === t).length})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-500">ID</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-500">Guest</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-500">Place</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-500">Dates</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-500">Total</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <Link href={`/dashboard/bookings/${b.id}`} className="text-light-blue hover:underline text-sm font-medium">{b.booking_ref || `#${b.id}`}</Link>
                </td>
                <td className="py-3 px-4 text-sm text-gray-900">{b.user?.name || b.guest_name || `User #${b.user_id}`}</td>
                <td className="py-3 px-4 text-sm text-gray-900">{b.place?.name || b.place_name || `Place #${b.place_id}`}</td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {new Date(b.check_in_date || b.check_in).toLocaleDateString()} - {new Date(b.check_out_date || b.check_out).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-gray-900">£{Number(b.total_price).toFixed(2)}</td>
                <td className="py-3 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(b.status)}`}>{b.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No bookings match your search.</p>
        </div>
      )}
    </div>
  );
}
