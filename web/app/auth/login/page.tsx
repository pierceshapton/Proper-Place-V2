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
      <section className="min-h-screen bg-dark-bg text-white flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-light-blue">Proper</span> Place
            </h1>
            <p className="text-gray-400">Welcome back</p>
          </div>

          <div className="card p-8 bg-gray-900 border-gray-800">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
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
                className="btn-primary w-full py-3 font-bold disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="text-center text-sm text-gray-400">
                <p>
                  Don't have an account?{' '}
                  <Link href="/auth/signup" className="text-light-blue hover:text-accent-blue">
                    Sign up
                  </Link>
                </p>
              </div>

              <div className="text-center text-sm text-gray-400">
                <Link href="#" className="text-light-blue hover:text-accent-blue">
                  Forgot password?
                </Link>
              </div>
            </form>
          </div>

          <div className="text-center text-xs text-gray-500 mt-6">
            <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>
      </section>
    </main>
  );
}
