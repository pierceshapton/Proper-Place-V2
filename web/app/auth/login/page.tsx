'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ApiError, authApi } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setForgotSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  if (forgotMode) {
    return (
      <main>
        <section className="min-h-screen bg-light-gray text-gray-900 flex items-center justify-center py-12 px-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2"><span className="text-light-blue">Proper</span> Place</h1>
              <p className="text-gray-600">Reset your password</p>
            </div>
            <div className="card p-8 bg-white border-gray-200 shadow-lg">
              {forgotSent ? (
                <div className="text-center">
                  <div className="text-green-600 text-5xl mb-4">✓</div>
                  <h2 className="text-xl font-bold mb-2 text-gray-900">Check Your Email</h2>
                  <p className="text-gray-600 mb-6">We&apos;ve sent a password reset link to <strong>{email}</strong></p>
                  <button onClick={() => { setForgotMode(false); setForgotSent(false); }} className="btn-primary py-2 px-6">Back to Login</button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} autoComplete="off" className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Email Address</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required autoComplete="off" className="bg-white border-gray-300 text-gray-900 placeholder-gray-400" />
                  </div>
                  {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
                  <button type="submit" disabled={loading} className="btn-primary w-full py-3 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed">{loading ? 'Sending...' : 'Send Reset Link'}</button>
                  <button type="button" onClick={() => setForgotMode(false)} className="w-full text-center text-sm text-light-blue hover:text-accent-blue">Back to Login</button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="min-h-screen bg-light-gray text-gray-900 flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2"><span className="text-light-blue">Proper</span> Place</h1>
            <p className="text-gray-600">Welcome back</p>
          </div>
          <div className="card p-8 bg-white border-gray-200 shadow-lg">
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required autoComplete="off" className="bg-white border-gray-300 text-gray-900 placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="off" className="bg-white border-gray-300 text-gray-900 placeholder-gray-400 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed">{loading ? 'Signing In...' : 'Sign In'}</button>
              <div className="text-center text-sm text-gray-600">
                <p>Don&apos;t have an account?{' '}<Link href="/auth/signup" className="text-light-blue hover:text-accent-blue font-medium">Sign up</Link></p>
              </div>
              <div className="text-center text-sm">
                <button type="button" onClick={() => setForgotMode(true)} className="text-light-blue hover:text-accent-blue">Forgot password?</button>
              </div>
            </form>
          </div>
          <div className="text-center text-xs text-gray-500 mt-6">
            <p>By signing in, you agree to our <Link href="/terms" className="text-light-blue">Terms of Service</Link> and <Link href="/privacy" className="text-light-blue">Privacy Policy</Link></p>
          </div>
        </div>
      </section>
    </main>
  );
}
