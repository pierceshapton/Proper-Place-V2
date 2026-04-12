'use client';

import { useEffect, useState } from 'react';
import { referralsApi, ApiError } from '@/lib/api';

interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  total_earnings: number;
  connect_status: string;
  referrals: Array<{
    id: number;
    referred_email?: string;
    referred_name?: string;
    status: string;
    created_at: string;
    earned?: number;
  }>;
}

export default function ReferralsPage() {
  const [code, setCode] = useState('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      referralsApi.getCode().then(d => setCode(d.referral_code)).catch(() => {}),
      referralsApi.stats().then(d => setStats(d as unknown as ReferralStats)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = () => {
    const text = `Join me on Proper Place! Use my referral code: ${code}\nhttps://proper-place.co.uk/auth/signup?ref=${code}`;
    if (navigator.share) {
      navigator.share({ title: 'Join Proper Place', text });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const setupStripeConnect = async () => {
    setConnectLoading(true);
    setError('');
    try {
      const data = await referralsApi.setupConnect() as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to set up Stripe Connect');
    }
    setConnectLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
      <p className="text-gray-500">Earn rewards by referring friends to Proper Place.</p>

      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Referral Code Card */}
      <div className="card bg-gradient-to-r from-light-blue to-accent-blue p-6 text-white">
        <h2 className="text-lg font-semibold mb-3">Your Referral Code</h2>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 rounded-lg px-6 py-3 text-2xl font-bold tracking-widest select-all">
            {code || 'Loading...'}
          </div>
          <button onClick={copyCode} className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-3 text-sm font-medium transition-colors">
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <button onClick={shareCode} className="bg-white text-light-blue rounded-lg px-6 py-2.5 text-sm font-bold hover:bg-white/90 transition-colors">
          Share Referral Link
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats?.total_referrals ?? 0}</p>
          <p className="text-sm text-gray-500">Total Referrals</p>
        </div>
        <div className="card bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats?.successful_referrals ?? 0}</p>
          <p className="text-sm text-gray-500">Successful</p>
        </div>
        <div className="card bg-white p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats?.pending_referrals ?? 0}</p>
          <p className="text-sm text-gray-500">Pending</p>
        </div>
        <div className="card bg-white p-4 text-center">
          <p className="text-2xl font-bold text-light-blue">£{Number(stats?.total_earnings ?? 0).toFixed(2)}</p>
          <p className="text-sm text-gray-500">Total Earned</p>
        </div>
      </div>

      {/* Stripe Connect */}
      <div className="card bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">💳 Stripe Connect</h2>
        <p className="text-sm text-gray-500 mb-4">Set up Stripe Connect to receive your referral earnings directly.</p>
        {stats?.connect_status === 'active' ? (
          <div className="flex items-center gap-2 text-green-600">
            <span className="text-lg">✅</span>
            <span className="font-medium">Stripe Connect is active — payouts enabled!</span>
          </div>
        ) : (
          <button onClick={setupStripeConnect} disabled={connectLoading} className="btn-primary py-2.5 px-6 text-sm disabled:opacity-50">
            {connectLoading ? 'Setting up...' : 'Set Up Stripe Connect'}
          </button>
        )}
      </div>

      {/* Referral List */}
      <div className="card bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Referral History</h2>
        {!stats?.referrals?.length ? (
          <p className="text-gray-400 text-center py-8">No referrals yet. Share your code to get started!</p>
        ) : (
          <div className="space-y-3">
            {stats.referrals.map(r => (
              <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{r.referred_name || r.referred_email || 'User'}</p>
                  <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    r.status === 'successful' ? 'bg-green-100 text-green-700' : r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                  }`}>{r.status}</span>
                  {r.earned !== undefined && r.earned > 0 && <p className="text-sm font-semibold text-green-600 mt-1">+£{Number(r.earned).toFixed(2)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card bg-gray-50 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl mb-2">📤</p>
            <h3 className="font-semibold text-gray-900 text-sm">1. Share Your Code</h3>
            <p className="text-xs text-gray-500 mt-1">Send your unique referral code to friends and family.</p>
          </div>
          <div className="text-center">
            <p className="text-3xl mb-2">👤</p>
            <h3 className="font-semibold text-gray-900 text-sm">2. They Sign Up</h3>
            <p className="text-xs text-gray-500 mt-1">When they create an account using your code, the referral is tracked.</p>
          </div>
          <div className="text-center">
            <p className="text-3xl mb-2">💰</p>
            <h3 className="font-semibold text-gray-900 text-sm">3. Earn Rewards</h3>
            <p className="text-xs text-gray-500 mt-1">When they make their first booking, you both earn a reward.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
