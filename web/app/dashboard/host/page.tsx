'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { bookingsApi, type HostDashboard } from '@/lib/api';

export default function HostDashboardPage() {
  const [stats, setStats] = useState<HostDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsApi.hostDashboard()
      .then(d => setStats(d.dashboard || d as unknown as HostDashboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  const s = stats;
  const fmt = (v: number) => `£${v.toFixed(2)}`;
  const multiSite = (s?.places.total ?? 0) > 1;

  const placeCards = [
    { label: 'Total Places', value: s?.places.total ?? 0, icon: '📍', color: 'bg-green-50 text-green-700', link: '/dashboard/places' },
    { label: 'Approved Places', value: s?.places.approved ?? 0, icon: '✅', color: 'bg-emerald-50 text-emerald-700', link: '/dashboard/places' },
    { label: 'Pending Approval', value: s?.places.pending ?? 0, icon: '⏳', color: 'bg-yellow-50 text-yellow-700', link: '/dashboard/places' },
  ];

  const cards = [
    { label: 'Total Bookings', value: s?.bookings.total ?? 0, icon: '📋', color: 'bg-blue-50 text-blue-700', link: '/dashboard/host/bookings' },
    { label: 'Pending Bookings', value: s?.bookings.pending ?? 0, icon: '🔔', color: 'bg-orange-50 text-orange-700', link: '/dashboard/host/bookings' },
    { label: 'Confirmed', value: s?.bookings.confirmed ?? 0, icon: '📅', color: 'bg-purple-50 text-purple-700', link: '/dashboard/host/bookings' },
    { label: 'Completed', value: s?.bookings.completed ?? 0, icon: '🏁', color: 'bg-indigo-50 text-indigo-700', link: '/dashboard/host/bookings' },
    { label: 'Active Now', value: s?.bookings.active_now ?? 0, icon: '🟢', color: 'bg-teal-50 text-teal-700', link: '/dashboard/host/bookings' },
    { label: 'Host Earnings', value: fmt(s?.earnings.host_earnings ?? 0), icon: '💰', color: 'bg-amber-50 text-amber-700', link: '/dashboard/host/bookings' },
    { label: 'Paid Out', value: fmt(s?.earnings.paid_out ?? 0), icon: '✅', color: 'bg-lime-50 text-lime-700', link: '/dashboard/host/bookings' },
    { label: 'Pending Payout', value: fmt(s?.earnings.pending_payout ?? 0), icon: '⏳', color: 'bg-rose-50 text-rose-700', link: '/dashboard/host/bookings' },
    { label: 'Reviews', value: s?.reviews.total ? `${s.reviews.total} (${s.reviews.average_rating}★)` : '0', icon: '⭐', color: 'bg-sky-50 text-sky-700', link: '/dashboard/places' },
  ];

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
    rejected: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
      <p className="text-gray-500">Your hosting overview and performance.</p>

      {/* Place stats - only for multi-site hosts */}
      {multiSite && (
        <div className="grid grid-cols-3 gap-4">
          {placeCards.map(c => (
            <Link key={c.label} href={c.link} className={`card p-4 ${c.color} hover:shadow-md transition-shadow`}>
              <p className="text-2xl">{c.icon}</p>
              <p className="text-2xl font-bold mt-2">{c.value}</p>
              <p className="text-sm mt-1 opacity-70">{c.label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <Link key={c.label} href={c.link} className={`card p-4 ${c.color} hover:shadow-md transition-shadow`}>
            <p className="text-2xl">{c.icon}</p>
            <p className="text-2xl font-bold mt-2">{c.value}</p>
            <p className="text-sm mt-1 opacity-70">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent bookings & upcoming check-ins */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent bookings */}
        <div className="card bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
            <Link href="/dashboard/host/bookings" className="text-sm text-light-blue hover:text-accent-blue">View All →</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(s?.recent_bookings ?? []).length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No bookings yet.</p>
            ) : (
              s?.recent_bookings.map(b => (
                <Link key={b.id} href={`/dashboard/host/bookings`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{b.place_name}</p>
                    <p className="text-xs text-gray-500">{b.guest_name} · {new Date(b.check_in_date).toLocaleDateString()} - {new Date(b.check_out_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[b.status] || 'bg-gray-100 text-gray-700'}`}>{b.status}</span>
                    <p className="text-sm font-semibold text-gray-900 mt-1">£{Number(b.total_price).toFixed(2)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Upcoming check-ins */}
        <div className="card bg-white">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Upcoming Check-ins (Next 7 Days)</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {(s?.upcoming_checkins ?? []).length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No upcoming check-ins.</p>
            ) : (
              s?.upcoming_checkins.map(b => (
                <div key={b.id} className="p-4">
                  <p className="font-medium text-gray-900">{b.place_name}</p>
                  <p className="text-sm text-gray-500">{b.guest_name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Check-in: {new Date(b.check_in_date).toLocaleDateString()} → {new Date(b.check_out_date).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/dashboard/host/bookings" className="card bg-white p-5 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900 mb-2">📋 Guest Bookings</h3>
          <p className="text-sm text-gray-500">View and manage incoming booking requests.</p>
          {(s?.bookings.pending ?? 0) > 0 && <span className="inline-block mt-2 bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full">{s?.bookings.pending} pending</span>}
        </Link>
        <Link href="/dashboard/places" className="card bg-white p-5 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900 mb-2">📍 My Places</h3>
          <p className="text-sm text-gray-500">Manage your listed places and availability.</p>
        </Link>
        <Link href="/dashboard/host/auto-messages" className="card bg-white p-5 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900 mb-2">💬 Auto-Messages</h3>
          <p className="text-sm text-gray-500">Set up automated messages for your guests.</p>
        </Link>
        <Link href="/dashboard/places/new" className="card bg-white p-5 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900 mb-2">➕ Add New Place</h3>
          <p className="text-sm text-gray-500">List a new space for motorhomers.</p>
        </Link>
      </div>
    </div>
  );
}
