'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { placesApi, bookingsApi, paymentsApi, type Place, type Booking, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import BookingCalendar from '@/components/BookingCalendar';

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PK || 'pk_live_51SVJ24CIGE5EfNdigyfa7RcU0uRc2tmZF27l34IkQd3TWL9m9dF052YL8ericcNjVHVkdnQLBQmLkySGBFgFs3LQ00t8PDFNS0';
const stripePromise = loadStripe(STRIPE_PK);

/* ── Payment form (rendered inside Stripe <Elements>) ───────────── */
function PaymentForm({ onSuccess, onError, total, submitting, setSubmitting }: {
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
  total: number;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    stripePromise.then((s) => {
      if (!s) setLoadError('Stripe failed to load. Please disable any ad blockers and refresh the page.');
    }).catch(() => {
      setLoadError('Stripe could not be initialised. Please refresh and try again.');
    });
  }, []);

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      onError('Payment system not ready. Please wait a moment and try again.');
      return;
    }
    setSubmitting(true);
    onError('');

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });

      if (result.error) {
        onError(result.error.message || 'Payment failed. Please try again.');
        setSubmitting(false);
      } else if (result.paymentIntent) {
        onSuccess(result.paymentIntent.id);
      } else {
        onError('Something went wrong. Please try again.');
        setSubmitting(false);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed unexpectedly.');
      setSubmitting(false);
    }
  };

  if (loadError) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{loadError}</div>;
  }

  return (
    <>
      <PaymentElement />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !stripe}
        className="w-full bg-light-blue hover:bg-accent-blue text-white py-4 rounded-lg font-bold text-lg disabled:opacity-50 mt-6 transition-colors cursor-pointer"
      >
        {submitting ? 'Processing payment...' : `Confirm & Pay £${total.toFixed(2)}`}
      </button>
    </>
  );
}

