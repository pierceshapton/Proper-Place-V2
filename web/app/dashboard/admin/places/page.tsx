'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, placesApi, ApiError, type Place } from '@/lib/api';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import ReasonModal from '@/components/ReasonModal';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionErr, setActionErr] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: MAPS_KEY, libraries: ['places'] });

  const load = async () => {
    try {
      const data = await adminApi.places();
      setPlaces(data.places || data as unknown as Place[]);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Also load ALL approved places for map context
    placesApi.list({}).then(d => {
      const p = (d as { places?: Place[] }).places || d as unknown as Place[];
      setAllPlaces(Array.isArray(p) ? p : []);
    }).catch(() => {});
  }, []);

  const handleApprove = async (id: number) => {
    setActionErr('');
    try { await adminApi.approvePlace(id); load(); } catch (err) { setActionErr(err instanceof ApiError ? err.message : 'Failed'); }
  };

  const handleReject = async (id: number, reason: string) => {
    setActionErr('');
    try { await adminApi.rejectPlace(id, reason); setRejectingId(null); load(); } catch (err) { setActionErr(err instanceof ApiError ? err.message : 'Failed'); }
  };

  const filtered = filter === 'all' ? places : places.filter(p => {
    if (filter === 'pending') return p.approval_status === 'pending';
    if (filter === 'approved') return p.approval_status === 'approved';
    if (filter === 'rejected') return p.approval_status === 'rejected';
    return true;
  });

  const tabs = ['pending', 'approved', 'rejected', 'all'];
  const statusColor = (s: string) => {
    switch (s) { case 'approved': return 'bg-green-100 text-green-700'; case 'pending': return 'bg-yellow-100 text-yellow-700'; case 'rejected': return 'bg-red-100 text-red-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Place Approvals</h1>

      {actionErr && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{actionErr}</div>}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === t ? 'bg-light-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className="ml-1">({t === 'all' ? places.length : places.filter(p => p.approval_status === t).length})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 card bg-white">
          <p className="text-4xl mb-3">{filter === 'pending' ? '✅' : '📍'}</p>
          <p className="text-gray-500">{filter === 'pending' ? 'No places awaiting approval.' : `No ${filter} places.`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(place => {
            const isExpanded = expandedId === place.id;
            return (
              <div key={place.id} className="card bg-white overflow-hidden">
                {/* Summary row */}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {place.image_urls?.[0] && (
                      <img src={place.image_urls[0]} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{place.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(place.approval_status || 'pending')}`}>{place.approval_status || 'pending'}</span>
                      </div>
                      <p className="text-sm text-gray-500">{place.address}, {place.city}</p>
                      <p className="text-sm text-gray-500 mt-0.5">Type: {place.place_type} · £{Number(place.price_per_night).toFixed(2)}/night</p>
                      <p className="text-sm text-gray-400 mt-0.5">Host: {place.owner_name || place.host?.name || `User #${place.owner_id}`}</p>
                      {!place.host_contract_accepted_at && (
                        <span className="inline-block mt-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded">Contract NOT Signed</span>
                      )}
                      {place.host_contract_accepted_at && (
                        <span className="inline-block mt-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded">Contract Signed</span>
                      )}
                      {place.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{place.description}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        {place.image_urls && <span>{place.image_urls.length} photo{place.image_urls.length !== 1 ? 's' : ''}</span>}
                        {place.amenities && <span>{(Array.isArray(place.amenities) ? place.amenities : String(place.amenities).split(',')).length} amenities</span>}
                        {(place.max_vehicle_length_ft || place.max_vehicle_height_ft) && <span>Vehicle limits set</span>}
                      </div>
                      {place.rejection_reason && <p className="text-sm text-red-500 mt-2">Rejection reason: {place.rejection_reason}</p>}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 items-end">
                      {place.approval_status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(place.id)} className="btn-primary text-sm py-1.5 px-4">Approve</button>
                          <button onClick={() => setRejectingId(place.id)} className="bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm py-1.5 px-4 font-medium transition-colors">Reject</button>
                        </>
                      )}
                      {place.approval_status === 'rejected' && (
                        <button onClick={() => handleApprove(place.id)} className="btn-primary text-sm py-1.5 px-4">Approve</button>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : place.id)}
                        className="text-light-blue hover:text-accent-blue text-sm font-medium flex items-center gap-1 mt-1"
                      >
                        {isExpanded ? 'Hide Details' : 'View Details'}
                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <PlaceDetails place={place} allPlaces={allPlaces} isLoaded={isLoaded} />
                )}
              </div>
            );
          })}
        </div>
      )}
      {rejectingId !== null && (
        <ReasonModal
          title="Reject Place"
          description="Provide a reason for rejecting this place listing."
          placeholder="Rejection reason..."
          confirmLabel="Reject"
          required
          onConfirm={(reason) => handleReject(rejectingId, reason)}
          onCancel={() => setRejectingId(null)}
        />
      )}
    </div>
  );
}

