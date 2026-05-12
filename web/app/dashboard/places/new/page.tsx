'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useJsApiLoader, GoogleMap } from '@react-google-maps/api';
import { placesApi, uploadApi, ApiError } from '@/lib/api';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBqXtdl4q7VW4PEbK2dKsdouT1d_35WTy0';
const MAPS_LIBRARIES: ('places')[] = ['places'];

const PLACE_TYPES = [
  { value: 'private_land', label: 'Private Land' },
  { value: 'farm', label: 'Farm / Farmland' },
  { value: 'pub', label: 'Pub Car Park' },
  { value: 'campsite', label: 'Campsite' },
  { value: 'vineyard', label: 'Vineyard' },
  { value: 'coastal', label: 'Coastal Spot' },
  { value: 'woodland', label: 'Woodland' },
  { value: 'garden', label: 'Garden / Estate' },
  { value: 'other', label: 'Other' },
];

export default function NewPlacePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const addressInputRef = useRef<HTMLInputElement>(null);
  const mapSearchRef = useRef<HTMLInputElement>(null);
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: MAPS_LIBRARIES });
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 54.5, lng: -2.5 });
  const [mapZoom, setMapZoom] = useState(6);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const pinActiveRef = useRef(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(5);
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'UK',
    latitude: '',
    longitude: '',
    price_per_night: '',
    capacity: '',
    place_type: 'private_land',
    opening_hours: '',
    business_description: '',
    access_route_description:  '',
    max_vehicle_height_ft: '',
    max_vehicle_width_ft: '',
    max_vehicle_length_ft: '',
    serves_food: false,
    food_menu_description: '',
    max_nights_per_stay: '',
  });
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/features`)
      .then(r => r.json())
      .then(data => { if (data.min_price_per_night) setMinPrice(data.min_price_per_night); })
      .catch(() => {});
  }, []);

  const addFiles = (files: File[]) => {
    setImages(prev => {
      const combined = [...prev, ...files].slice(0, 10);
      return combined;
    });
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setImagePreview(prev => [...prev, ev.target?.result as string].slice(0, 10));
      reader.readAsDataURL(f);
    });
  };

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setImagePreview(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.price_per_night) {
      setError('Name and price are required');
      return;
    }
    if (parseFloat(form.price_per_night) < minPrice) {
      setError(`Price must be at least £${minPrice}`);
      return;
    }
    if (parseFloat(form.price_per_night) > 100) {
      setError('Price cannot exceed £100');
      return;
    }
    setSaving(true);
    try {
      // Create the place first
      const placeData = {
        name: form.name,
        description: form.description,
        address: form.address,
        city: form.city,
        postal_code: form.postal_code,
        country: form.country,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        price_per_night: parseFloat(form.price_per_night),
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        place_type: form.place_type,
        amenities: [],
        opening_hours: form.opening_hours || undefined,
        business_description: form.business_description || undefined,
        access_route_description: form.access_route_description || undefined,
        max_vehicle_height_ft: form.max_vehicle_height_ft ? parseFloat(form.max_vehicle_height_ft) : undefined,
        max_vehicle_width_ft: form.max_vehicle_width_ft ? parseFloat(form.max_vehicle_width_ft) : undefined,
        max_vehicle_length_ft: form.max_vehicle_length_ft ? parseFloat(form.max_vehicle_length_ft) : undefined,
        serves_food: form.serves_food,
        food_menu_description: form.food_menu_description || undefined,
        max_nights_per_stay: form.max_nights_per_stay ? parseInt(form.max_nights_per_stay) : undefined,
        available_days: availableDays.length < 7 ? availableDays : undefined,
      };

      const result = await placesApi.create(placeData);
      const placeId = result.place?.id || (result as unknown as { id: number }).id;

      // Upload images if any
      if (images.length > 0 && placeId) {
        await uploadApi.placeImages(placeId, images);
      }

      router.push('/dashboard/places');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create place');
    }
    setSaving(false);
  };

  // Attach Google Places Autocomplete to the map search bar once API is loaded
  useEffect(() => {
    if (!isLoaded || !mapSearchRef.current) return;
    const autocomplete = new window.google.maps.places.Autocomplete(mapSearchRef.current, {
      componentRestrictions: { country: 'gb' },
    });
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      const get = (type: string, short = false) =>
        place.address_components?.find(c => c.types.includes(type))?.[short ? 'short_name' : 'long_name'] ?? '';
      const streetNumber = get('street_number');
      const route = get('route');
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setMarkerPos({ lat, lng });
      setMapCenter({ lat, lng });
      setMapZoom(16);
      pinActiveRef.current = true;
      setPinVisible(true);
      setForm(f => ({
        ...f,
        address: [streetNumber, route].filter(Boolean).join(' ') || place.formatted_address || f.address,
        city: get('postal_town') || get('locality') || get('administrative_area_level_2'),
        postal_code: get('postal_code'),
        country: get('country', true) || 'GB',
        latitude: lat.toString(),
        longitude: lng.toString(),
      }));
    });
    return () => window.google.maps.event.clearInstanceListeners(autocomplete);
  }, [isLoaded]);

  const reverseGeocode = (lat: number, lng: number) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const get = (type: string, short = false) =>
          results[0].address_components?.find(c => c.types.includes(type))?.[short ? 'short_name' : 'long_name'] ?? '';
        setForm(f => ({
          ...f,
          address: [get('street_number'), get('route')].filter(Boolean).join(' ') || results[0].formatted_address,
          city: get('postal_town') || get('locality') || get('administrative_area_level_2'),
          postal_code: get('postal_code'),
          country: get('country', true) || 'GB',
          latitude: lat.toString(),
          longitude: lng.toString(),
        }));
        if (mapSearchRef.current) mapSearchRef.current.value = results[0].formatted_address;
      }
    });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMarkerPos({ lat, lng });
        setMapCenter({ lat, lng });
        setMapZoom(16);
        pinActiveRef.current = true;
        setPinVisible(true);
        if (isLoaded) reverseGeocode(lat, lng);
        else setForm(f => ({ ...f, latitude: lat.toString(), longitude: lng.toString() }));
      },
      () => setError('Unable to get your location')
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 text-lg">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Add New Place</h1>
      </div>

      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Place Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sunny Farm Overnight Stay" required className="bg-white border-gray-300 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Describe your space, what makes it special, the surroundings..." className="bg-white border-gray-300 text-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Place Type *</label>
              <select value={form.place_type} onChange={e => setForm(f => ({ ...f, place_type: e.target.value }))} className="bg-white border-gray-300 text-gray-900">
                {PLACE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Night (£) *</label>
              <input type="number" step="0.01" min={minPrice} value={form.price_per_night} onChange={e => setForm(f => ({ ...f, price_per_night: e.target.value }))} placeholder={`${minPrice}.00`} required className="bg-white border-gray-300 text-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Vehicle Capacity</label>
            <input type="number" min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="e.g. 5" className="bg-white border-gray-300 text-gray-900" />
          </div>
        </div>

        {/* Location */}
        <div className="card bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Location</h2>
          <p className="text-sm text-gray-500">Search your address, and move the pin to the car park entrance.</p>

          {/* Map with search overlay */}
          {isLoaded ? (
            <div className="relative rounded-xl overflow-hidden" style={{ height: 420 }}>
              {/* Full-width search bar floating at top */}
              <div className="absolute top-0 left-0 right-0 z-10 p-2">
                <div className="flex gap-2">
                  <input
                    ref={mapSearchRef}
                    type="text"
                    placeholder="Search for your address or place name..."
                    className="flex-1 bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-light-blue"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    title="Use my current location"
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2.5 shadow-md hover:bg-gray-50 flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                      <circle cx="12" cy="12" r="3"/>
                      <line x1="12" y1="2" x2="12" y2="6"/>
                      <line x1="12" y1="18" x2="12" y2="22"/>
                      <line x1="2" y1="12" x2="6" y2="12"/>
                      <line x1="18" y1="12" x2="22" y2="12"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Logo fixed at map centre, visible once user has searched/located */}
              {pinVisible && (
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                  <div style={{ transform: 'translateY(-50%)' }}>
                    <img src="/logo-192.png" alt="Proper Place logo" className="w-12 h-12 drop-shadow-lg" />
                  </div>
                </div>
              )}

              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={mapZoom}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, gestureHandling: 'greedy' }}
                onLoad={map => { mapInstanceRef.current = map; }}
                onIdle={() => {
                  if (!pinActiveRef.current) return;
                  const map = mapInstanceRef.current;
                  if (!map) return;
                  const centre = map.getCenter();
                  if (!centre) return;
                  const lat = centre.lat();
                  const lng = centre.lng();
                  setMarkerPos({ lat, lng });
                  setForm(f => ({ ...f, latitude: lat.toString(), longitude: lng.toString() }));
                  reverseGeocode(lat, lng);
                }}
              />

              {/* Location summary pill */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-1.5 text-xs text-gray-700 shadow-md whitespace-nowrap z-10">
                {form.latitude && form.longitude
                  ? <>📌 {form.address || `${parseFloat(form.latitude).toFixed(7)}, ${parseFloat(form.longitude).toFixed(7)}`}{form.city ? `, ${form.city}` : ''}</>
                  : <span className="text-gray-400">Search above or pan the map to place your pin</span>
                }
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 bg-gray-100 rounded-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-blue"></div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Route Description</label>
            <textarea value={form.access_route_description} onChange={e => setForm(f => ({ ...f, access_route_description: e.target.value }))} rows={2} placeholder="How to reach your place (directions, landmarks, narrow lanes...)" className="bg-white border-gray-300 text-gray-900" />
          </div>
        </div>

        {/* Vehicle Limits */}
        <div className="card bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Vehicle Size Limits</h2>
          <p className="text-sm text-gray-500">Leave blank if no restrictions apply.</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Length (ft)</label>
              <input type="number" step="0.1" value={form.max_vehicle_length_ft} onChange={e => setForm(f => ({ ...f, max_vehicle_length_ft: e.target.value }))} placeholder="35" className="bg-white border-gray-300 text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Height (ft)</label>
              <input type="number" step="0.1" value={form.max_vehicle_height_ft} onChange={e => setForm(f => ({ ...f, max_vehicle_height_ft: e.target.value }))} placeholder="12" className="bg-white border-gray-300 text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Width (ft)</label>
              <input type="number" step="0.1" value={form.max_vehicle_width_ft} onChange={e => setForm(f => ({ ...f, max_vehicle_width_ft: e.target.value }))} placeholder="8" className="bg-white border-gray-300 text-gray-900" />
            </div>
          </div>
        </div>

        {/* Booking Rules */}
        <div className="card bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Booking Rules</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Nights Per Stay</label>
            <p className="text-xs text-gray-500 mb-2">Leave blank for no limit.</p>
            <input type="number" min="1" max="30" value={form.max_nights_per_stay} onChange={e => setForm(f => ({ ...f, max_nights_per_stay: e.target.value }))} placeholder="e.g. 7" className="bg-white border-gray-300 text-gray-900 w-32" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Check-in Days</label>
            <p className="text-xs text-gray-500 mb-3">Deselect days guests cannot check in.</p>
            <div className="flex flex-wrap gap-2">
              {[{ label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }, { label: 'Wed', value: 3 }, { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 }, { label: 'Sun', value: 7 }].map(({ label, value }) => (
                <button key={value} type="button"
                  onClick={() => setAvailableDays(prev => prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value].sort())}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${availableDays.includes(value) ? 'bg-green-800 text-white border-green-800' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Business / Food */}
        <div className="card bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Additional Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Hours</label>
            <input type="text" value={form.opening_hours} onChange={e => setForm(f => ({ ...f, opening_hours: e.target.value }))} placeholder="e.g. Open 24/7 or 9am-6pm" className="bg-white border-gray-300 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Description</label>
            <textarea value={form.business_description} onChange={e => setForm(f => ({ ...f, business_description: e.target.value }))} rows={2} placeholder="If a pub or business, describe it..." className="bg-white border-gray-300 text-gray-900" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="serves_food" checked={form.serves_food} onChange={e => setForm(f => ({ ...f, serves_food: e.target.checked }))} className="w-4 h-4" />
            <label htmlFor="serves_food" className="text-sm font-medium text-gray-700">Serves food</label>
          </div>
          {form.serves_food && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Food Menu Description</label>
              <textarea value={form.food_menu_description} onChange={e => setForm(f => ({ ...f, food_menu_description: e.target.value }))} rows={2} placeholder="Describe your food offerings..." className="bg-white border-gray-300 text-gray-900" />
            </div>
          )}
        </div>

        {/* Photos */}
        <div className="card bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
          <p className="text-sm text-gray-500">Upload up to 10 photos. The first photo will be your main image.</p>

          {/* Drop zone */}
          <label
            className={`flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed py-8 px-4 cursor-pointer transition-colors ${
              dragOver ? 'border-light-blue bg-blue-50' : 'border-gray-300 hover:border-light-blue hover:bg-blue-50'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm font-medium text-gray-700">Drag & drop photos here, or <span className="text-light-blue">browse</span></p>
            <p className="text-xs text-gray-400">{images.length}/10 photos selected · JPG, PNG, WEBP</p>
            <input type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" disabled={images.length >= 10} />
          </label>

          {/* Thumbnails */}
          {imagePreview.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {imagePreview.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">✕</button>
                  {i === 0 && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Main</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary py-3 px-8 font-bold disabled:opacity-50">{saving ? 'Creating Place...' : 'Create Place'}</button>
          <button type="button" onClick={() => router.back()} className="btn-secondary py-3 px-8">Cancel</button>
        </div>
      </form>
    </div>
  );
}
