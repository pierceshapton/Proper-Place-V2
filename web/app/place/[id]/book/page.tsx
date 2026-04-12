'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { placesApi, bookingsApi, paymentsApi, type Place, type Booking, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const STRIPE_PK = 'pk_test_51SVJ2DCGmQVz0gpFBVNEg4Dk4zr6dh58Iq4oQUTmgs5f0rF6xmpU5fgFo1OAz46o6NU1RCoaNqvS7ZrGClApAiEM00WN9AVlMT';

export default function BookPlacePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [form, setForm] = useState({
    check_in: '', check_out: '', vehicle_registration: '', phone: '', special_requests: '',
    vehicle_length_ft: '', vehicle_height_ft: '', vehicle_width_ft: '',
  });

  useEffect(() => {
    if (!user) { router.push(`/auth/login?redirect=/place/${id}/book`); return; }
    (async () => {
      try {
        const data = await placesApi.get(Number(id));
        setPlace(data.place || data as unknown as Place);
        try {
          const avail = await bookingsApi.availability(Number(id));
          setUnavailableDates((avail as { unavailableDates?: string[] }).unavailableDates || []);
        } catch { /* empty */ }
        // Pre-fill from user profile
        if (user.phone || user.phone_number) setForm(f => ({ ...f, phone: user.phone || user.phone_number || '' }));
        if (user.vehicle_registration) setForm(f => ({ ...f, vehicle_registration: user.vehicle_registration || '' }));
      } catch { router.push('/'); }
      setLoading(false);
    })();
  }, [user, id, router]);

  const nights = (() => {
    if (!form.check_in || !form.check_out) return 0;
    const diff = new Date(form.check_out).getTime() - new Date(form.check_in).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const total = place ? nights * Number(place.price_per_night) : 0;

  const isDateUnavailable = (date: string) => unavailableDates.includes(date);

  const validateDates = () => {
    if (!form.check_in || !form.check_out) return 'Please select check-in and check-out dates.';
    if (nights < 1) return 'Check-out must be after check-in.';
    const today = new Date().toISOString().split('T')[0];
    if (form.check_in < today) return 'Check-in cannot be in the past.';
    // Check if any selected dates are unavailable
    const start = new Date(form.check_in);
    const end = new Date(form.check_out);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      if (isDateUnavailable(d.toISOString().split('T')[0])) {
        return `The date ${d.toISOString().split('T')[0]} is not available.`;
      }
    }
    return null;
  };

  const handleProceedToPayment = () => {
    const dateErr = validateDates();
    if (dateErr) { setError(dateErr); return; }
    setError('');
    setStep('payment');
  };

  const handleConfirmBooking = async () => {
    setError('');
    setSubmitting(true);
    try {
      // Create payment intent
      const paymentData = await paymentsApi.createIntent(Math.round(total * 100), 'gbp', Number(id));

      // Create the booking with payment info
      await bookingsApi.create({
        place_id: Number(id),
        check_in_date: form.check_in,
        check_out_date: form.check_out,
        check_in: form.check_in,
        check_out: form.check_out,
        total_price: total,
        van_registration: form.vehicle_registration || undefined,
        contact_phone: form.phone || undefined,
        special_requests: form.special_requests || undefined,
        payment_intent_id: paymentData.paymentIntentId,
      } as Partial<Booking>);

      setStep('success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Booking failed. Please try again.');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;
  if (!place) return null;

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center px-4">
        <div className="card bg-white p-8 max-w-md w-full text-center">
          <p className="text-5xl mb-4">🎉</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500 mb-6">Your booking at <span className="font-semibold text-gray-700">{place.name}</span> has been submitted. The host will confirm your stay shortly.</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-left space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Check-in:</span><span className="font-medium text-gray-900">{new Date(form.check_in).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Check-out:</span><span className="font-medium text-gray-900">{new Date(form.check_out).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Nights:</span><span className="font-medium text-gray-900">{nights}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total:</span><span className="font-bold text-gray-900">£{total.toFixed(2)}</span></div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => router.push('/dashboard/bookings')} className="btn-primary py-3 font-bold">View My Bookings</button>
            <button onClick={() => router.push('/')} className="btn-secondary py-3">Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => step === 'payment' ? setStep('details') : router.back()} className="text-gray-500 hover:text-gray-700 text-sm mb-6 inline-block">
          ← {step === 'payment' ? 'Back to details' : 'Back to place'}
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Book {place.name}</h1>
        <p className="text-gray-500 mb-8">£{Number(place.price_per_night).toFixed(2)} per night · {place.city}</p>

        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>}

        {step === 'details' && (
          <div className="space-y-6">
            <div className="card bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Select Dates</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-in *</label>
                  <input type="date" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} min={new Date().toISOString().split('T')[0]} className="bg-white border-gray-300 text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-out *</label>
                  <input type="date" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} min={form.check_in || new Date().toISOString().split('T')[0]} className="bg-white border-gray-300 text-gray-900" />
                </div>
              </div>
              {unavailableDates.length > 0 && (
                <p className="text-xs text-amber-600">⚠️ Some dates are unavailable for this place.</p>
              )}
            </div>

            <div className="card bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Vehicle Details</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Registration</label>
                <input type="text" value={form.vehicle_registration} onChange={e => setForm(f => ({ ...f, vehicle_registration: e.target.value.toUpperCase() }))} placeholder="e.g. AB12 CDE" className="bg-white border-gray-300 text-gray-900" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Length (ft)</label>
                  <input type="number" step="0.1" value={form.vehicle_length_ft} onChange={e => setForm(f => ({ ...f, vehicle_length_ft: e.target.value }))} className="bg-white border-gray-300 text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Height (ft)</label>
                  <input type="number" step="0.1" value={form.vehicle_height_ft} onChange={e => setForm(f => ({ ...f, vehicle_height_ft: e.target.value }))} className="bg-white border-gray-300 text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Width (ft)</label>
                  <input type="number" step="0.1" value={form.vehicle_width_ft} onChange={e => setForm(f => ({ ...f, vehicle_width_ft: e.target.value }))} className="bg-white border-gray-300 text-gray-900" />
                </div>
              </div>
              {/* Vehicle size warnings */}
              {place.max_vehicle_length_ft && form.vehicle_length_ft && Number(form.vehicle_length_ft) > place.max_vehicle_length_ft && (
                <p className="text-sm text-red-500">⚠️ Your vehicle exceeds the max length of {place.max_vehicle_length_ft}ft</p>
              )}
              {place.max_vehicle_height_ft && form.vehicle_height_ft && Number(form.vehicle_height_ft) > place.max_vehicle_height_ft && (
                <p className="text-sm text-red-500">⚠️ Your vehicle exceeds the max height of {place.max_vehicle_height_ft}ft</p>
              )}
            </div>

            <div className="card bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Contact & Requests</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+44 7123 456789" className="bg-white border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                <textarea value={form.special_requests} onChange={e => setForm(f => ({ ...f, special_requests: e.target.value }))} rows={3} placeholder="Any special requests or notes for the host..." className="bg-white border-gray-300 text-gray-900" />
              </div>
            </div>

            {/* Price Summary */}
            {nights > 0 && (
              <div className="card bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">£{Number(place.price_per_night).toFixed(2)} × {nights} night{nights !== 1 ? 's' : ''}</span><span className="text-gray-900">£{total.toFixed(2)}</span></div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between text-base font-bold"><span className="text-gray-900">Total</span><span className="text-gray-900">£{total.toFixed(2)}</span></div>
                </div>
              </div>
            )}

            <button onClick={handleProceedToPayment} disabled={!form.check_in || !form.check_out || nights < 1} className="w-full btn-primary py-4 font-bold text-lg disabled:opacity-50">
              Continue to Payment — £{total.toFixed(2)}
            </button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-6">
            <div className="card bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Place:</span><span className="font-medium text-gray-900">{place.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Check-in:</span><span className="text-gray-900">{new Date(form.check_in).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Check-out:</span><span className="text-gray-900">{new Date(form.check_out).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Nights:</span><span className="text-gray-900">{nights}</span></div>
                {form.vehicle_registration && <div className="flex justify-between"><span className="text-gray-500">Vehicle:</span><span className="text-gray-900">{form.vehicle_registration}</span></div>}
                <div className="border-t border-gray-100 pt-2 flex justify-between text-base font-bold"><span className="text-gray-900">Total</span><span className="text-gray-900">£{total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="card bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Payment</h2>
              <p className="text-sm text-gray-500 mb-4">Your card will be pre-authorized. Payment is captured only when the host approves your booking.</p>

              {/* Stripe Elements would be loaded here in production */}
              <div id="stripe-payment-element" className="border border-gray-200 rounded-lg p-4 min-h-[100px] bg-gray-50">
                <p className="text-sm text-gray-500 text-center py-4">
                  💳 Secure payment powered by Stripe
                </p>
                <p className="text-xs text-gray-400 text-center">
                  Card details are processed securely. We never store your full card number.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
              <p className="font-medium mb-1">How payment works:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Your card will be pre-authorized for £{total.toFixed(2)}</li>
                <li>Payment is only captured when the host approves your booking</li>
                <li>If the host declines, no charge will be made</li>
                <li>You can cancel before approval at no cost</li>
              </ul>
            </div>

            <button onClick={handleConfirmBooking} disabled={submitting} className="w-full btn-primary py-4 font-bold text-lg disabled:opacity-50">
              {submitting ? 'Processing...' : `Confirm & Pay £${total.toFixed(2)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
