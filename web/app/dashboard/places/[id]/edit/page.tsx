'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { placesApi, uploadApi, ApiError, type Place } from '@/lib/api';

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

export default function EditPlacePage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(5);
  const [form, setForm] = useState({
    name: '', description: '', address: '', city: '', postal_code: '', country: 'UK',
    latitude: '', longitude: '', price_per_night: '', capacity: '', place_type: 'private_land',
    opening_hours: '', business_description: '', access_route_description: '',,
    max_vehicle_height_ft: '', max_vehicle_width_ft: '', max_vehicle_length_ft: '',
    serves_food: false, food_menu_description: '', image_urls: [] as string[],
  });

  const [externalCalendars, setExternalCalendars] = useState<any[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [newCalendarUrl, setNewCalendarUrl] = useState('');
  const [newCalendarLabel, setNewCalendarLabel] = useState('');
  const [calendarActionLoading, setCalendarActionLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');

  useEffect(() => {
    if (!id) return;
    placesApi.get(Number(id))
      .then(data => {
        const p = data.place || data as unknown as Place;
        setForm({
          name: p.name || '', description: p.description || '', address: p.address || '',
          city: p.city || '', postal_code: p.postal_code || '', country: p.country || 'UK',
          latitude: p.latitude?.toString() || '', longitude: p.longitude?.toString() || '',
          price_per_night: p.price_per_night?.toString() || '', capacity: p.capacity?.toString() || '',
          place_type: p.place_type || 'private_land',
          opening_hours: p.opening_hours || '',, business_description: p.business_description || '',
          access_route_description: p.access_route_description || '',
          max_vehicle_height_ft: p.max_vehicle_height_ft?.toString() || '',
          max_vehicle_width_ft: p.max_vehicle_width_ft?.toString() || '',
          max_vehicle_length_ft: p.max_vehicle_length_ft?.toString() || '',
          serves_food: p.serves_food || false, food_menu_description: p.food_menu_description || '',
          image_urls: p.image_urls || [],
        });
          // Load external calendars for this place
          loadExternalCalendars(Number(id));
      })
      .catch(() => router.push('/dashboard/places'))
      .finally(() => setLoading(false));
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/features`)
      .then(r => r.json())
      .then(data => { if (data.min_price_per_night) setMinPrice(data.min_price_per_night); })
      .catch(() => {});
  }, [id, router]);

    async function loadExternalCalendars(placeId: number) {
      setCalendarsLoading(true);
      try {
        const res = await placesApi.listExternalCalendars(placeId);
        setExternalCalendars(res.calendars || []);
      } catch (e) {
        // ignore silently
      }
      setCalendarsLoading(false);
    }

    async function handleAddCalendar() {
      if (!newCalendarUrl) return setCalendarError('Please enter a calendar URL');
      setCalendarError('');
      setCalendarActionLoading(true);
      try {
        await placesApi.createExternalCalendar(Number(id), { url: newCalendarUrl, label: newCalendarLabel });
        setNewCalendarUrl(''); setNewCalendarLabel('');
        await loadExternalCalendars(Number(id));
      } catch (err) {
        setCalendarError(err instanceof ApiError ? err.message : 'Failed to add calendar');
      }
      setCalendarActionLoading(false);
    }

    async function handleDeleteCalendar(calId: number) {
      if (!confirm('Delete this calendar feed?')) return;
      setCalendarActionLoading(true);
      try {
        await placesApi.deleteExternalCalendar(calId);
        await loadExternalCalendars(Number(id));
      } catch (err) {
        setCalendarError(err instanceof ApiError ? err.message : 'Failed to delete calendar');
      }
      setCalendarActionLoading(false);
    }

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewImages(prev => [...prev, ...files].slice(0, 10));
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setNewPreviews(prev => [...prev, ev.target?.result as string].slice(0, 10));
      reader.readAsDataURL(f);
    });
  };

  const removeExistingImage = (idx: number) => {
    setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.price_per_night && parseFloat(form.price_per_night) < minPrice) {
      setError(`Price must be at least £${minPrice}`);
      return;
    }
    setSaving(true);
    try {
      const updateData: Partial<Place> = {
        name: form.name, description: form.description, address: form.address, city: form.city,
        postal_code: form.postal_code, country: form.country,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        price_per_night: parseFloat(form.price_per_night),
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        place_type: form.place_type, amenities: [],
        opening_hours: form.opening_hours || undefined,
        business_description: form.business_description || undefined,
        access_route_description: form.access_route_description || undefined,
        max_vehicle_height_ft: form.max_vehicle_height_ft ? parseFloat(form.max_vehicle_height_ft) : undefined,
        max_vehicle_width_ft: form.max_vehicle_width_ft ? parseFloat(form.max_vehicle_width_ft) : undefined,
        max_vehicle_length_ft: form.max_vehicle_length_ft ? parseFloat(form.max_vehicle_length_ft) : undefined,
        serves_food: form.serves_food,
        food_menu_description: form.food_menu_description || undefined,
        image_urls: form.image_urls,
      };

      await placesApi.update(Number(id), updateData);

      if (newImages.length > 0) {
        await uploadApi.placeImages(Number(id), newImages);
      }

      setSuccess('Place updated! If previously approved, it will need re-approval.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update place');
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 text-lg">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Place</h1>
      </div>

      {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Place Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="bg-white border-gray-300 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} className="bg-white border-gray-300 text-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Place Type</label>
              <select value={form.place_type} onChange={e => setForm(f => ({ ...f, place_type: e.target.value }))} className="bg-white border-gray-300 text-gray-900">
                {PLACE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Night (£)</label>
              <input type="number" step="0.01" value={form.price_per_night} onChange={e => setForm(f => ({ ...f, price_per_night: e.target.value }))} className="bg-white border-gray-300 text-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
            <input type="number" min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="bg-white border-gray-300 text-gray-900" />
          </div>
        </div>

        <div className="card bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Location</h2>
          <div><input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Address" className="bg-white border-gray-300 text-gray-900" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" className="bg-white border-gray-300 text-gray-900" /></div>
            <div><input type="text" value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} placeholder="Postal Code" className="bg-white border-gray-300 text-gray-900" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><input type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="Latitude" className="bg-white border-gray-300 text-gray-900" /></div>
            <div><input type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="Longitude" className="bg-white border-gray-300 text-gray-900" /></div>
          </div>
          <div><textarea value={form.access_route_description} onChange={e => setForm(f => ({ ...f, access_route_description: e.target.value }))} rows={2} placeholder="Access route description..." className="bg-white border-gray-300 text-gray-900" /></div>
        </div>

        <div className="card bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Vehicle Size Limits</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs text-gray-500 mb-1">Max Length (ft)</label><input type="number" step="0.1" value={form.max_vehicle_length_ft} onChange={e => setForm(f => ({ ...f, max_vehicle_length_ft: e.target.value }))} className="bg-white border-gray-300 text-gray-900" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Max Height (ft)</label><input type="number" step="0.1" value={form.max_vehicle_height_ft} onChange={e => setForm(f => ({ ...f, max_vehicle_height_ft: e.target.value }))} className="bg-white border-gray-300 text-gray-900" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Max Width (ft)</label><input type="number" step="0.1" value={form.max_vehicle_width_ft} onChange={e => setForm(f => ({ ...f, max_vehicle_width_ft: e.target.value }))} className="bg-white border-gray-300 text-gray-900" /></div>
          </div>
        </div>

        <div className="card bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {form.image_urls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeExistingImage(i)} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
              </div>
            ))}
            {newPreviews.map((src, i) => (
              <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-300">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded">New</span>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-light-blue hover:bg-blue-50 transition-colors">
              <div className="text-center"><span className="text-2xl text-gray-400">+</span><p className="text-xs text-gray-400 mt-1">Add</p></div>
              <input type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
            </label>
          </div>
        </div>

        <div className="card bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Calendar Sync</h2>
          <p className="text-sm text-gray-600">Add external iCal feed URLs (e.g. Pitchup) to import blocked dates automatically.</p>
          {calendarError && <div className="text-red-600 text-sm">{calendarError}</div>}
          <div className="grid grid-cols-1 gap-2">
            <input value={newCalendarUrl} onChange={e => setNewCalendarUrl(e.target.value)} placeholder="https://example.com/feed.ics" className="bg-white border-gray-300 text-gray-900" />
            <input value={newCalendarLabel} onChange={e => setNewCalendarLabel(e.target.value)} placeholder="Label (optional)" className="bg-white border-gray-300 text-gray-900" />
            <div className="flex gap-2">
              <button type="button" onClick={handleAddCalendar} disabled={calendarActionLoading} className="btn-primary py-2 px-4">{calendarActionLoading ? 'Adding...' : 'Add Calendar'}</button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700">Existing feeds</h3>
            {calendarsLoading ? <div className="text-sm text-gray-500">Loading...</div> : (
              <ul className="space-y-2 mt-2">
                {externalCalendars.length === 0 && <li className="text-sm text-gray-500">No external calendars configured.</li>}
                {externalCalendars.map(c => (
                  <li key={c.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="text-sm">
                      <div className="font-medium">{c.label || c.url}</div>
                      <div className="text-xs text-gray-500">{c.url}</div>
                      <div className="text-xs text-gray-400">Last synced: {c.last_synced || 'never'}</div>
                    </div>
                    <div>
                      <button type="button" onClick={() => handleDeleteCalendar(c.id)} disabled={calendarActionLoading} className="text-sm text-red-600">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary py-3 px-8 font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
          <button type="button" onClick={() => router.back()} className="btn-secondary py-3 px-8">Cancel</button>
        </div>
      </form>
    </div>
  );
}