/* ── Expanded detail panel ─────────────────────────────────────── */
function PlaceDetails({ place, allPlaces, isLoaded }: { place: Place; allPlaces: Place[]; isLoaded: boolean }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const images = place.image_urls || [];

  const onMapLoad = useCallback((map: google.maps.Map) => {
    if (!place.latitude || !place.longitude) return;
    // Fit bounds to show this place + nearby places
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: Number(place.latitude), lng: Number(place.longitude) });
    allPlaces.forEach(p => {
      if (p.latitude && p.longitude) bounds.extend({ lat: Number(p.latitude), lng: Number(p.longitude) });
    });
    map.fitBounds(bounds, 60);
    // But don't zoom too far out
    const listener = google.maps.event.addListener(map, 'idle', () => {
      if ((map.getZoom() || 0) > 14) map.setZoom(14);
      google.maps.event.removeListener(listener);
    });
  }, [place, allPlaces]);

  const detail = (label: string, value: string | number | boolean | undefined | null) => {
    if (value === undefined || value === null || value === '') return null;
    const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
    return (
      <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{display}</span>
      </div>
    );
  };

  return (
    <div className="border-t border-gray-100">
      {/* Image gallery */}
      {images.length > 0 && (
        <div className="relative bg-gray-900">
          <img src={images[imgIdx]} alt={place.name} className="w-full h-64 object-cover cursor-pointer" onClick={() => setLightbox(true)} />
          {images.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70">‹</button>
              <button onClick={() => setImgIdx(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70">›</button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => <button key={i} onClick={() => setImgIdx(i)} className={`w-2 h-2 rounded-full ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`} />)}
              </div>
              <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded">{imgIdx + 1} / {images.length}</span>
            </>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light z-10" onClick={() => setLightbox(false)}>✕</button>
          <img src={images[imgIdx]} alt={place.name} className="max-w-[90vw] max-h-[90vh] object-contain" onClick={e => e.stopPropagation()} />
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + images.length) % images.length); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl">‹</button>
              <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % images.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl">›</button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => <button key={i} onClick={e => { e.stopPropagation(); setImgIdx(i); }} className={`w-2.5 h-2.5 rounded-full ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`} />)}
              </div>
              <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm">{imgIdx + 1} / {images.length}</span>
            </>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-0 md:gap-px bg-gray-100">
        {/* Left column - All details */}
        <div className="bg-white p-5 space-y-4">
          {/* Basic info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Basic Information</h4>
            {detail('Name', place.name)}
            {detail('Place Type', place.place_type?.replace(/_/g, ' '))}
            {detail('Price per Night', `£${Number(place.price_per_night).toFixed(2)}`)}
            {detail('Capacity', place.capacity ? `${place.capacity} vehicles` : null)}
            {detail('Status', place.approval_status)}
            {detail('Currently Unavailable', place.is_currently_unavailable)}
            {detail('Featured', place.featured)}
            {detail('Created', place.created_at ? new Date(place.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null)}
          </div>

          {/* Location */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Location</h4>
            {detail('Address', place.address)}
            {detail('City', place.city)}
            {detail('Country', place.country)}
            {detail('Postal Code', place.postal_code)}
            {detail('Coordinates', place.latitude && place.longitude ? `${Number(place.latitude).toFixed(5)}, ${Number(place.longitude).toFixed(5)}` : null)}
            {detail('Coordinates Approximate', place.coordinates_approximate)}
          </div>

          {/* Host info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Host</h4>
            {detail('Host Name', place.owner_name || place.host?.name)}
            {detail('Owner ID', place.owner_id)}
            {detail('Host ID', place.host_id)}
            {detail('Host Email', place.owner_email)}
            {detail('Contract Signed', place.host_contract_accepted_at ? `Yes (v${place.host_contract_version || '?'} — ${new Date(place.host_contract_accepted_at).toLocaleDateString('en-GB')})` : 'NO')}
          </div>

          {/* Description */}
          {place.description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Description</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{place.description}</p>
            </div>
          )}

          {/* Business description */}
          {place.business_description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Business Description</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{place.business_description}</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="bg-white p-5 space-y-4">
          {/* Vehicle limits */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Vehicle Size Limits</h4>
            {detail('Max Length', place.max_vehicle_length_ft ? `${place.max_vehicle_length_ft} ft` : null)}
            {detail('Max Height', place.max_vehicle_height_ft ? `${place.max_vehicle_height_ft} ft` : null)}
            {detail('Max Width', place.max_vehicle_width_ft ? `${place.max_vehicle_width_ft} ft` : null)}
            {!place.max_vehicle_length_ft && !place.max_vehicle_height_ft && !place.max_vehicle_width_ft && (
              <p className="text-sm text-gray-400 italic">No vehicle size limits specified</p>
            )}
          </div>

          {/* Access route */}
          {place.access_route_description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Access Route</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{place.access_route_description}</p>
            </div>
          )}

          {/* Food */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Food & Drink</h4>
            {detail('Serves Food', place.serves_food)}
            {place.food_menu_description && <p className="text-sm text-gray-600 mt-1">{place.food_menu_description}</p>}
            {!place.serves_food && !place.food_menu_description && (
              <p className="text-sm text-gray-400 italic">No food service</p>
            )}
          </div>

          {/* Opening hours */}
          {place.opening_hours && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Opening Hours</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{place.opening_hours}</p>
            </div>
          )}

          {/* Amenities */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Amenities</h4>
            {place.amenities && place.amenities.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {place.amenities.map(a => (
                  <span key={a} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">{a}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No amenities listed</p>
            )}
          </div>

          {/* Reviews */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Reviews</h4>
            {detail('Rating', place.rating ? `${Number(place.rating).toFixed(1)} / 5` : null)}
            {detail('Review Count', place.review_count)}
            {!place.rating && !place.review_count && (
              <p className="text-sm text-gray-400 italic">No reviews yet</p>
            )}
          </div>

          {/* Rejection reason */}
          {place.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</h4>
              <p className="text-sm text-red-600">{place.rejection_reason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      {isLoaded && place.latitude && place.longitude && (
        <div className="border-t border-gray-100 p-5">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Location Map</h4>
          <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 400 }}>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={{ lat: Number(place.latitude), lng: Number(place.longitude) }}
              zoom={12}
              onLoad={onMapLoad}
              options={{ mapTypeControl: true, streetViewControl: false, fullscreenControl: true }}
            >
              {/* This place - highlighted */}
              <Marker
                position={{ lat: Number(place.latitude), lng: Number(place.longitude) }}
                icon={{
                  url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="#DC2626"/><circle cx="16" cy="16" r="8" fill="white"/></svg>'),
                  scaledSize: new google.maps.Size(32, 42),
                }}
                title={`${place.name} (this place)`}
                zIndex={100}
              />
              {/* All other places - blue */}
              {allPlaces.filter(p => p.id !== place.id && p.latitude && p.longitude).map(p => (
                <Marker
                  key={p.id}
                  position={{ lat: Number(p.latitude), lng: Number(p.longitude) }}
                  icon={{
                    url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#4A7EB3"/><circle cx="12" cy="12" r="5" fill="white"/></svg>'),
                    scaledSize: new google.maps.Size(24, 32),
                  }}
                  title={p.name}
                  opacity={0.7}
                />
              ))}
            </GoogleMap>
          </div>
          <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span> This place</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-light-blue inline-block"></span> Other Proper Places</span>
          </div>
        </div>
      )}
    </div>
  );
}
