'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function SignupPage() {
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
          <div className="card p-8 bg-white border-gray-200 shadow-lg">
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
              <div className="text-center text-sm text-gray-600">
                <p>Already have an account?{' '}<Link href="/auth/login" className="text-light-blue hover:text-accent-blue font-medium">Sign in</Link></p>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
