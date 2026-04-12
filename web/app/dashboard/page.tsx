'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { bookingsApi, placesApi, notificationsApi, adminApi, type Booking, type Place, type NotificationCounts, type AdminDashboard } from '@/lib/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [counts, setCounts] = useState<NotificationCounts | null>(null);
  const [adminData, setAdminData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [b, n] = await Promise.all([
          bookingsApi.list().catch(() => ({ bookings: [] })),
          notificationsApi.counts().catch(() => null),
        ]);
        setBookings(b.bookings || []);
        setCounts(n);

        if (user.role === 'host' || user.role === 'admin') {
          const p = await placesApi.myPlaces().catch(() => ({ places: [] }));
          setPlaces(p.places || []);
        }
        if (user.role === 'admin') {
          const a = await adminApi.dashboard().catch(() => ({ dashboard: null }));
          setAdminData(a.dashboard);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;
  }

  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
  const recentBookings = bookings.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening with your account</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/bookings" className="card p-4 bg-white cursor-pointer hover:shadow-lg transition-shadow">
          <p className="text-sm text-gray-500">Active Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{activeBookings.length}</p>
        </Link>
        <Link href="/dashboard/messages" className="card p-4 bg-white cursor-pointer hover:shadow-lg transition-shadow">
          <p className="text-sm text-gray-500">Unread Messages</p>
          <p className="text-2xl font-bold text-gray-900">{counts?.unreadMessages || 0}</p>
        </Link>
        {(user?.role === 'host' || user?.role === 'admin') && (
          <>
            <Link href="/dashboard/places" className="card p-4 bg-white cursor-pointer hover:shadow-lg transition-shadow">
              <p className="text-sm text-gray-500">My Places</p>
              <p className="text-2xl font-bold text-gray-900">{places.length}</p>
            </Link>
            <Link href="/dashboard/host/bookings" className="card p-4 bg-white cursor-pointer hover:shadow-lg transition-shadow">
              <p className="text-sm text-gray-500">Pending Guest Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{counts?.pendingBookings || 0}</p>
            </Link>
          </>
        )}
        {user?.role !== 'host' && user?.role !== 'admin' && (
          <>
            <Link href="/dashboard/bookings" className="card p-4 bg-white cursor-pointer hover:shadow-lg transition-shadow">
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
            </Link>
            <Link href="/dashboard/bookings" className="card p-4 bg-white cursor-pointer hover:shadow-lg transition-shadow">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{bookings.filter(b => b.status === 'completed').length}</p>
            </Link>
          </>
        )}
      </div>

      {/* Admin stats */}
      {user?.role === 'admin' && adminData && (
        <div className="card p-6 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Platform Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/dashboard/admin/users" className="bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition-colors cursor-pointer"><p className="text-sm text-blue-600">Total Users</p><p className="text-xl font-bold text-blue-900">{adminData.total_users}</p></Link>
            <Link href="/dashboard/admin/places" className="bg-green-50 rounded-lg p-4 hover:bg-green-100 transition-colors cursor-pointer"><p className="text-sm text-green-600">Total Places</p><p className="text-xl font-bold text-green-900">{adminData.total_places}</p></Link>
            <Link href="/dashboard/admin/bookings" className="bg-purple-50 rounded-lg p-4 hover:bg-purple-100 transition-colors cursor-pointer"><p className="text-sm text-purple-600">Total Bookings</p><p className="text-xl font-bold text-purple-900">{adminData.total_bookings}</p></Link>
            <div className="bg-yellow-50 rounded-lg p-4"><p className="text-sm text-yellow-600">Total Reviews</p><p className="text-xl font-bold text-yellow-900">{adminData.total_reviews}</p></div>
            <Link href="/dashboard/admin/places" className="bg-red-50 rounded-lg p-4 hover:bg-red-100 transition-colors cursor-pointer"><p className="text-sm text-red-600">Pending Approvals</p><p className="text-xl font-bold text-red-900">{adminData.pending_approvals}</p></Link>
            <Link href="/dashboard/referrals" className="bg-orange-50 rounded-lg p-4 hover:bg-orange-100 transition-colors cursor-pointer"><p className="text-sm text-orange-600">Pending Referrals</p><p className="text-xl font-bold text-orange-900">{adminData.pending_referrals}</p></Link>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/browse" className="card p-6 bg-white hover:shadow-lg transition-shadow group">
          <div className="text-3xl mb-3">🗺️</div>
          <h3 className="font-semibold text-gray-900 group-hover:text-light-blue transition-colors">Browse Places</h3>
          <p className="text-sm text-gray-500 mt-1">Find your next motorhome stay</p>
        </Link>
        <Link href="/dashboard/bookings" className="card p-6 bg-white hover:shadow-lg transition-shadow group">
          <div className="text-3xl mb-3">📅</div>
          <h3 className="font-semibold text-gray-900 group-hover:text-light-blue transition-colors">My Bookings</h3>
          <p className="text-sm text-gray-500 mt-1">View and manage your bookings</p>
        </Link>
        <Link href="/dashboard/messages" className="card p-6 bg-white hover:shadow-lg transition-shadow group">
          <div className="text-3xl mb-3">💬</div>
          <h3 className="font-semibold text-gray-900 group-hover:text-light-blue transition-colors">Messages</h3>
          <p className="text-sm text-gray-500 mt-1">{counts?.unreadMessages ? `${counts.unreadMessages} unread` : 'Chat with hosts'}</p>
        </Link>
        {(user?.role === 'host' || user?.role === 'admin') && (
          <>
            <Link href="/dashboard/places/new" className="card p-6 bg-white hover:shadow-lg transition-shadow group">
              <div className="text-3xl mb-3">➕</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-light-blue transition-colors">Add New Place</h3>
              <p className="text-sm text-gray-500 mt-1">List a new space for motorhomers</p>
            </Link>
            <Link href="/dashboard/host/bookings" className="card p-6 bg-white hover:shadow-lg transition-shadow group">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-light-blue transition-colors">Guest Bookings</h3>
              <p className="text-sm text-gray-500 mt-1">Manage incoming booking requests</p>
            </Link>
          </>
        )}
        {user?.role === 'admin' && (
          <Link href="/dashboard/admin/places" className="card p-6 bg-white hover:shadow-lg transition-shadow group">
            <div className="text-3xl mb-3">✅</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-light-blue transition-colors">Approve Places</h3>
            <p className="text-sm text-gray-500 mt-1">{counts?.pendingApprovals ? `${counts.pendingApprovals} pending` : 'Review submissions'}</p>
          </Link>
        )}
      </div>

      {/* Recent bookings */}
      {recentBookings.length > 0 && (
        <div className="card bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
            <Link href="/dashboard/bookings" className="text-sm text-light-blue hover:text-accent-blue">View All →</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentBookings.map(b => (
              <Link key={b.id} href={`/dashboard/bookings/${b.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-gray-900">{b.place_name || `Booking #${b.booking_ref || b.id}`}</p>
                  <p className="text-sm text-gray-500">{new Date(b.check_in_date).toLocaleDateString('en-GB')} → {new Date(b.check_out_date).toLocaleDateString('en-GB')}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>{b.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Host places */}
      {(user?.role === 'host' || user?.role === 'admin') && places.length > 0 && (
        <div className="card bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">My Places</h2>
            <Link href="/dashboard/places" className="text-sm text-light-blue hover:text-accent-blue">Manage →</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {places.slice(0, 5).map(p => (
              <Link key={p.id} href={`/dashboard/places/${p.id}/edit`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  {p.image_urls?.[0] ? (
                    <img src={p.image_urls[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">📍</div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-500">£{p.price_per_night}/night • {p.city || 'Unknown'}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  p.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                  p.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>{p.approval_status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
