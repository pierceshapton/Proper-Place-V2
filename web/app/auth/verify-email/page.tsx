'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { authApi, ApiError } from '@/lib/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resending, setResending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // If already verified, redirect to dashboard
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/auth/login'); return; }
    if (user.verified) { router.push('/dashboard'); return; }
  }, [user, authLoading, router]);

  // Poll every 5 seconds to check if user verified via the email link
  useEffect(() => {
    if (authLoading || !user || user.verified) return;

    pollRef.current = setInterval(async () => {
      try {
        await refreshUser();
      } catch { /* ignore */ }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [authLoading, user, refreshUser]);

  // When user becomes verified via polling, redirect
  useEffect(() => {
    if (user?.verified) {
      if (pollRef.current) clearInterval(pollRef.current);
      router.push('/dashboard');
    }
  }, [user?.verified, router]);

  const handleResend = async () => {
    setResending(true);
    setStatus(null);
    try {
      await authApi.resendVerification();
      setStatus({ type: 'success', message: 'Verification email sent! Check your inbox.' });
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof ApiError ? err.message : 'Failed to send verification email.' });
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div>
      </div>
    );
  }

  if (user.verified) return null; // Will redirect via useEffect

  return (
    <main>
      <section className="min-h-screen bg-light-gray text-gray-900 flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2"><span className="text-light-blue">Proper</span> Place</h1>
          </div>
          <div className="card p-8 bg-white border-gray-200 shadow-lg text-center">
            <div className="text-5xl mb-4">✉️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-600 mb-1">
              We&apos;ve sent a verification link to
            </p>
            <p className="font-semibold text-gray-900 mb-6">{user.email}</p>
            <p className="text-sm text-gray-500 mb-8">
              Tap the link in the email to verify your account. This page will update automatically.
            </p>

            {status && (
              <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {status.message}
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full border-2 border-light-blue text-light-blue hover:bg-light-blue hover:text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending...' : 'Resend verification email'}
            </button>

            <button
              onClick={handleLogout}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Log out
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
