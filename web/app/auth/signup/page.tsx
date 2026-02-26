'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'guest',
    terms: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          userType: formData.userType,
        }),
      });

      if (!response.ok) {
        throw new Error('Signup failed');
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <section className="min-h-screen bg-light-gray text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4 text-green-600">✓ Signup Successful!</h2>
          <p className="text-gray-600 mb-6">Redirecting to login...</p>
        </div>
      </section>
    );
  }

  return (
    <main>
      <section className="min-h-screen bg-light-gray text-gray-900 flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-light-blue">Proper</span> Place
            </h1>
            <p className="text-gray-600">Create your account</p>
          </div>

          <div className="card p-8 bg-white border-gray-200 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    required
                    className="bg-white border-gray-300 text-gray-900 placeholder-gray-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    required
                    className="bg-white border-gray-300 text-gray-900 placeholder-gray-400 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  required
                  className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">I am a</label>
                <select
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                  className="bg-white border-gray-300 text-gray-900"
                >
                  <option value="guest">Guest (Looking to book)</option>
                  <option value="host">Host (Listing a space)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
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

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  name="terms"
                  id="terms"
                  checked={formData.terms}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-xs text-gray-600">
                  I agree to the <Link href="/terms" className="text-light-blue">Terms of Service</Link> and <Link href="/privacy" className="text-light-blue">Privacy Policy</Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !formData.terms}
                className="btn-primary w-full py-3 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed mt-6"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <div className="text-center text-sm text-gray-600 mt-4">
                <p>
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-light-blue hover:text-accent-blue font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>

          <div className="text-center text-xs text-gray-500 mt-6">
            <p>By signing up, you agree to our <Link href="/terms" className="text-light-blue">Terms of Service</Link> and <Link href="/privacy" className="text-light-blue">Privacy Policy</Link></p>
          </div>
        </div>
      </section>
    </main>
  );
}
