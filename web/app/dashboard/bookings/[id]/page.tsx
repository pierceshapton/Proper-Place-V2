'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { bookingsApi, reviewsApi, chatApi, type Booking } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function BookingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [showReview, setShowReview] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelWarning, setCancelWarning] = useState('');

  useEffect(() => {
    if (!id) return;
    bookingsApi.get(Number(id))
      .then(data => setBooking(data.booking || data as unknown as Booking))
      .catch(() => router.push('/dashboard/bookings'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const isWithin24h = () => {
    if (!booking) return true;
    const checkIn = new Date(booking.check_in_date || booking.check_in);
    return (checkIn.getTime() - Date.now()) / (1000 * 60 * 60) <= 24;
  };

  const startCancel = () => {
    setCancelWarning('');
    setShowCancelModal(true);
  };

  const handleCancel = async () => {
    if (!booking) return;
    try {
      await bookingsApi.cancel(booking.id);
      setBooking({ ...booking, status: 'cancelled' });
      setShowCancelModal(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel');
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    try {
      await reviewsApi.create(booking.place_id, reviewForm);
      alert('Review submitted!');
      setShowReview(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to submit review');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !messageText.trim()) return;
    try {
      // Send to the place owner (host)
      const hostId = booking.place_user_id || booking.user_id;
      await chatApi.send({ receiver_id: hostId, content: messageText, booking_id: booking.id });
      setMessageText('');
      setShowMessage(false);
      alert('Message sent!');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send message');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;
  if (!booking) return <div className="text-center py-20 text-gray-500">Booking not found</div>;

  const isPast = new Date(booking.check_out_date) < new Date();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 text-lg">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
      </div>

      {/* Place / Site info */}
      {booking.place_id && (
        <Link href={`/place/${booking.place_id}`} className="card bg-white p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
          {booking.place_image_urls?.length ? (
            <img src={booking.place_image_urls[0]} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
          ) : booking.place_image ? (
            <img src={booking.place_image} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-3xl flex-shrink-0">🏕️</div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{booking.place_name || 'View Place'}</h2>
            {booking.place_address && <p className="text-sm text-gray-500 mt-1">{booking.place_address}</p>}
            <p className="text-sm text-light-blue mt-1">View site details →</p>
          </div>
        </Link>
      )}

      <div className="card bg-white p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{booking.place_name || `Booking #${booking.id}`}</h2>
            {booking.booking_ref && <p className="text-sm text-gray-500 mt-1">Ref: {booking.booking_ref}</p>}
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${
            booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
            'bg-red-100 text-red-700'
          }`}>{booking.status}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Check-in</p>
            <p className="font-medium text-gray-900">{new Date(booking.check_in_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            {booking.check_in_time && <p className="text-gray-500">{booking.check_in_time}</p>}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Check-out</p>
            <p className="font-medium text-gray-900">{new Date(booking.check_out_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            {booking.check_out_time && <p className="text-gray-500">{booking.check_out_time}</p>}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total Price</p>
            <p className="font-bold text-xl text-gray-900">£{Number(booking.total_price).toFixed(2)}</p>
          </div>
          {booking.van_registration && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Vehicle Registration</p>
              <p className="font-medium text-gray-900">{booking.van_registration}</p>
            </div>
          )}
          {booking.contact_phone && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Contact Phone</p>
              <p className="font-medium text-gray-900">{booking.contact_phone}</p>
            </div>
          )}
          {booking.special_requests && (
            <div className="bg-gray-50 rounded-lg p-4 sm:col-span-2">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Special Requests</p>
              <p className="text-gray-900">{booking.special_requests}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
          {booking.place_id && (
            <Link href={`/place/${booking.place_id}`} className="btn-secondary py-2 px-4 text-sm">View Place</Link>
          )}
          <button onClick={() => setShowMessage(true)} className="btn-secondary py-2 px-4 text-sm">Message Host</button>
          {isPast && booking.status === 'completed' && (
            <button onClick={() => setShowReview(true)} className="btn-primary py-2 px-4 text-sm">Leave Review</button>
          )}
          {(booking.status === 'pending' || booking.status === 'confirmed') && !isWithin24h() && (
            <button onClick={startCancel} className="bg-red-50 text-red-600 hover:bg-red-100 py-2 px-4 rounded-lg text-sm font-medium transition-colors">Cancel Booking</button>
          )}
        </div>
      </div>

      {/* Message modal */}
      {showMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMessage(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Message Host</h3>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <textarea value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type your message..." rows={4} required className="bg-white border-gray-300 text-gray-900" />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowMessage(false)} className="btn-secondary py-2 px-4 text-sm">Cancel</button>
                <button type="submit" className="btn-primary py-2 px-4 text-sm">Send</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review modal */}
      {showReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReview(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Leave a Review</h3>
            <form onSubmit={handleReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} type="button" onClick={() => setReviewForm(f => ({ ...f, rating: star }))} className={`text-3xl ${star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={reviewForm.title} onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))} placeholder="Summary of your stay" className="bg-white border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                <textarea value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} placeholder="Tell others about your experience..." rows={4} className="bg-white border-gray-300 text-gray-900" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowReview(false)} className="btn-secondary py-2 px-4 text-sm">Cancel</button>
                <button type="submit" className="btn-primary py-2 px-4 text-sm">Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Booking</h3>
            <p className="text-sm text-gray-600 mb-2">Are you sure you want to cancel this booking? Payment will be refunded.</p>
            {cancelWarning && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">⚠️ {cancelWarning}</p>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowCancelModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Keep Booking</button>
              <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Cancel Booking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
