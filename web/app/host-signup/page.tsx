'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function HostSignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    propertyType: '',
    location: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://octopus-app-lxh2t.ondigitalocean.app';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/host-leads/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="bg-cream min-h-screen">
        <section className="relative bg-dark-bg text-white py-16 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80"
              alt="Beautiful farmland"
              fill
              className="object-cover opacity-30"
              priority
            />
          </div>
          <div className="relative container-md text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Thanks, {formData.firstName}!
            </h1>
            <p className="text-xl text-gray-200 mb-2">
              We&apos;ve got your details and will be in touch shortly.
            </p>
            <p className="text-gray-300 mb-8">
              In the meantime, download the Proper Place app to get started as a host.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/download" className="bg-light-blue hover:bg-accent-blue text-white px-8 py-4 rounded-xl font-semibold transition-colors inline-flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download the App
              </Link>
              <Link href="/become-host" className="border-2 border-white text-white hover:bg-white hover:text-dark-bg px-8 py-4 rounded-xl font-semibold transition-colors inline-flex items-center justify-center">
                Learn More About Hosting
              </Link>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto">
              <h3 className="font-semibold text-lg mb-2">What happens next?</h3>
              <ul className="text-left text-gray-200 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-light-blue font-bold">1.</span>
                  We&apos;ll review your details and get in touch
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-light-blue font-bold">2.</span>
                  Download the app and create your host account
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-light-blue font-bold">3.</span>
                  List your space and start welcoming guests
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-cream min-h-screen">
      {/* Hero */}
      <section className="relative bg-dark-bg text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80"
            alt="Beautiful farmland"
            fill
            className="object-cover opacity-30"
            priority
          />
        </div>
        <div className="relative container-md text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Earn Money From Your Land
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
            Register your interest below and we&apos;ll help you get started as a Proper Place host. It only takes a minute.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-12 md:py-16">
        <div className="container-md max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
            <h2 className="text-2xl font-bold mb-2 text-center">Register Your Interest</h2>
            <p className="text-gray-500 text-center mb-8">
              Fill in your details and we&apos;ll be in touch to help you get set up.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Smith"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="07123 456789"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="propertyType" className="block text-sm font-semibold text-gray-700 mb-1">
                  What type of space do you have? <span className="text-red-500">*</span>
                </label>
                <select
                  id="propertyType"
                  name="propertyType"
                  required
                  value={formData.propertyType}
                  onChange={handleChange}
                  className="w-full"
                >
                  <option value="">Select a type...</option>
                  <option value="farmland">Farmland</option>
                  <option value="large-garden">Large Garden / Driveway</option>
                  <option value="vineyard">Vineyard / Orchard</option>
                  <option value="coastal">Coastal Land</option>
                  <option value="woodland">Woodland / Forest</option>
                  <option value="pub-car-park">Pub Car Park</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-1">
                  Location (town or postcode)
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Bath, Somerset or BA1 1AA"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-1">
                  Anything else you&apos;d like us to know?
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={3}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your space, any facilities you can offer, etc."
                  className="w-full"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-light-blue hover:bg-accent-blue text-white py-4 rounded-xl font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Register My Interest'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                By submitting, you agree to our{' '}
                <Link href="/privacy" className="text-light-blue hover:underline">Privacy Policy</Link>.
                We&apos;ll only use your details to contact you about hosting.
              </p>
            </form>
          </div>

          {/* Quick Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {[
              { icon: '💷', title: 'Free to List', desc: 'No upfront costs' },
              { icon: '🏡', title: 'You\'re in Control', desc: 'Set your own prices & rules' },
              { icon: '🔒', title: 'Secure Payments', desc: 'Paid directly to you' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-5 text-center shadow-md">
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
