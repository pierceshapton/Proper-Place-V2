'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Validate token on load
  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    // We'll just let the POST tell us if the token is invalid
    setTokenValid(true);
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false });
      setDone(true);
      // Redirect to login after 3s
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. The link may have expired.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-xl font-bold text-slate-100">Invalid link</h1>
        <p className="text-slate-400 text-sm">This invitation link is missing or malformed. Ask an admin to resend your invite.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-xl font-bold text-slate-100">Password set!</h1>
        <p className="text-slate-400 text-sm">Your password has been saved. Redirecting you to log in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center space-y-1 mb-2">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-emerald-400 font-bold text-lg">PP</span>
        </div>
        <h1 className="text-xl font-bold text-slate-100">Welcome to Proper Place</h1>
        <p className="text-slate-400 text-sm">Set a password to activate your account.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">New password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          required
          minLength={8}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
      >
        {submitting ? 'Setting password…' : 'Set password & continue'}
      </button>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" /></div>}>
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
