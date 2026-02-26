'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid email or password');
      }

      // Handle successful login - store token, redirect, etc.
      const data = await response.json();
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section className="min-h-screen bg-light-gray text-gray-900 flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-light-blue">Proper</span> Place
            </h1>
            <p className="text-gray-600">Welcome back</p>
          </div>

          <div className="card p-8 bg-white border-gray-200 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                />
              </div>

              {error && (
                <div className="bg-red-500 text-white px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="text-center text-sm text-gray-600">
                <p>
                  Don't have an account?{' '}
                  <Link href="/auth/signup" className="text-light-blue hover:text-accent-blue font-medium">
                    Sign up
                  </Link>
                </p>
              </div>

              <div className="text-center text-sm">
                <Link href="#" className="text-light-blue hover:text-accent-blue">
                  Forgot password?
                </Link>
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
