'use client';

import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/404');
    }
  }, [loading, user, router]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  const isActive = (path: string) => pathname === path;
  const isActiveGroup = (path: string) => pathname.startsWith(path) && (pathname === path || pathname[path.length] === '/');

  const navItem = (href: string, label: string, icon: string, exact = false) => {
    const active = exact ? isActive(href) : isActiveGroup(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          active
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <span className="text-base w-5 text-center">{icon}</span>
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col z-50 overflow-hidden" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Mobile header */}
      <div className="lg:hidden flex-shrink-0 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-400 text-sm font-bold">C</span>
          </div>
          <span className="text-sm font-semibold text-slate-200">CRM</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-400 hover:text-slate-200 p-1"
        >
          {sidebarOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
          )}
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative top-0 left-0 h-full w-60 bg-slate-900 border-r border-slate-800 overflow-y-auto transition-transform z-30 flex flex-col flex-shrink-0`}>
          {/* Logo area */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">CRM</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Operations</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Internal · Admin</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-3 space-y-1">
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Overview</p>
            {navItem('/crm', 'Dashboard', '◆', true)}
            {navItem('/crm/pipeline', 'Pipeline', '◫')}

            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Manage</p>
            {navItem('/crm/leads', 'Leads', '◉')}
            {navItem('/crm/tasks', 'Tasks', '☐')}
            {navItem('/crm/emails', 'Emails', '✉')}

            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Tools</p>
            {navItem('/crm/discover', 'Discover', '⊕')}
            {navItem('/crm/settings', 'Settings', '⚙')}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-800">
            <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <span>←</span>
              <span>Back to Proper Place</span>
            </Link>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/60 z-20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
