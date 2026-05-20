'use client';

import { useState, useEffect, useRef } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { adminApi, uploadApi, ApiError, type User } from '@/lib/api';

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

const APPROVAL_STATUSES = [
  { value: 'draft', label: 'Draft (host edits before submitting)' },
  { value: 'pending', label: 'Pending (awaiting approval)' },
  { value: 'approved', label: 'Approved (live immediately)' },
];

type Tab = 'site' | 'user';

export default function HostsOnboardingPage() {
  const [tab, setTab] = useState<Tab>('site');

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Host Onboarding</h1>
        <p className="text-sm text-slate-500 mt-1">Create accounts and sites for hosts you're onboarding in person.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('site')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'site' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
        >
          ⊞ Create Site
        </button>
        <button
          onClick={() => setTab('user')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'user' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
        >
          + Create User
        </button>
      </div>

      {tab === 'site' ? <CreateSitePanel /> : <CreateUserPanel />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CREATE SITE
───────────────────────────────────────────── */
function CreateSitePanel() {
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchUsers = (q: string) => {
    if (!q.trim()) { setUsers([]); return; }
    setSearching(true);
    adminApi.users({ search: q, limit: '10' })
      .then(d => setUsers((d as { users: User[] }).users || []))
      .catch(() => setUsers([]))
      .finally(() => setSearching(false));
  };

  const handleSearchChange = (v: string) => {
    setUserSearch(v);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => searchUsers(v), 300);
  };

  if (selectedUser) {
    return (
      <div className="space-y-4">
        {/* Selected user banner */}
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
              {selectedUser.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">{selectedUser.name}</p>
              <p className="text-xs text-slate-400">{selectedUser.email}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedUser(null)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-3 py-1 rounded-lg bg-slate-800"
          >
            Change
          </button>
        </div>

        <PlaceForm ownerId={selectedUser.id} ownerName={selectedUser.name} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-200">Search for existing user</h2>
        <p className="text-xs text-slate-500">Type the host's name or email. If they don't have an account yet, use the "Create User" tab first.</p>

        <div className="relative">
          <input
            type="text"
            value={userSearch}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="e.g. Aimee or aimee@example.com"
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
          />
          {searching && (
            <div className="absolute right-3 top-3">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {users.length > 0 && (
          <div className="space-y-1 mt-1">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => { setSelectedUser(u); setUsers([]); setUserSearch(''); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs flex-shrink-0">
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{u.name}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <span className={`ml-auto flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${u.role === 'host' ? 'bg-blue-500/20 text-blue-400' : u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                  {u.role}
                </span>
              </button>
            ))}
          </div>
        )}

        {userSearch && !searching && users.length === 0 && (
          <p className="text-xs text-slate-500 pt-1">No users found. Create one in the "Create User" tab first.</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PLACE FORM
───────────────────────────────────────────── */
function PlaceForm({ ownerId, ownerName }: { ownerId: number; ownerName: string }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const mapSearchRef = useRef<HTMLInputElement>(null);
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: MAPS_LIBRARIES });
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'GB',
    latitude: '',
    longitude: '',
    price_per_night: '',
    capacity: '',
    place_type: 'pub',
    opening_hours: '',
    business_description: '',
    access_route_description: '',
    max_vehicle_height_m: '',
    max_vehicle_width_m: '',
    max_vehicle_length_m: '',
    serves_food: false,
    food_menu_description: '',
    max_nights_per_stay: '',
    approval_status: 'approved',
    electric_hookup_available: false,
    electric_hookup_capacity: '',
    electric_hookup_price_per_night: '',
  });

  const f = (field: keyof typeof form, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // Google Places Autocomplete on map search
  useEffect(() => {
    if (!isLoaded || !mapSearchRef.current) return;
    const ac = new window.google.maps.places.Autocomplete(mapSearchRef.current, {
      componentRestrictions: { country: 'gb' },
    });
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.geometry?.location) return;
      const get = (type: string, short = false) =>
        place.address_components?.find(c => c.types.includes(type))?.[short ? 'short_name' : 'long_name'] ?? '';
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setMarkerPos({ lat, lng });
      setForm(prev => ({
        ...prev,
        address: [get('street_number'), get('route')].filter(Boolean).join(' ') || place.formatted_address || prev.address,
        city: get('postal_town') || get('locality') || get('administrative_area_level_2'),
        postal_code: get('postal_code'),
        country: get('country', true) || 'GB',
        latitude: lat.toString(),
        longitude: lng.toString(),
      }));
    });
    return () => window.google.maps.event.clearInstanceListeners(ac);
  }, [isLoaded]);

  const addFiles = (files: File[]) => {
    const combined = [...images, ...files].slice(0, 10);
    setImages(combined);
    files.slice(0, 10 - images.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setImagePreview(prev => [...prev, ev.target?.result as string].slice(0, 10));
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setImagePreview(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleDay = (day: number) => {
    setAvailableDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name) { setError('Place name is required'); return; }

    setSaving(true);
    try {
      const placeData = {
        owner_id: ownerId,
        name: form.name,
        description: form.description || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        postal_code: form.postal_code || undefined,
        country: form.country || undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        price_per_night: form.price_per_night ? parseFloat(form.price_per_night) : undefined,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        place_type: form.place_type,
        opening_hours: form.opening_hours || undefined,
        business_description: form.business_description || undefined,
        access_route_description: form.access_route_description || undefined,
        max_vehicle_height_ft: form.max_vehicle_height_m ? parseFloat(form.max_vehicle_height_m) * 3.28084 : undefined,
        max_vehicle_width_ft: form.max_vehicle_width_m ? parseFloat(form.max_vehicle_width_m) * 3.28084 : undefined,
        max_vehicle_length_ft: form.max_vehicle_length_m ? parseFloat(form.max_vehicle_length_m) * 3.28084 : undefined,
        serves_food: form.serves_food,
        food_menu_description: form.food_menu_description || undefined,
        max_nights_per_stay: form.max_nights_per_stay ? parseInt(form.max_nights_per_stay) : undefined,
        available_days: availableDays.length < 7 ? availableDays : undefined,
        approval_status: form.approval_status,
        electric_hookup_available: form.electric_hookup_available,
        electric_hookup_capacity: form.electric_hookup_capacity ? parseInt(form.electric_hookup_capacity) : undefined,
        electric_hookup_price_per_night: form.electric_hookup_price_per_night ? parseFloat(form.electric_hookup_price_per_night) : undefined,
      };

      const result = await adminApi.createPlaceForUser(placeData);
      const placeId = result.place?.id;

      // Fire-and-forget — don't block success on image upload
      const allImages = [...(mainImage ? [mainImage] : []), ...images];
      if (allImages.length > 0 && placeId) {
        uploadApi.placeImages(placeId, allImages).catch(() => {});
      }

      setSuccess(`Site "${form.name}" created for ${ownerName}! It will appear in their app immediately.`);
      // Reset form
      setForm({
        name: '', description: '', address: '', city: '', postal_code: '', country: 'GB',
        latitude: '', longitude: '', price_per_night: '', capacity: '', place_type: 'pub',
        opening_hours: '', business_description: '', access_route_description: '',
        max_vehicle_height_m: '', max_vehicle_width_m: '', max_vehicle_length_m: '',
        serves_food: false, food_menu_description: '', max_nights_per_stay: '', approval_status: 'approved',
        electric_hookup_available: false, electric_hookup_capacity: '', electric_hookup_price_per_night: '',
      });
      setImages([]);
      setImagePreview([]);
      setMainImage(null);
      setMainImagePreview(null);
      setMarkerPos(null);
      setAvailableDays([1, 2, 3, 4, 5, 6, 7]);
      if (mapSearchRef.current) mapSearchRef.current.value = '';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create site');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm">{success}</div>}

      {/* Basic Info */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-200">Basic Information</h2>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Place Name *</label>
          <input
            type="text" value={form.name} onChange={e => f('name', e.target.value)} required
            placeholder="e.g. The Crown Car Park"
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
          <textarea
            value={form.description} onChange={e => f('description', e.target.value)} rows={3}
            placeholder="What makes this spot special..."
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Place Type *</label>
            <select
              value={form.place_type} onChange={e => f('place_type', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {PLACE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Price Per Night (£)</label>
            <input
              type="number" step="0.01" min="0" value={form.price_per_night}
              onChange={e => f('price_per_night', e.target.value)}
              placeholder="15.00"
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Max Vehicle Capacity</label>
            <input
              type="number" min="1" value={form.capacity} onChange={e => f('capacity', e.target.value)}
              placeholder="e.g. 5"
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Max Nights Per Stay</label>
            <input
              type="number" min="1" value={form.max_nights_per_stay}
              onChange={e => f('max_nights_per_stay', e.target.value)}
              placeholder="e.g. 3"
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Opening Hours</label>
          <input
            type="text" value={form.opening_hours} onChange={e => f('opening_hours', e.target.value)}
            placeholder="e.g. Mon–Fri 10am–10pm, Sat–Sun All day"
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Location */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-200">Location</h2>
        <p className="text-xs text-slate-500">Search the address to auto-fill, or type manually.</p>

        {isLoaded ? (
          <input
            ref={mapSearchRef}
            type="text"
            placeholder="Search address..."
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
            autoComplete="off"
          />
        ) : (
          <div className="h-10 bg-slate-800 rounded-lg animate-pulse" />
        )}

        {markerPos && (
          <p className="text-xs text-emerald-400">
            📍 Pin set: {markerPos.lat.toFixed(5)}, {markerPos.lng.toFixed(5)}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Address</label>
            <input
              type="text" value={form.address} onChange={e => f('address', e.target.value)}
              placeholder="123 High Street"
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">City / Town</label>
            <input
              type="text" value={form.city} onChange={e => f('city', e.target.value)}
              placeholder="e.g. Bristol"
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Postcode</label>
            <input
              type="text" value={form.postal_code} onChange={e => f('postal_code', e.target.value)}
              placeholder="BS1 1AA"
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Country</label>
            <input
              type="text" value={form.country} onChange={e => f('country', e.target.value)}
              placeholder="GB"
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Latitude</label>
            <input
              type="number" step="any" value={form.latitude} onChange={e => f('latitude', e.target.value)}
              placeholder="51.4545"
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Longitude</label>
            <input
              type="number" step="any" value={form.longitude} onChange={e => f('longitude', e.target.value)}
              placeholder="-2.5879"
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Access Route Description</label>
          <textarea
            value={form.access_route_description}
            onChange={e => f('access_route_description', e.target.value)} rows={2}
            placeholder="Turn left at the pub sign, car park is at the rear..."
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600 resize-none"
          />
        </div>
      </div>

      {/* Vehicle Limits */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-200">Vehicle Limits</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
          { field: 'max_vehicle_height_m' as const, label: 'Max Height (m)' },
            { field: 'max_vehicle_width_m' as const, label: 'Max Width (m)' },
            { field: 'max_vehicle_length_m' as const, label: 'Max Length (m)' },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
              <input
                type="number" step="0.1" min="0" value={form[field]}
                onChange={e => f(field, e.target.value)}
                placeholder="—"
                className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Electric Hookup */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-200">Electric Hookup</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-emerald-500"
            checked={form.electric_hookup_available}
            onChange={e => {
              f('electric_hookup_available', e.target.checked);
              if (!e.target.checked) {
                f('electric_hookup_capacity', '');
                f('electric_hookup_price_per_night', '');
              }
            }}
          />
          <span className="text-sm text-slate-300">⚡ Site has electric hookup spaces</span>
        </label>
        {form.electric_hookup_available && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Number of electric spaces</label>
              <input
                type="number" min="1"
                value={form.electric_hookup_capacity}
                onChange={e => f('electric_hookup_capacity', e.target.value)}
                placeholder="e.g. 4"
                className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Price per night (£, blank = free)</label>
              <input
                type="number" min="0" step="0.50"
                value={form.electric_hookup_price_per_night}
                onChange={e => f('electric_hookup_price_per_night', e.target.value)}
                placeholder="e.g. 5"
                className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Food */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200">Food</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-slate-400">Serves food</span>
            <div
              onClick={() => f('serves_food', !form.serves_food)}
              className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${form.serves_food ? 'bg-emerald-500' : 'bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${form.serves_food ? 'translate-x-4 ml-0.5' : 'ml-0.5'}`} />
            </div>
          </label>
        </div>
        {form.serves_food && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Menu Description</label>
            <textarea
              value={form.food_menu_description} onChange={e => f('food_menu_description', e.target.value)} rows={2}
              placeholder="Traditional pub meals, Sunday roasts..."
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600 resize-none"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Business Description</label>
          <textarea
            value={form.business_description} onChange={e => f('business_description', e.target.value)} rows={2}
            placeholder="Family-run pub since 1887, dog friendly..."
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600 resize-none"
          />
        </div>
      </div>

      {/* Available Days */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-200">Available Days</h2>
        <div className="flex gap-2 flex-wrap">
          {DAY_LABELS.map((label, i) => {
            const day = i + 1;
            const active = availableDays.includes(day);
            return (
              <button
                key={day} type="button" onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cover Photo */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-200">Cover Photo</h2>
        <p className="text-xs text-slate-500">The main image shown at the top of the listing. Upload one clear photo.</p>
        {mainImagePreview ? (
          <div className="relative w-full">
            <img src={mainImagePreview} alt="Cover" className="w-full h-40 object-cover rounded-lg" />
            <button
              type="button" onClick={() => { setMainImage(null); setMainImagePreview(null); }}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
            >×</button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-600 hover:border-emerald-500/50 rounded-xl p-6 cursor-pointer transition-colors">
            <span className="text-2xl">🖼️</span>
            <span className="text-sm text-slate-400">Click to upload cover photo</span>
            <input
              type="file" accept="image/*" className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setMainImage(file);
                const reader = new FileReader();
                reader.onload = ev => setMainImagePreview(ev.target?.result as string);
                reader.readAsDataURL(file);
              }}
            />
          </label>
        )}
      </div>

      {/* Additional Photos */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-200">Additional Photos</h2>
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-600 hover:border-emerald-500/50 rounded-xl p-6 cursor-pointer transition-colors">
          <span className="text-2xl">📸</span>
          <span className="text-sm text-slate-400">Click to upload extra photos (up to 10)</span>
          <input
            type="file" multiple accept="image/*" className="hidden"
            onChange={e => addFiles(Array.from(e.target.files || []))}
          />
        </label>
        {imagePreview.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {imagePreview.map((src, idx) => (
              <div key={idx} className="relative w-20 h-20">
                <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg" />
                <button
                  type="button" onClick={() => removeImage(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-200">Publication Status</h2>
        <div className="space-y-2">
          {APPROVAL_STATUSES.map(s => (
            <label key={s.value} className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => f('approval_status', s.value)}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${form.approval_status === s.value ? 'border-emerald-500 bg-emerald-500' : 'border-slate-500'}`}
              >
                {form.approval_status === s.value && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className="text-sm text-slate-300">{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit" disabled={saving}
        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
      >
        {saving ? 'Creating site...' : `Create site for ${ownerName}`}
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────────
   CREATE USER
───────────────────────────────────────────── */
function CreateUserPanel() {
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    role: 'host',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [otpResult, setOtpResult] = useState<{ name: string; email: string; otp: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const f = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOtpResult(null);
    if (!form.name || !form.email) {
      setError('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      const result = await adminApi.createUser({
        username: form.username || undefined,
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone || undefined,
      });
      setOtpResult({ name: result.user.name, email: result.user.email, otp: result.otp_password });
      setForm({ username: '', name: '', email: '', phone: '', role: 'host' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create account');
    }
    setSaving(false);
  };

  const copyOtp = () => {
    if (otpResult) {
      navigator.clipboard.writeText(otpResult.otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}
      {otpResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-4 rounded-xl text-sm space-y-3">
          <p className="font-semibold text-emerald-300">✅ Account created for {otpResult.name}</p>
          <p className="text-xs text-emerald-500/80">{otpResult.email}</p>
          <div>
            <p className="text-xs text-emerald-500/70 mb-1.5">One-time password — share this with the host. They must change it on first login:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-900 border border-emerald-500/30 text-emerald-300 font-mono text-base px-4 py-2.5 rounded-lg tracking-widest select-all">
                {otpResult.otp}
              </code>
              <button
                type="button"
                onClick={copyOtp}
                className="px-3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <p className="text-xs text-emerald-500/60">Switch to "Create Site" to set up their first site.</p>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-200">New Account Details</h2>
        <p className="text-xs text-slate-500">A one-time password is auto-generated — share it with the host. They must change it on first login.</p>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Username <span className="text-slate-600">(optional — auto-generated from name if blank)</span></label>
          <input
            type="text" value={form.username} onChange={e => f('username', e.target.value)}
            placeholder="aimeesmith"
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name *</label>
          <input
            type="text" value={form.name} onChange={e => f('name', e.target.value)} required
            placeholder="Aimee Smith"
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address *</label>
          <input
            type="email" value={form.email} onChange={e => f('email', e.target.value)} required
            placeholder="aimee@example.com"
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone Number</label>
          <input
            type="tel" value={form.phone} onChange={e => f('phone', e.target.value)}
            placeholder="07700 900000"
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Account Role</label>
          <div className="flex gap-2">
            {['host', 'user'].map(r => (
              <button
                key={r} type="button" onClick={() => f('role', r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${form.role === r ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {r === 'host' ? '🏠 Host' : '👤 User'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit" disabled={saving}
        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
      >
        {saving ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}
