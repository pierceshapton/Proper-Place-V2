'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { placesApi, type Place } from '@/lib/api';

export default function MyPlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    placesApi.myPlaces()
      .then(data => setPlaces(data.places || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this place? This cannot be undone.')) return;
    try {
      await placesApi.delete(id);
      setPlaces(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleToggleAvailability = async (place: Place) => {
    try {
      if (place.is_currently_unavailable) {
        await placesApi.setAvailable(place.id);
        setPlaces(prev => prev.map(p => p.id === place.id ? { ...p, is_currently_unavailable: false } : p));
      } else {
        await placesApi.setUnavailable(place.id, { startDate: new Date().toISOString().split('T')[0], isIndefinite: true });
        setPlaces(prev => prev.map(p => p.id === place.id ? { ...p, is_currently_unavailable: true } : p));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update availability');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Places</h1>
        <Link href="/dashboard/places/new" className="btn-primary py-2 px-4 text-sm">+ Add New Place</Link>
      </div>

      {places.length === 0 ? (
        <div className="card bg-white p-12 text-center">
          <div className="text-5xl mb-4">📍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No places yet</h2>
          <p className="text-gray-500 mb-6">Start earning by listing your space for motorhomers.</p>
          <Link href="/dashboard/places/new" className="btn-primary py-2 px-6">Create Your First Place</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {places.map(place => (
            <div key={place.id} className="card bg-white overflow-hidden">
              <div className="relative h-48 bg-gray-100">
                {place.image_urls?.[0] ? (
                  <img src={place.image_urls[0]} alt={place.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">📍</div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm ${
                    place.approval_status === 'approved' ? 'bg-green-100/90 text-green-700' :
                    place.approval_status === 'pending' ? 'bg-yellow-100/90 text-yellow-700' :
                    'bg-red-100/90 text-red-700'
                  }`}>{place.approval_status}</span>
                  {place.is_currently_unavailable && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100/90 text-gray-700">Unavailable</span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{place.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{place.city || place.address || 'No location set'}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <span>£{place.price_per_night}/night</span>
                  {place.capacity && <span>Up to {place.capacity} vehicles</span>}
                  {place.rating && <span>⭐ {Number(place.rating).toFixed(1)} ({place.review_count})</span>}
                </div>
                {place.rejection_reason && (
                  <div className="bg-red-50 text-red-600 text-xs p-2 rounded mb-3">
                    <span className="font-medium">Rejected:</span> {place.rejection_reason}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/dashboard/places/${place.id}/edit`} className="btn-secondary py-1.5 px-3 text-xs">Edit</Link>
                  <Link href={`/place/${place.id}`} className="btn-secondary py-1.5 px-3 text-xs">View</Link>
                  <button onClick={() => handleToggleAvailability(place)} className={`py-1.5 px-3 text-xs rounded-lg font-semibold transition-colors ${place.is_currently_unavailable ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'}`}>
                    {place.is_currently_unavailable ? 'Set Available' : 'Set Unavailable'}
                  </button>
                  <button onClick={() => handleDelete(place.id)} className="py-1.5 px-3 text-xs rounded-lg font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
