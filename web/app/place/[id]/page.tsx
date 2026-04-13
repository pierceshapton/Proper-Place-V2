'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { placesApi, reviewsApi, bookingsApi, type Place, type Review } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function PlaceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [place, setPlace] = useState<Place | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await placesApi.get(Number(id));
      setPlace(data.place || data as unknown as Place);
      const revData = await reviewsApi.forPlace(Number(id));
      setReviews(revData.reviews || []);
      try {
        const avail = await bookingsApi.availability(Number(id));
        setUnavailableDates((avail as { unavailableDates?: string[] }).unavailableDates || []);
      } catch { /* empty */ }
    } catch {
      router.push('/');
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-light-blue"></div></div>;
  if (!place) return null;

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const images = place.image_urls?.length ? place.image_urls : [''];

  return (
    <div className="min-h-screen bg-light-gray">
      {/* Image Gallery */}
      <div className="relative bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="relative aspect-[16/9] md:aspect-[21/9]">
            {images[0] ? (
              <img src={images[imgIdx]} alt={place.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400 text-6xl">📍</div>
            )}
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/70 text-lg">‹</button>
                <button onClick={() => setImgIdx(i => (i + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/70 text-lg">›</button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, i) => <button key={i} onClick={() => setImgIdx(i)} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`} />)}
                </div>
              </>
            )}
          </div>
        </div>
        <button onClick={() => router.back()} className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-full text-sm hover:bg-black/70 transition-colors">← Back</button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{place.name}</h1>
                  <p className="text-gray-500 mt-1">{place.address}, {place.city}{place.postal_code ? `, ${place.postal_code}` : ''}</p>
                </div>
                {avgRating > 0 && (
                  <div className="shrink-0 text-center">
                    <p className="text-2xl font-bold text-yellow-500">{'★'.repeat(Math.round(avgRating))}</p>
                    <p className="text-xs text-gray-400">{avgRating.toFixed(1)} ({reviews.length})</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="bg-light-blue/10 text-light-blue text-xs font-medium px-3 py-1 rounded-full">{place.place_type?.replace('_', ' ')}</span>
                {place.capacity && <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{place.capacity} spaces</span>}
              </div>
            </div>

            {place.description && (
              <div className="card bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About This Place</h2>
                <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{place.description}</p>
              </div>
            )}

            {place.amenities && place.amenities.length > 0 && (
              <div className="card bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {place.amenities.map(a => (
                    <div key={a} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-green-500">✓</span> {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(place.max_vehicle_length_ft || place.max_vehicle_height_ft || place.max_vehicle_width_ft) && (
              <div className="card bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Vehicle Size Limits</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {place.max_vehicle_length_ft && (
                    <div><p className="text-2xl font-bold text-gray-900">{place.max_vehicle_length_ft}ft</p><p className="text-xs text-gray-500">Max Length</p></div>
                  )}
                  {place.max_vehicle_height_ft && (
                    <div><p className="text-2xl font-bold text-gray-900">{place.max_vehicle_height_ft}ft</p><p className="text-xs text-gray-500">Max Height</p></div>
                  )}
                  {place.max_vehicle_width_ft && (
                    <div><p className="text-2xl font-bold text-gray-900">{place.max_vehicle_width_ft}ft</p><p className="text-xs text-gray-500">Max Width</p></div>
                  )}
                </div>
              </div>
            )}

            {place.access_route_description && (
              <div className="card bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Access Route</h2>
                <p className="text-gray-600">{place.access_route_description}</p>
              </div>
            )}

            {place.serves_food && (
              <div className="card bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">🍽️ Food Available</h2>
                {place.food_menu_description && <p className="text-gray-600">{place.food_menu_description}</p>}
              </div>
            )}

            {place.opening_hours && (
              <div className="card bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Opening Hours</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{place.opening_hours}</p>
              </div>
            )}

            {/* Reviews */}
            <div className="card bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reviews ({reviews.length})</h2>
              {reviews.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">{r.user?.name || r.user_name || 'Guest'}</span>
                          <span className="text-yellow-500 text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        </div>
                        <span className="text-xs text-gray-400">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                      </div>
                      {r.title && <p className="font-medium text-gray-800 text-sm">{r.title}</p>}
                      {r.comment && <p className="text-gray-600 text-sm mt-1">{r.comment}</p>}
                      {r.photo_urls && r.photo_urls.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {r.photo_urls.map((url, i) => <img key={i} src={url} alt="" className="w-16 h-16 rounded object-cover" />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Booking Card */}
          <div className="space-y-4">
            <div className="card bg-white p-6 sticky top-24">
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-gray-900">£{Number(place.price_per_night).toFixed(2)}</p>
                <p className="text-sm text-gray-500">per night</p>
              </div>

              {user ? (
                <Link href={`/place/${id}/book`} className="block w-full btn-primary py-3 text-center font-bold text-lg">
                  Book Now
                </Link>
              ) : (
                <Link href={`/auth/login?redirect=/place/${id}`} className="block w-full btn-primary py-3 text-center font-bold text-lg">
                  Log In to Book
                </Link>
              )}

              {unavailableDates.length > 0 && (
                <p className="text-xs text-gray-400 text-center mt-3">{unavailableDates.length} date(s) unavailable</p>
              )}

              {(place.host || place.owner_name) && (
                <div className="border-t border-gray-100 mt-6 pt-4">
                  <p className="text-sm text-gray-500 mb-2">Hosted by</p>
                  <div className="flex items-center gap-3">
                    {place.host?.avatar_url ? (
                      <img src={place.host.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-light-blue text-white flex items-center justify-center font-bold">
                        {((place.host?.name || place.owner_name || 'H')[0]).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{place.host?.name || place.owner_name}</p>
                    </div>
                  </div>
                  {user && (place.host_id || place.owner_id) !== user.id && (
                    <Link href={`/dashboard/messages/${place.host_id || place.owner_id}`} className="block mt-3 text-light-blue text-sm hover:underline text-center">
                      Message Host
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Map placeholder */}
            {place.latitude && place.longitude && (
              <div className="card bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Location</h3>
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <iframe
                    width="100%" height="100%" style={{ border: 0 }}
                    loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBqXtdl4q7VW4PEbK2dKsdouT1d_35WTy0&q=${place.latitude},${place.longitude}&zoom=13`}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">{Number(place.latitude).toFixed(4)}, {Number(place.longitude).toFixed(4)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
