
"use client";
import { useState } from 'react';

export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setMessage('Your account deletion request has been received. We will process it as soon as possible.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Delete Your Account</h1>
      <p className="mb-4">Enter your email address to request deletion of your Proper Place account and all associated data. This process is irreversible.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          className="w-full border rounded px-3 py-2"
          placeholder="Your email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-red-600 text-white py-2 rounded font-semibold hover:bg-red-700"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Submitting...' : 'Request Account Deletion'}
        </button>
      </form>
      {message && (
        <div className={`mt-4 ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message}</div>
      )}
    </div>
  );
}