export default function BookPlacePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [userBookingBoundaries, setUserBookingBoundaries] = useState<string[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [form, setForm] = useState({
    check_in: '', check_out: '', special_requests: '',
    check_in_time: '12:00', check_out_time: '12:00',
    electricHookup: false,
  });

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish loading
    if (!user) { router.push(`/auth/login?redirect=/place/${id}/book`); return; }
    (async () => {
      try {
        const data = await placesApi.get(Number(id));
        setPlace(data.place || data as unknown as Place);

        // Fetch place-level availability
        const blocked: string[] = [];
        try {
          const avail = await bookingsApi.availability(Number(id));
          const dates = (avail as { unavailableDates?: string[] }).unavailableDates || [];
          blocked.push(...dates);
        } catch { /* empty */ }

        // Fetch user's existing bookings and block those dates too
        const boundaries: string[] = [];
        try {
          const { bookings } = await bookingsApi.list();
          const activeBookings = (bookings || []).filter(
            (b: Booking) => !['cancelled', 'Cancelled', 'rejected', 'Rejected'].includes(b.status)
          );
          for (const b of activeBookings) {
            const start = new Date(b.check_in_date || b.check_in);
            const end = new Date(b.check_out_date || b.check_out);
            const startStr = start.toISOString().split('T')[0];
            // Track check-in dates as boundaries (can be used as checkout for new booking)
            if (!boundaries.includes(startStr)) boundaries.push(startStr);
            for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
              const ds = d.toISOString().split('T')[0];
              if (!blocked.includes(ds)) blocked.push(ds);
            }
          }
        } catch { /* user bookings fetch failed – continue without */ }

        setUnavailableDates(blocked);
        setUserBookingBoundaries(boundaries);
      } catch { router.push('/'); }
      setLoading(false);
    })();
  }, [user, authLoading, id, router]);

  const nights = (() => {
    if (!form.check_in || !form.check_out) return 0;
    const diff = new Date(form.check_out).getTime() - new Date(form.check_in).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const HOURLY_FEE_RATE = 5;
  const [ciH] = form.check_in_time.split(':').map(Number);
  const [coH] = form.check_out_time.split(':').map(Number);
  const earlyCheckinFee = ciH < 12 ? (12 - ciH) * HOURLY_FEE_RATE : 0;
  const lateCheckoutFee = coH > 12 ? (coH - 12) * HOURLY_FEE_RATE : 0;

  const overnightCost = place ? nights * Number(place.price_per_night) : 0;
  const serviceFee = overnightCost * 0.18;
  const electricFee = form.electricHookup && place?.electric_hookup_available && nights > 0
    ? Number(place.electric_hookup_price_per_night || 0) * nights
    : 0;
  const total = overnightCost + serviceFee + earlyCheckinFee + lateCheckoutFee + electricFee;

  const isDateUnavailable = (date: string) => unavailableDates.includes(date);

  const validateDates = () => {
    if (!form.check_in || !form.check_out) return 'Please select check-in and check-out dates.';
    if (nights < 1) return 'Check-out must be after check-in.';
    const today = new Date().toISOString().split('T')[0];
    if (form.check_in < today) return 'Check-in cannot be in the past.';
    // Check if any selected NIGHTS are unavailable (nights = check_in to check_out - 1)
    // Checkout date is NOT a night, so skip it. Also skip boundary dates that are
    // check-in days of existing bookings (allowed as checkout targets).
    const start = new Date(form.check_in);
    const end = new Date(form.check_out);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0];
      if (isDateUnavailable(ds)) {
        return `The date ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} is not available — you may already have a booking for these dates.`;
      }
    }
    return null;
  };

  const handleProceedToPayment = async () => {
    const dateErr = validateDates();
    if (dateErr) { setError(dateErr); return; }
    setError('');
    setSubmitting(true);
    try {
      const paymentData = await paymentsApi.createIntent(Math.round(total * 100), 'gbp', Number(id));
      const secret = paymentData.clientSecret || (paymentData as Record<string, unknown>).client_secret as string;
      if (!secret) {
        setError('Payment setup failed — no client secret returned. Please try again.');
        setSubmitting(false);
        return;
      }
      setClientSecret(secret);
      setStep('payment');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not initialise payment. Please try again.');
    }
    setSubmitting(false);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      await bookingsApi.create({
        place_id: Number(id),
        check_in_date: form.check_in,
        check_out_date: form.check_out,
        check_in: form.check_in,
        check_out: form.check_out,
        check_in_time: form.check_in_time,
        check_out_time: form.check_out_time,
        total_price: total,
        van_registration: user?.vehicle_registration || undefined,
        contact_phone: user?.phone || user?.phone_number || undefined,
        special_requests: form.special_requests || undefined,
        payment_intent_id: paymentIntentId,
        electric_hookup: form.electricHookup,
      } as Partial<Booking>);

      setStep('success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Booking failed. Please try again.');
    }
    setSubmitting(false);
  };

  if (loading || authLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;
  if (!place) return null;

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center px-4">
        <div className="card bg-white p-8 max-w-md w-full text-center">
          <p className="text-5xl mb-4">🎉</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500 mb-6">Your booking at <span className="font-semibold text-gray-700">{place.name}</span> has been submitted. The host will confirm your stay shortly.</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-left space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Check-in:</span><span className="font-medium text-gray-900">{new Date(form.check_in).toLocaleDateString()} at {form.check_in_time}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Check-out:</span><span className="font-medium text-gray-900">{new Date(form.check_out).toLocaleDateString()} at {form.check_out_time}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Nights:</span><span className="font-medium text-gray-900">{nights}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total:</span><span className="font-bold text-gray-900">£{total.toFixed(2)}</span></div>
          </div>
          {form.electricHookup ? (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg p-3 mb-6">
              <span>⚡</span>
              <span>Electric hookup included on this booking.</span>
            </div>
          ) : place?.electric_hookup_available ? (
            <div className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              🔋 This booking doesn&apos;t include an electric hookup — you&apos;ll be self-sufficient on this one. Most motorhomers are well prepared for this, but it&apos;s worth making sure you&apos;re charged up before you arrive.
            </div>
          ) : null}
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
              <BookingCalendar
                checkIn={form.check_in}
                checkOut={form.check_out}
                unavailableDates={unavailableDates}
                checkoutAllowedDates={userBookingBoundaries}
                onSelect={(ci, co) => {
                  const today = new Date().toISOString().split('T')[0];
                  const now = new Date();
                  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                  setForm(f => ({
                    ...f,
                    check_in: ci,
                    check_out: co,
                    check_in_time: ci === today ? nowTime : '12:00',
                    check_out_time: '12:00',
                  }));
                }}
              />
              {unavailableDates.length > 0 && (
                <p className="text-xs text-amber-600">⚠️ Some dates are unavailable — either this place is full or you already have a booking.</p>
              )}
              {(() => {
                if (!form.check_in || !form.check_out) return null;
                const dateErr = validateDates();
                if (dateErr && dateErr.includes('not available')) {
                  return <p className="text-sm text-red-600 font-medium">⛔ {dateErr}</p>;
                }
                return null;
              })()}

              {/* Check-in / Check-out Times */}
              {form.check_in && form.check_out && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in time</label>
                    <input
                      type="time"
                      value={form.check_in_time}
                      onChange={e => setForm(f => ({ ...f, check_in_time: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white"
                    />
                    {earlyCheckinFee > 0 && (
                      <p className="text-xs text-amber-600 mt-1">Early arrival +£{earlyCheckinFee.toFixed(0)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out time</label>
                    <input
                      type="time"
                      value={form.check_out_time}
                      onChange={e => setForm(f => ({ ...f, check_out_time: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white"
                    />
                    {lateCheckoutFee > 0 && (
                      <p className="text-xs text-amber-600 mt-1">Late departure +£{lateCheckoutFee.toFixed(0)}</p>
                    )}
                  </div>
                  <p className="col-span-2 text-xs text-gray-400">Standard check-in/out is 12:00. £5/hr applies for early arrivals (before 12:00) or late departures (after 12:00).</p>
                </div>
              )}
            </div>

            <div className="card bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Special Requests</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes for the host (optional)</label>
                <textarea value={form.special_requests} onChange={e => setForm(f => ({ ...f, special_requests: e.target.value }))} rows={3} placeholder="Any special requests or notes for the host..." className="bg-white border-gray-300 text-gray-900" />
              </div>
              {user?.phone_number || user?.phone ? (
                <p className="text-xs text-gray-400">Contact phone from your profile: {user?.phone || user?.phone_number}</p>
              ) : null}
              {user?.vehicle_registration ? (
                <p className="text-xs text-gray-400">Vehicle registration from your profile: {user.vehicle_registration}</p>
              ) : null}
            </div>

            {/* Electric Hookup Option */}
            {place?.electric_hookup_available && (
              <div className="card bg-white p-6">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-semibold text-gray-900">⚡ Electric hookup</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {place.electric_hookup_price_per_night && Number(place.electric_hookup_price_per_night) > 0
                        ? `+£${Number(place.electric_hookup_price_per_night).toFixed(0)}/night`
                        : 'Included free'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[#7BA7D8] cursor-pointer"
                    checked={form.electricHookup}
                    onChange={e => setForm(f => ({ ...f, electricHookup: e.target.checked }))}
                  />
                </label>
              </div>
            )}

            {/* Price Summary */}
            {nights > 0 && (
              <div className="card bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Overnight fee × {nights} night{nights !== 1 ? 's' : ''}</span><span className="text-gray-900">£{overnightCost.toFixed(2)}</span></div>
                  {nights > 0 && (
                    <div className="flex justify-between"><span className="text-gray-500">Service fee + VAT</span><span className="text-gray-900">£{serviceFee.toFixed(2)}</span></div>
                  )}
                  {earlyCheckinFee > 0 && (
                    <div className="flex justify-between"><span className="text-amber-600">Early arrival fee ({form.check_in_time})</span><span className="text-gray-900">£{earlyCheckinFee.toFixed(2)}</span></div>
                  )}
                  {lateCheckoutFee > 0 && (
                    <div className="flex justify-between"><span className="text-amber-600">Late departure fee ({form.check_out_time})</span><span className="text-gray-900">£{lateCheckoutFee.toFixed(2)}</span></div>
                  )}
                  {form.electricHookup && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">⚡ Electric hookup × {nights} night{nights !== 1 ? 's' : ''}</span>
                      <span className="text-gray-900">{electricFee > 0 ? `£${electricFee.toFixed(2)}` : <span className="text-green-600">Free</span>}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-2 flex justify-between text-base font-bold"><span className="text-gray-900">Total</span><span className="text-gray-900">£{total.toFixed(2)}</span></div>
                </div>
              </div>
            )}

            <button onClick={handleProceedToPayment} disabled={!form.check_in || !form.check_out || nights < 1 || submitting} className="w-full btn-primary py-4 font-bold text-lg disabled:opacity-50">
              {submitting ? 'Setting up payment...' : `Continue to Payment — £${total.toFixed(2)}`}
            </button>
          </div>
        )}

        {step === 'payment' && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <div className="space-y-6">
              <div className="card bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Place:</span><span className="font-medium text-gray-900">{place.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Check-in:</span><span className="text-gray-900">{new Date(form.check_in).toLocaleDateString()} at {form.check_in_time}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Check-out:</span><span className="text-gray-900">{new Date(form.check_out).toLocaleDateString()} at {form.check_out_time}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Nights:</span><span className="text-gray-900">{nights}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Overnight cost:</span><span className="text-gray-900">£{overnightCost.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Service fee + VAT:</span><span className="text-gray-900">£{serviceFee.toFixed(2)}</span></div>
                  {user?.vehicle_registration && <div className="flex justify-between"><span className="text-gray-500">Vehicle:</span><span className="text-gray-900">{user.vehicle_registration}</span></div>}
                  <div className="border-t border-gray-100 pt-2 flex justify-between text-base font-bold"><span className="text-gray-900">Total</span><span className="text-gray-900">£{total.toFixed(2)}</span></div>
                </div>
              </div>

              <div className="card bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Payment</h2>
                <p className="text-sm text-gray-500 mb-4">Your card will be pre-authorised. Payment is captured only when the host approves your booking.</p>
                <PaymentForm
                  onSuccess={handlePaymentSuccess}
                  onError={setError}
                  total={total}
                  submitting={submitting}
                  setSubmitting={setSubmitting}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                <p className="font-medium mb-1">How payment works:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Your card will be pre-authorised for £{total.toFixed(2)}</li>
                  <li>Payment is only captured when the host approves your booking</li>
                  <li>If the host declines, no charge will be made</li>
                  <li>You can cancel before approval at no cost</li>
                </ul>
              </div>
            </div>
          </Elements>
        )}
      </div>
    </div>
  );
}
