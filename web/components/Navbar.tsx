'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { notificationsApi, type NotificationCounts } from '@/lib/api';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [counts, setCounts] = useState<NotificationCounts | null>(null);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setIsOpen(false); setProfileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!user) return;
    const fetchCounts = () => {
      notificationsApi.counts().then(setCounts).catch(() => {});
    };
    fetchCounts();
    const iv = setInterval(fetchCounts, 30000);
    return () => clearInterval(iv);
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const totalBadge = counts
    ? (counts.unreadMessages || 0) + (counts.pendingBookings || 0) + (counts.pendingApprovals || 0)
    : 0;

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const navLink = (href: string, label: string, badge?: number) => (
    <Link
      href={href}
      className={`transition whitespace-nowrap relative text-sm font-medium ${
        isActive(href) ? 'text-white' : 'text-white/70 hover:text-white'
      }`}
    >
      {label}
      {badge ? (
        <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  );

  const mobileLink = (href: string, label: string, badge?: number) => (
    <Link
      href={href}
      className={`block py-2.5 text-sm transition flex items-center justify-between border-b border-white/10 ${
        isActive(href) ? 'text-white font-medium' : 'text-white/70 hover:text-white'
      }`}
      onClick={() => setIsOpen(false)}
    >
      {label}
      {badge ? (
        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  );

  return (
    <nav className="bg-light-blue shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16 relative">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0" aria-label="Proper Place home">
          <Image src="/logo-192.png" alt="Proper Place" width={40} height={40} className="object-contain w-9 h-9" />
          <span className="font-bold text-white text-lg tracking-tight">Proper Place</span>
        </Link>

        {/* Desktop Nav — centred */}
        <div className="hidden lg:flex gap-7 xl:gap-8 absolute left-1/2 transform -translate-x-1/2">
          {navLink('/', 'Home')}
          {navLink('/browse', 'Browse Map')}
          {!user && navLink('/become-host', 'Become a Host')}
          {user && navLink('/dashboard', 'Dashboard')}
          {user && navLink('/dashboard/bookings', 'Bookings', counts?.pendingBookings)}
          {user && navLink('/dashboard/messages', 'Messages', counts?.unreadMessages)}
          {(user?.role === 'host' || user?.role === 'admin') && navLink('/dashboard/places', 'My Places')}
          {user?.role === 'admin' && navLink('/dashboard/admin', 'Admin', counts?.pendingApprovals)}
        </div>

        {/* Desktop Auth / Profile */}
        <div className="hidden lg:flex gap-3 flex-shrink-0 items-center">
          {!user ? (
            <>
              <Link href="/auth/login" className="text-sm font-medium text-white/80 hover:text-white transition-colors px-3 py-2">
                Sign in
              </Link>
              <Link href="/auth/signup" className="text-sm font-semibold bg-white text-light-blue hover:bg-white/90 transition-colors px-5 py-2 rounded-lg">
                Create account
              </Link>
            </>
          ) : (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 text-white/80 hover:text-white transition"
              >
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm max-w-[120px] truncate">{user.name}</span>
                {totalBadge > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalBadge > 9 ? '9+' : totalBadge}
                  </span>
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <p className="text-xs text-light-blue capitalize mt-0.5">{user.role}</p>
                  </div>
                  <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>Dashboard</Link>
                  <Link href="/dashboard/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>Profile & Settings</Link>
                  <Link href="/dashboard/bookings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>My Bookings</Link>
                  <Link href="/dashboard/messages" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>Messages</Link>
                  {(user.role === 'host' || user.role === 'admin') && (
                    <>
                      <hr className="my-1 border-gray-100" />
                      <Link href="/dashboard/places" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>My Places</Link>
                      <Link href="/dashboard/host/bookings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>Host Bookings</Link>
                    </>
                  )}
                  {user.role === 'admin' && (
                    <>
                      <hr className="my-1 border-gray-100" />
                      <Link href="/dashboard/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>Admin Panel</Link>
                      <Link href="/crm" className="block px-4 py-2 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600" onClick={() => setProfileOpen(false)}>Operations CRM</Link>
                    </>
                  )}
                  <hr className="my-1 border-gray-100" />
                  <button onClick={() => { logout(); setProfileOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden text-white p-2"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-light-blue px-4 sm:px-6 pb-6 max-h-[80vh] overflow-y-auto">
          <div className="pt-2">
            {mobileLink('/', 'Home')}
            {mobileLink('/browse', 'Browse Map')}
            {!user && mobileLink('/become-host', 'Become a Host')}
            {user && (
              <>
                {mobileLink('/dashboard', 'Dashboard')}
                {mobileLink('/dashboard/bookings', 'My Bookings', counts?.pendingBookings)}
                {mobileLink('/dashboard/messages', 'Messages', counts?.unreadMessages)}
                {mobileLink('/dashboard/profile', 'Profile & Settings')}
                {mobileLink('/dashboard/referrals', 'Referrals')}
              </>
            )}
            {(user?.role === 'host' || user?.role === 'admin') && (
              <>
                <p className="text-xs text-white/50 uppercase tracking-wider pt-4 pb-1">Host</p>
                {mobileLink('/dashboard/places', 'My Places')}
                {mobileLink('/dashboard/places/new', 'Add New Place')}
                {mobileLink('/dashboard/host/bookings', 'Host Bookings')}
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <p className="text-xs text-white/50 uppercase tracking-wider pt-4 pb-1">Admin</p>
                {mobileLink('/dashboard/admin', 'Admin Dashboard', counts?.pendingApprovals)}
                {mobileLink('/dashboard/admin/places', 'Place Approvals')}
                {mobileLink('/dashboard/admin/users', 'Manage Users')}
                {mobileLink('/dashboard/admin/bookings', 'All Bookings')}
                {mobileLink('/dashboard/admin/contacts', 'Support Tickets')}
                {mobileLink('/crm', 'Operations CRM')}
              </>
            )}
            <div className="pt-4 flex flex-col gap-2">
              {!user ? (
                <>
                  <Link href="/auth/login" className="block py-3 text-center text-sm font-medium text-white border border-white/30 rounded-xl hover:bg-white/10 transition-colors" onClick={() => setIsOpen(false)}>Sign in</Link>
                  <Link href="/auth/signup" className="block py-3 text-center text-sm font-semibold bg-white text-light-blue rounded-xl hover:bg-white/90 transition-colors" onClick={() => setIsOpen(false)}>Create account</Link>
                </>
              ) : (
                <button onClick={() => { logout(); setIsOpen(false); }} className="block w-full py-3 text-center text-sm text-red-300 hover:text-red-200 border border-red-300/30 rounded-xl transition-colors">
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
