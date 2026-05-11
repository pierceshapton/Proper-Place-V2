'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { placesApi, uploadApi, ApiError } from '@/lib/api';

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
  });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/features`)
      .then(r => r.json())
      .then(data => { if (data.min_price_per_night) setMinPrice(data.min_price_per_night); })
      .catch(() => {});
  }, []);

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files].slice(0, 10));
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setImagePreview(prev => [...prev, ev.target?.result as string].slice(0, 10));
      reader.readAsDataURL(f);
    });
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

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => setForm(f => ({ ...f, latitude: pos.coords.latitude.toString(), longitude: pos.coords.longitude.toString() })),
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Location</h2>
            <button type="button" onClick={handleGetLocation} className="text-sm text-light-blue hover:text-accent-blue">📍 Use My Location</button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Country Lane" className="bg-white border-gray-300 text-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Devon" className="bg-white border-gray-300 text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
              <input type="text" value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} placeholder="EX1 1AA" className="bg-white border-gray-300 text-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="51.5074" className="bg-white border-gray-300 text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="-0.1278" className="bg-white border-gray-300 text-gray-900" />
            </div>
          </div>
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
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {imagePreview.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                {i === 0 && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Main</span>}
              </div>
            ))}
            {images.length < 10 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-light-blue hover:bg-blue-50 transition-colors">
                <div className="text-center">
                  <span className="text-2xl text-gray-400">+</span>
                  <p className="text-xs text-gray-400 mt-1">Add Photo</p>
                </div>
                <input type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary py-3 px-8 font-bold disabled:opacity-50">{saving ? 'Creating Place...' : 'Create Place'}</button>
          <button type="button" onClick={() => router.back()} className="btn-secondary py-3 px-8">Cancel</button>
        </div>
      </form>
    </div>
  );
}
