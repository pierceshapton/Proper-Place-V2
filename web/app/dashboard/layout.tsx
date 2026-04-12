'use client';

import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { notificationsApi, type NotificationCounts } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [counts, setCounts] = useState<NotificationCounts | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    notificationsApi.counts().then(setCounts).catch(() => {});
    const iv = setInterval(() => notificationsApi.counts().then(setCounts).catch(() => {}), 30000);
    return () => clearInterval(iv);
  }, [user]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div>
      </div>
    );
  }

  const isActive = (path: string) => pathname === path;
  const isActiveGroup = (path: string) => pathname.startsWith(path);

  const sideLink = (href: string, label: string, icon: string, badge?: number, exact = false) => {
    const active = exact ? isActive(href) : isActiveGroup(href);
    return (
      <Link href={href} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-light-blue text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
        <span className="text-lg">{icon}</span>
        <span className="flex-1">{label}</span>
        {badge ? <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{badge > 9 ? '9+' : badge}</span> : null}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-light-gray">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-40 bg-light-blue text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-24 left-0 h-[calc(100vh-6rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto transition-transform z-30 shadow-lg lg:shadow-none`}>
          <div className="p-4 space-y-1">
            <div className="px-4 py-3 mb-2">
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-light-blue/10 text-light-blue rounded-full capitalize">{user.role}</span>
            </div>

            <hr className="my-2" />
            {sideLink('/dashboard', 'Dashboard', '🏠', undefined, true)}
            {sideLink('/dashboard/bookings', 'My Bookings', '📅', counts?.pendingBookings)}
            {sideLink('/dashboard/messages', 'Messages', '💬', counts?.unreadMessages)}
            {sideLink('/dashboard/profile', 'Profile & Settings', '👤')}
            {sideLink('/dashboard/referrals', 'Referrals', '🎁')}

            {(user.role === 'host' || user.role === 'admin') && (
              <>
                <hr className="my-2" />
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Host</p>
                {sideLink('/dashboard/places', 'My Places', '📍')}
                {sideLink('/dashboard/places/new', 'Add New Place', '➕')}
                {sideLink('/dashboard/host/bookings', 'Guest Bookings', '📋', counts?.pendingBookings)}
              </>
            )}

            {user.role === 'admin' && (
              <>
                <hr className="my-2" />
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
                {sideLink('/dashboard/admin', 'Admin Dashboard', '⚙️', undefined, true)}
                {sideLink('/dashboard/admin/places', 'Place Approvals', '✅', counts?.pendingApprovals)}
                {sideLink('/dashboard/admin/users', 'Manage Users', '👥')}
                {sideLink('/dashboard/admin/bookings', 'All Bookings', '📊')}
                {sideLink('/dashboard/admin/contacts', 'Support Tickets', '🎫')}
              </>
            )}
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-20" onClick={() => setSidebarOpen(false)} />}

        {/* Main content */}
        <main className="flex-1 min-h-[calc(100vh-6rem)] p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
