'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function SignupPage() {
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [role, setRole] = useState<'user' | 'host'>('user');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { signup } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role,
      });
      router.push('/auth/verify-email');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section className="min-h-screen bg-light-gray text-gray-900 flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2"><span className="text-light-blue">Proper</span> Place</h1>
            <p className="text-gray-600">Create your account</p>
          </div>

          {step === 'role' ? (
            <div className="card p-8 bg-white border-gray-200 shadow-lg">
              <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">How are you joining?</h2>
              <p className="text-sm text-gray-500 text-center mb-6">Choose the option that best describes you</p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    role === 'user'
                      ? 'border-light-blue bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${role === 'user' ? 'bg-light-blue/20' : 'bg-gray-100'}`}>
                    🚐
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">I'm travelling</p>
                    <p className="text-sm text-gray-500">I want to find and book places to stay</p>
                  </div>
                  {role === 'user' && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-light-blue flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setRole('host')}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    role === 'host'
                      ? 'border-light-blue bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${role === 'host' ? 'bg-light-blue/20' : 'bg-gray-100'}`}>
                    🏡
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">I'm hosting</p>
                    <p className="text-sm text-gray-500">I have a property or land I want to list</p>
                  </div>
                  {role === 'host' && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-light-blue flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep('details')}
                className="btn-primary w-full py-3 font-bold mt-6"
              >
                Continue
              </button>
              <div className="text-center text-sm text-gray-600 mt-4">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-light-blue hover:text-accent-blue font-medium">Sign in</Link>
              </div>
            </div>
          ) : (
            <div className="card p-8 bg-white border-gray-200 shadow-lg">
              <button
                type="button"
                onClick={() => setStep('role')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 -ml-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <span className="text-lg">{role === 'host' ? '🏡' : '🚐'}</span>
                <span className="text-sm font-medium text-gray-700">
                  Signing up to <strong>{role === 'host' ? 'host a property' : 'travel'}</strong>
                </span>
              </div>
              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required autoComplete="off" className="bg-white border-gray-300 text-gray-900 placeholder-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" required autoComplete="off" className="bg-white border-gray-300 text-gray-900 placeholder-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Min 8 characters" required autoComplete="new-password" className="bg-white border-gray-300 text-gray-900 placeholder-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Confirm Password</label>
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required autoComplete="new-password" className="bg-white border-gray-300 text-gray-900 placeholder-gray-400" />
                </div>
                {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
                <div className="flex items-start gap-2">
                  <input type="checkbox" name="terms" id="terms" checked={formData.terms} onChange={handleChange} required className="mt-1" />
                  <label htmlFor="terms" className="text-xs text-gray-600">
                    I agree to the <Link href="/terms" className="text-light-blue">Terms of Service</Link> and <Link href="/privacy" className="text-light-blue">Privacy Policy</Link>
                  </label>
                </div>
                <button type="submit" disabled={loading || !formData.terms} className="btn-primary w-full py-3 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed mt-2">
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

