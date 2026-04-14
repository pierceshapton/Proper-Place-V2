'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { bookingsApi, type Booking } from '@/lib/api';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelWarning, setCancelWarning] = useState('');

  useEffect(() => {
    bookingsApi.list()
      .then(data => {
        setBookings(data.bookings || []);
        bookingsApi.markUserSeen().catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  const isWithin24h = (booking: Booking) => {
    const checkIn = new Date(booking.check_in_date || booking.check_in);
    return (checkIn.getTime() - Date.now()) / (1000 * 60 * 60) <= 24;
  };

  const startCancel = (booking: Booking) => {
    setCancelWarning('');
    setCancellingId(booking.id);
  };

  const handleCancel = async (id: number) => {
    try {
      await bookingsApi.cancel(id);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b));
      setCancellingId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <Link href="/browse" className="btn-primary py-2 px-4 text-sm">Browse Places</Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-light-blue text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)} {f !== 'all' && `(${bookings.filter(b => f === 'all' || b.status === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card bg-white p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No bookings found</h2>
          <p className="text-gray-500 mb-6">{filter === 'all' ? "You haven't made any bookings yet." : `No ${filter} bookings.`}</p>
          <Link href="/browse" className="btn-primary py-2 px-6">Find a Place</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(booking => (
            <div key={booking.id} className="card bg-white p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  {booking.place_image ? (
                    <img src={booking.place_image} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🏕️</div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{booking.place_name || `Booking #${booking.booking_ref || booking.id}`}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(booking.check_in_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} → {new Date(booking.check_out_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {booking.booking_ref && <p className="text-xs text-gray-400 mt-1">Ref: {booking.booking_ref}</p>}
                    <p className="text-sm font-medium text-gray-900 mt-1">£{Number(booking.total_price).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>{booking.status}</span>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/bookings/${booking.id}`} className="text-sm text-light-blue hover:text-accent-blue">Details</Link>
                    {(booking.status === 'pending' || booking.status === 'confirmed') && !isWithin24h(booking) && (
                      <button onClick={() => startCancel(booking)} className="text-sm text-red-500 hover:text-red-700">Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {cancellingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCancellingId(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Booking</h3>
            <p className="text-sm text-gray-600 mb-2">Are you sure you want to cancel this booking? This cannot be undone.</p>
            {cancelWarning && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">⚠️ {cancelWarning}</p>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setCancellingId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Keep Booking</button>
              <button onClick={() => handleCancel(cancellingId)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Cancel Booking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
