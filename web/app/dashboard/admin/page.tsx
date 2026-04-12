'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, type AdminDashboard } from '@/lib/api';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.dashboard().then(d => setStats(d.dashboard || d as unknown as AdminDashboard)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  const s = stats;
  const cards = [
    { label: 'Total Users', value: s?.totalUsers ?? s?.total_users ?? 0, icon: '👥', color: 'bg-blue-50 text-blue-700', link: '/dashboard/admin/users' },
    { label: 'Total Places', value: s?.totalPlaces ?? s?.total_places ?? 0, icon: '📍', color: 'bg-green-50 text-green-700', link: '/dashboard/admin/places' },
    { label: 'Pending Approvals', value: s?.pendingPlaces ?? s?.pending_approvals ?? 0, icon: '⏳', color: 'bg-yellow-50 text-yellow-700', link: '/dashboard/admin/places' },
    { label: 'Total Bookings', value: s?.totalBookings ?? s?.total_bookings ?? 0, icon: '📋', color: 'bg-purple-50 text-purple-700', link: '/dashboard/admin/bookings' },
    { label: 'Active Bookings', value: s?.activeBookings ?? 0, icon: '✅', color: 'bg-emerald-50 text-emerald-700', link: '/dashboard/admin/bookings' },
    { label: 'Total Revenue', value: s?.totalRevenue ? `£${Number(s.totalRevenue).toFixed(0)}` : '£0', icon: '💰', color: 'bg-amber-50 text-amber-700', link: '#' },
    { label: 'Open Contacts', value: s?.openContacts ?? 0, icon: '📬', color: 'bg-red-50 text-red-700', link: '/dashboard/admin/contacts' },
    { label: 'Total Reviews', value: s?.totalReviews ?? s?.total_reviews ?? 0, icon: '⭐', color: 'bg-indigo-50 text-indigo-700', link: '#' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <p className="text-gray-500">Platform overview and management.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <Link key={c.label} href={c.link} className={`card p-4 ${c.color} hover:shadow-md transition-shadow`}>
            <p className="text-2xl">{c.icon}</p>
            <p className="text-2xl font-bold mt-2">{c.value}</p>
            <p className="text-sm mt-1 opacity-70">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/dashboard/admin/places" className="card bg-white p-5 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900 mb-2">📍 Place Approvals</h3>
          <p className="text-sm text-gray-500">Review and approve new place listings submitted by hosts.</p>
          {((s?.pendingPlaces ?? s?.pending_approvals ?? 0) > 0) && <span className="inline-block mt-2 bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full">{s?.pendingPlaces ?? s?.pending_approvals} pending</span>}
        </Link>
        <Link href="/dashboard/admin/users" className="card bg-white p-5 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900 mb-2">👥 User Management</h3>
          <p className="text-sm text-gray-500">View all users, manage roles, and monitor activity.</p>
        </Link>
        <Link href="/dashboard/admin/bookings" className="card bg-white p-5 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900 mb-2">📋 All Bookings</h3>
          <p className="text-sm text-gray-500">View and manage all platform bookings.</p>
        </Link>
        <Link href="/dashboard/admin/contacts" className="card bg-white p-5 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900 mb-2">📬 Support Tickets</h3>
          <p className="text-sm text-gray-500">Manage contact form submissions and support requests.</p>
          {(s?.openContacts ?? 0) > 0 && <span className="inline-block mt-2 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">{s?.openContacts} open</span>}
        </Link>
      </div>
    </div>
  );
}
