'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMaps';
import { adminApi, uploadApi, ApiError, placesApi, crmApi, type User, type Place, type CRMLead } from '@/lib/api';



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

type Tab = 'site' | 'user' | 'search' | 'hosts';

export default function HostsOnboardingPage() {
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get('lead_id');
  const leadId = leadIdParam ? parseInt(leadIdParam, 10) : null;
  const editPlaceParam = searchParams.get('edit_place');
  const editPlaceId = editPlaceParam ? parseInt(editPlaceParam, 10) : null;

  const [tab, setTab] = useState<Tab>('site');
  const [leadPrefill, setLeadPrefill] = useState<CRMLead | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState('');

  useEffect(() => {
    if (!leadId) return;
    setTab('site');
    setLeadLoading(true);
    setLeadError('');
    crmApi.getLead(leadId)
      .then(res => setLeadPrefill(res.lead))
      .catch(() => setLeadError('Could not load lead data — you can still create the site manually.'))
      .finally(() => setLeadLoading(false));
  }, [leadId]);

  useEffect(() => {
    if (editPlaceId) setTab('search');
  }, [editPlaceId]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Host Onboarding</h1>
        <p className="text-sm text-slate-500 mt-1">Create accounts and sites for hosts you&apos;re onboarding in person.</p>
      </div>

      {leadId && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm">
          {leadLoading && <span className="text-emerald-300">Loading lead data…</span>}
          {leadError && <span className="text-red-400">{leadError}</span>}
          {leadPrefill && (
            <div className="flex items-center justify-between gap-3">
              <div className="text-emerald-200">
                <span className="font-semibold">Creating site from lead:</span>{' '}
                {leadPrefill.business_name || `${leadPrefill.first_name || ''} ${leadPrefill.last_name || ''}`.trim() || `Lead #${leadPrefill.id}`}
                {leadPrefill.location && <span className="text-emerald-400/80"> · {leadPrefill.location}</span>}
              </div>
              <span className="text-[10px] uppercase tracking-wide text-emerald-400/70 flex-shrink-0">auto-fill enabled</span>
            </div>
          )}
        </div>
      )}

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
        <button
          onClick={() => setTab('search')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'search' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
        >
          🔍 Search Sites
        </button>
        <button
          onClick={() => setTab('hosts')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'hosts' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
        >
          👤 Search Hosts
        </button>
      </div>

      {tab === 'site' ? <CreateSitePanel leadPrefill={leadPrefill} /> : tab === 'user' ? <CreateUserPanel /> : tab === 'search' ? <SearchSitesPanel initialEditPlaceId={editPlaceId} /> : <SearchHostsPanel />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CREATE SITE
───────────────────────────────────────────── */
function CreateSitePanel({ leadPrefill }: { leadPrefill?: CRMLead | null }) {
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creatingHost, setCreatingHost] = useState(false);
  const [createHostError, setCreateHostError] = useState('');
  const [createHostNotice, setCreateHostNotice] = useState('');

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

  const quickCreateHostFromLead = async () => {
    if (!leadPrefill || creatingHost) return;
    setCreateHostError('');
    setCreateHostNotice('');
    const contactName = `${leadPrefill.first_name || ''} ${leadPrefill.last_name || ''}`.trim()
      || leadPrefill.business_name?.trim()
      || '';
    if (!contactName) {
      setCreateHostError('Lead has no name — add one on the lead first.');
      return;
    }
    setCreatingHost(true);
    try {
      const result = await adminApi.createUser({
        name: contactName,
        role: 'host',
        ...(leadPrefill.email ? { email: leadPrefill.email } : {}),
        ...(leadPrefill.phone ? { phone: leadPrefill.phone } : {}),
      });
      setSelectedUser(result.user);
      if (result.invite_sent) {
        setCreateHostNotice(`Host account created and invite email sent to ${result.user.email}.`);
      } else if (result.otp_password) {
        setCreateHostNotice(`Host account created. Temporary password: ${result.otp_password}`);
      } else {
        setCreateHostNotice('Host account created.');
      }
    } catch (err) {
      setCreateHostError(err instanceof ApiError ? err.message : 'Failed to create host.');
    } finally {
      setCreatingHost(false);
    }
  };

  if (selectedUser) {
    return (
      <div className="space-y-4">
        {createHostNotice && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm">{createHostNotice}</div>
        )}
        {/* Selected user banner */}
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
              {selectedUser.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">{selectedUser.name}</p>
              {selectedUser.email && !selectedUser.email.endsWith('@noemail.properplace.internal') && (
                <p className="text-xs text-slate-400">{selectedUser.email}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setSelectedUser(null)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-3 py-1 rounded-lg bg-slate-800"
          >
            Change
          </button>
        </div>

        <PlaceForm ownerId={selectedUser.id} ownerName={selectedUser.name} leadPrefill={leadPrefill} />
      </div>
    );
  }

  const leadContactName = leadPrefill
    ? `${leadPrefill.first_name || ''} ${leadPrefill.last_name || ''}`.trim() || leadPrefill.business_name || ''
    : '';

  return (
    <div className="space-y-4">
      {leadPrefill && leadContactName && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-slate-200">Quick-create host from lead</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              No account yet for this contact? Create one instantly using the lead&apos;s details, then continue straight to the site form.
            </p>
          </div>
          <div className="text-xs text-slate-300 space-y-1 bg-slate-800/60 rounded-lg p-3">
            <div><span className="text-slate-500">Name:</span> <span className="text-slate-100 font-medium">{leadContactName}</span></div>
            {leadPrefill.email && <div><span className="text-slate-500">Email:</span> {leadPrefill.email}</div>}
            {leadPrefill.phone && <div><span className="text-slate-500">Phone:</span> {leadPrefill.phone}</div>}
            <div><span className="text-slate-500">Role:</span> <span className="text-emerald-400">host</span></div>
          </div>
          {createHostError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-xs">{createHostError}</div>
          )}
          <button
            type="button"
            onClick={quickCreateHostFromLead}
            disabled={creatingHost}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {creatingHost ? 'Creating host…' : '⚡ Create host from lead & continue'}
          </button>
        </div>
      )}

      {createHostNotice && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm">{createHostNotice}</div>
      )}

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-200">Search for existing user</h2>
        <p className="text-xs text-slate-500">Type the host&apos;s name, username or email. If they don&apos;t have an account yet, use the &quot;Create User&quot; tab first.</p>

        <div className="relative">
          <input
            type="text"
            value={userSearch}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="e.g. Aimee, @aimee or aimee@example.com"
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
                  <p className="text-xs text-slate-500 truncate">
                    {u.username ? `@${u.username}` : ''}
                    {u.username && u.email && !u.email.endsWith('@noemail.properplace.internal') ? ' · ' : ''}
                    {!u.email?.endsWith('@noemail.properplace.internal') ? u.email : ''}
                  </p>
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
const PLACE_TYPE_VALUES = PLACE_TYPES.map(t => t.value);

function mapLeadPropertyTypeToPlaceType(pt: string | null | undefined): string {
  if (!pt) return 'pub';
  const normalized = pt.toLowerCase().trim();
  if (PLACE_TYPE_VALUES.includes(normalized)) return normalized;
  // Common aliases from CRM lead property_type
  if (normalized.includes('pub')) return 'pub';
  if (normalized.includes('farm')) return 'farm';
  if (normalized.includes('vineyard') || normalized.includes('winery')) return 'vineyard';
  if (normalized.includes('camp')) return 'campsite';
  if (normalized.includes('coast') || normalized.includes('beach')) return 'coastal';
  if (normalized.includes('wood') || normalized.includes('forest')) return 'woodland';
  if (normalized.includes('garden') || normalized.includes('estate')) return 'garden';
  return 'pub';
}

// Great-circle distance in kilometres (used for duplicate-site guard).
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Compact Google-style weekly opening hours into human-readable ranges.
//   "Monday: 11:00 AM – 11:00 PM\nTuesday: 11:00 AM – 11:00 PM\n..." →
//   "Mon–Sat 11am–11pm, Sun 12pm–10pm"
function compactOpeningHours(text: string | null | undefined): string {
  if (!text) return '';
  const shortName: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
    friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  };
  const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const simplifyTime = (t: string): string => {
    const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!m) return t.trim();
    const hour = m[1];
    const mins = m[2];
    const ap = (m[3] || '').toLowerCase();
    const timeStr = mins && mins !== '00' ? `${hour}:${mins}` : hour;
    return `${timeStr}${ap}`;
  };

  const normalizeHours = (hours: string): string => {
    const h = hours.trim();
    if (/closed/i.test(h)) return 'closed';
    if (/open\s*24|24\s*hours?/i.test(h)) return '24hr';
    const parts = h.split(/\s*[–—-]\s*/).map(p => p.trim());
    if (parts.length !== 2) return h.toLowerCase();
    return `${simplifyTime(parts[0])}–${simplifyTime(parts[1])}`;
  };

  const parsed: { day: string; hours: string }[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z]+)\s*:?\s*(.+)$/);
    if (!m) continue;
    const dayKey = m[1].toLowerCase();
    if (!shortName[dayKey]) continue;
    parsed.push({ day: dayKey, hours: normalizeHours(m[2]) });
  }
  if (parsed.length === 0) return text.trim();

  parsed.sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));

  // Group consecutive days that share the same hours
  const groups: { days: string[]; hours: string }[] = [];
  for (const p of parsed) {
    const last = groups[groups.length - 1];
    const isConsecutive =
      last &&
      last.hours === p.hours &&
      order.indexOf(p.day) === order.indexOf(last.days[last.days.length - 1]) + 1;
    if (isConsecutive) {
      last.days.push(p.day);
    } else {
      groups.push({ days: [p.day], hours: p.hours });
    }
  }

  return groups
    .map(g => {
      const first = shortName[g.days[0]];
      const last = shortName[g.days[g.days.length - 1]];
      const range = g.days.length === 1 ? first : `${first}–${last}`;
      return g.hours === 'closed' ? `${range} closed` : `${range} ${g.hours}`;
    })
    .join(', ');
}

// Human-sounding site description tailored to motorhome guests. Deliberately
// avoids generic marketing words; leaves the copy in draft so it gets reviewed
// before it goes live.
function generateSiteDescription(lead: CRMLead): string {
  const nameRaw = lead.business_name?.trim() || '';
  const name = nameRaw || 'This spot';
  const city = lead.location?.split(',')[0]?.trim() || '';
  const cityBit = city ? ` in ${city}` : '';
  const type = mapLeadPropertyTypeToPlaceType(lead.property_type);
  const parking = lead.parking_spaces;
  const parkingBit = parking && parking >= 2
    ? ` There's room for around ${parking} motorhomes.`
    : parking === 1
      ? ' One motorhome fits comfortably.'
      : '';
  const ratingBit = lead.google_rating && lead.google_reviews_count
    ? ` Locals rate it ${lead.google_rating}★ on Google (${lead.google_reviews_count} reviews).`
    : lead.google_rating
      ? ` Locals rate it ${lead.google_rating}★ on Google.`
      : '';

  const intros: Record<string, string> = {
    pub: `${name} is a proper country pub${cityBit} that opens its car park to motorhomes for the night. Pop in for a pint or a bite to eat, then head back to the van for a quiet, secure stop before you carry on in the morning.`,
    farm: `A working farm${cityBit} with plenty of level ground for motorhomes. Wake up to open fields and fresh air, well away from the noise of the road.`,
    vineyard: `${name} welcomes motorhomes to park among the vines overnight${cityBit}. Cellar tours and tastings are usually available — just ask when you arrive.`,
    campsite: `A relaxed campsite${cityBit} set up for motorhomes of every size. Level pitches, clean facilities, and a proper welcome from the owners.`,
    coastal: `A cracking spot right by the coast${cityBit}, perfect for waking up to a sea view from your motorhome. Level parking, easy access, and stunning sunsets.`,
    woodland: `A quiet woodland setting${cityBit} where motorhomes can park up for the night, tucked away from the noise of the road. Bring a book and enjoy the peace.`,
    garden: `A private garden${cityBit} opening its gates to motorhomes for overnight stays. Beautiful surroundings and a warm host.`,
    private_land: `Private land${cityBit} with generous space for motorhomes. A calm, out-of-the-way place to spend the night.`,
    other: `${name}${cityBit} is a welcoming stop-off for motorhomes needing a safe place to park up for the night.`,
  };

  return `${intros[type] || intros.other}${parkingBit}${ratingBit}`.trim();
}

function PlaceForm({ ownerId, ownerName, leadPrefill }: { ownerId: number; ownerName: string; leadPrefill?: CRMLead | null }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const mapSearchRef = useRef<HTMLInputElement>(null);
  const { isLoaded } = useJsApiLoader({ id: GOOGLE_MAPS_LOADER_ID, googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(
    leadPrefill?.latitude != null && leadPrefill?.longitude != null
      ? { lat: Number(leadPrefill.latitude), lng: Number(leadPrefill.longitude) }
      : null
  );
  const [images, setImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [form, setForm] = useState(() => {
    const prefillName = leadPrefill?.business_name
      || `${leadPrefill?.first_name || ''} ${leadPrefill?.last_name || ''}`.trim()
      || '';
    return {
      name: prefillName,
      description: leadPrefill ? generateSiteDescription(leadPrefill) : '',
      address: '',
      city: '',
      postal_code: '',
      country: 'GB',
      latitude: leadPrefill?.latitude != null ? String(leadPrefill.latitude) : '',
      longitude: leadPrefill?.longitude != null ? String(leadPrefill.longitude) : '',
      price_per_night: '',
      capacity: leadPrefill?.parking_spaces != null ? String(leadPrefill.parking_spaces) : '',
      place_type: mapLeadPropertyTypeToPlaceType(leadPrefill?.property_type),
      opening_hours: compactOpeningHours(leadPrefill?.opening_hours_text),
      business_description: '',
      access_route_description: '',
      max_vehicle_height_m: '',
      max_vehicle_width_m: '',
      max_vehicle_length_m: '',
      serves_food: false,
      food_menu_description: '',
      max_nights_per_stay: '',
      // Lead-sourced sites default to pending so the auto-generated description
      // is reviewed before the listing goes live. Manual creates stay 'approved'.
      approval_status: leadPrefill ? 'pending' : 'approved',
      electric_hookup_available: false,
      electric_hookup_capacity: '',
      electric_hookup_price_per_night: '',
    };
  });
  const [amenities, setAmenities] = useState<string[]>([]);

  // Duplicate-site guard: if a place with the same name already exists within
  // ~200m of the coordinates, warn the user so they can decide before creating.
  const [duplicate, setDuplicate] = useState<Place | null>(null);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

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

  // Auto-lookup address details from the lead when pre-filling. Prefers the
  // lead's google_place_id (unambiguous); falls back to a text search combining
  // business name + location.
  useEffect(() => {
    if (!isLoaded || !leadPrefill) return;

    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    const fields = ['address_components', 'geometry', 'formatted_address', 'name'];

    const applyPlace = (place: google.maps.places.PlaceResult | null) => {
      if (!place || !place.geometry?.location) return;
      const get = (type: string, short = false) =>
        place.address_components?.find(c => c.types.includes(type))?.[short ? 'short_name' : 'long_name'] ?? '';
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setMarkerPos({ lat, lng });
      setForm(prev => ({
        ...prev,
        address: [get('street_number'), get('route')].filter(Boolean).join(' ') || place.formatted_address || prev.address,
        city: get('postal_town') || get('locality') || get('administrative_area_level_2') || prev.city,
        postal_code: get('postal_code') || prev.postal_code,
        country: get('country', true) || prev.country || 'GB',
        latitude: lat.toString(),
        longitude: lng.toString(),
      }));
    };

    if (leadPrefill.google_place_id) {
      service.getDetails(
        { placeId: leadPrefill.google_place_id, fields },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) applyPlace(place);
        }
      );
      return;
    }

    const businessName = leadPrefill.business_name
      || `${leadPrefill.first_name || ''} ${leadPrefill.last_name || ''}`.trim();
    const query = [businessName, leadPrefill.location].filter(Boolean).join(', ');
    if (!query) return;

    service.findPlaceFromQuery(
      { query, fields: ['place_id'] },
      (results, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results?.[0]?.place_id) return;
        service.getDetails(
          { placeId: results[0].place_id!, fields },
          (place, s) => {
            if (s === window.google.maps.places.PlacesServiceStatus.OK) applyPlace(place);
          }
        );
      }
    );
  }, [isLoaded, leadPrefill]);

  // Duplicate-site guard: whenever we have a name + coordinates, ask the admin
  // API for places matching the name and check whether any are within ~200m.
  useEffect(() => {
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!form.name || !isFinite(lat) || !isFinite(lng)) {
      setDuplicate(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      adminApi.places({ search: form.name, limit: '20' })
        .then(res => {
          if (cancelled) return;
          const match = (res.places || []).find(p => {
            if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') return false;
            return haversineKm(lat, lng, p.latitude, p.longitude) < 0.2;
          });
          setDuplicate(match || null);
          if (!match) setDuplicateDismissed(false);
        })
        .catch(() => { if (!cancelled) setDuplicate(null); });
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [form.name, form.latitude, form.longitude]);

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
    if (duplicate && !duplicateDismissed) {
      setError(`A similar site already exists near this location. Click "Create anyway" on the warning banner to confirm.`);
      return;
    }

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
        amenities,
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

      // If this site was created from a CRM lead, link the place and move the lead
      // to the appropriate pipeline stage:
      //   approved  → converted   (Live)
      //   pending   → negotiating (Listing process — awaiting approval)
      //   draft     → negotiating (Listing process — draft)
      let leadStageMessage = '';
      if (leadPrefill?.id && placeId) {
        const nextStage = form.approval_status === 'approved' ? 'converted' : 'negotiating';
        const stageLabel = nextStage === 'converted' ? 'Live' : 'Listing process';
        try {
          await crmApi.updateLead(leadPrefill.id, {
            pipeline_stage: nextStage,
            place_id: placeId,
          } as Partial<CRMLead>);
          leadStageMessage = ` Lead moved to ${stageLabel}.`;
        } catch {
          leadStageMessage = ' (Site created, but the lead could not be updated automatically.)';
        }
        try {
          await crmApi.createActivity(leadPrefill.id, {
            activity_type: 'note',
            title: `Site created: ${form.name}`,
            description: `Linked site #${placeId} to this lead (${form.approval_status}).`,
          });
        } catch { /* activity is nice-to-have */ }
      }

      setSuccess(`Site "${form.name}" created for ${ownerName}! It will appear in their app immediately.${leadStageMessage}`);
      // Reset form
      setForm({
        name: '', description: '', address: '', city: '', postal_code: '', country: 'GB',
        latitude: '', longitude: '', price_per_night: '', capacity: '', place_type: 'pub',
        opening_hours: '', business_description: '', access_route_description: '',
        max_vehicle_height_m: '', max_vehicle_width_m: '', max_vehicle_length_m: '',
        serves_food: false, food_menu_description: '', max_nights_per_stay: '', approval_status: 'approved',
        electric_hookup_available: false, electric_hookup_capacity: '', electric_hookup_price_per_night: '',
      });
      setAmenities([]);
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

      {duplicate && !duplicateDismissed && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="text-amber-200">
              <p className="font-semibold">⚠️ Possible duplicate site</p>
              <p className="text-amber-300/90 text-xs mt-1">
                A site called <span className="font-semibold">{duplicate.name}</span>
                {duplicate.city ? ` in ${duplicate.city}` : ''} already exists at this location
                {' '}(owner: {duplicate.owner_name || `#${duplicate.owner_id}`}, status: {duplicate.approval_status || 'unknown'}).
                {' '}Are you sure you want to create another?
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDuplicateDismissed(true)}
              className="text-[11px] text-amber-300 hover:text-amber-100 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 flex-shrink-0 whitespace-nowrap"
            >
              Create anyway
            </button>
          </div>
        </div>
      )}

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

      {/* Facilities */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-200">Facilities</h2>
        <div className="flex flex-wrap gap-2">
          {['WiFi', 'Drinking Water', 'Toilets', 'Showers', 'Chemical Toilet Disposal', 'Grey Water Disposal', 'Dog Friendly', 'Campfire Allowed'].map(facility => {
            const selected = amenities.includes(facility);
            return (
              <button
                key={facility}
                type="button"
                onClick={() => setAmenities(prev => selected ? prev.filter(f => f !== facility) : [...prev, facility])}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selected
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-emerald-500'
                }`}
              >
                {facility}
              </button>
            );
          })}
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
  const [otpResult, setOtpResult] = useState<{ name: string; username: string; email?: string; otp: string | null; invite_sent?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const f = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOtpResult(null);
    if (!form.name) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      const result = await adminApi.createUser({
        ...(form.username ? { username: form.username } : {}),
        name: form.name,
        ...(form.email ? { email: form.email } : {}),
        role: form.role,
        ...(form.phone ? { phone: form.phone } : {}),
      });
      setOtpResult({
        name: result.user.name,
        username: result.user.username ?? '',
        email: result.email_is_placeholder ? undefined : result.user.email,
        otp: result.otp_password,
        invite_sent: result.invite_sent,
      });
      setForm({ username: '', name: '', email: '', phone: '', role: 'host' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create account');
    }
    setSaving(false);
  };

  const copyOtp = () => {
    if (otpResult?.otp) {
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
          {otpResult.email && <p className="text-xs text-emerald-500/80">{otpResult.email}</p>}
          {otpResult.invite_sent ? (
            <p className="text-sm text-emerald-400">📧 Invitation email sent — they'll receive a link to set their password.</p>
          ) : (
            <>
              <div>
                <p className="text-xs text-emerald-500/70 mb-1">Login username:</p>
                <code className="bg-slate-900 border border-emerald-500/30 text-emerald-300 font-mono text-sm px-3 py-1.5 rounded-lg select-all">{otpResult.username}</code>
              </div>
              <div>
                <p className="text-xs text-emerald-500/70 mb-1.5">One-time password — share this with them. They must change it on first login:</p>
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
            </>
          )}
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
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address <span className="text-slate-600">(optional — needed for password reset)</span></label>
          <input
            type="email" value={form.email} onChange={e => f('email', e.target.value)}
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
          <div className="flex gap-2 flex-wrap">
            {(['host', 'user', 'employee'] as const).map(r => (
              <button
                key={r} type="button" onClick={() => f('role', r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${form.role === r ? (r === 'employee' ? 'bg-violet-500 text-white' : 'bg-emerald-500 text-white') : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {r === 'host' ? '🏠 Host' : r === 'user' ? '👤 User' : '🔧 Employee'}
              </button>
            ))}
          </div>
          {form.role === 'employee' && (
            <p className="text-xs text-violet-400/80 mt-2">Employee accounts get CRM access. If you provide an email, an invitation link will be sent automatically.</p>
          )}
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

/* ─────────────────────────────────────────────
   SEARCH & EDIT SITES
───────────────────────────────────────────── */
type CRMPlace = { id: number; name: string; address: string; city: string; approval_status: string; place_type: string | null; price_per_night: number | null; owner_name: string; owner_email: string; owner_phone: string | null };

function SearchSitesPanel({ initialEditPlaceId }: { initialEditPlaceId?: number | null } = {}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CRMPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPlace, setEditPlace] = useState<Place | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [editAmenities, setEditAmenities] = useState<string[]>([]);
  const [editImageUrls, setEditImageUrls] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ef = (field: string, value: unknown) =>
    setEditForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (initialEditPlaceId) openEdit(initialEditPlaceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditPlaceId]);

  const search = (q: string) => {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); return; }
    debounce.current = setTimeout(() => {
      setSearching(true);
      crmApi.searchPlaces(q)
        .then(d => setResults(d.places || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
  };

  const openEdit = (id: number) => {
    if (editingId === id) { setEditingId(null); setEditPlace(null); return; }
    setEditingId(id);
    setEditLoading(true);
    setSaveMsg('');
    setSaveError('');
    placesApi.get(id)
      .then(d => {
        const p = d.place || (d as unknown as Place);
        setEditPlace(p);
        setEditAmenities(p.amenities || []);
        setEditImageUrls(p.image_urls || []);
        // If the place isn't in the results list yet (deep-link), inject a summary row.
        setResults(prev => prev.find(r => r.id === id) ? prev : [{
          id: p.id,
          name: p.name || '',
          address: p.address || '',
          city: p.city || '',
          approval_status: p.approval_status || 'pending',
          place_type: p.place_type || null,
          price_per_night: (p.price_per_night as number) ?? null,
          owner_name: p.owner_name || '',
          owner_email: p.owner_email || '',
          owner_phone: null,
        }, ...prev]);
        setEditForm({
          name: p.name || '',
          description: p.description || '',
          address: p.address || '',
          city: p.city || '',
          postal_code: p.postal_code || '',
          country: p.country || 'GB',
          price_per_night: p.price_per_night?.toString() || '',
          capacity: p.capacity?.toString() || '',
          place_type: p.place_type || 'private_land',
          approval_status: p.approval_status || 'pending',
          access_route_description: p.access_route_description || '',
          business_description: p.business_description || '',
          opening_hours: p.opening_hours || '',
          serves_food: p.serves_food || false,
          food_menu_description: p.food_menu_description || '',
          max_nights_per_stay: p.max_nights_per_stay?.toString() || '',
          max_vehicle_height_ft: p.max_vehicle_height_ft?.toString() || '',
          max_vehicle_width_ft: p.max_vehicle_width_ft?.toString() || '',
          max_vehicle_length_ft: p.max_vehicle_length_ft?.toString() || '',
          electric_hookup_available: p.electric_hookup_available || false,
          electric_hookup_capacity: p.electric_hookup_capacity?.toString() || '',
          electric_hookup_price_per_night: p.electric_hookup_price_per_night?.toString() || '',
        });
      })
      .catch(() => setSaveError('Failed to load site'))
      .finally(() => setEditLoading(false));
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    setSaveMsg('');
    setSaveError('');
    try {
      // Always send every field (null = clear, not undefined = skip).
      // This ensures all fields are saved and future fields carry through automatically.
      const updateData: Record<string, unknown> = {
        name: editForm.name as string,
        description: (editForm.description as string) || null,
        address: (editForm.address as string) || null,
        city: (editForm.city as string) || null,
        postal_code: (editForm.postal_code as string) || null,
        country: (editForm.country as string) || null,
        price_per_night: editForm.price_per_night ? parseFloat(editForm.price_per_night as string) : null,
        capacity: editForm.capacity ? parseInt(editForm.capacity as string) : null,
        place_type: editForm.place_type as string,
        amenities: editAmenities,
        image_urls: editImageUrls,
        access_route_description: (editForm.access_route_description as string) || null,
        business_description: (editForm.business_description as string) || null,
        opening_hours: (editForm.opening_hours as string) || null,
        serves_food: editForm.serves_food as boolean,
        food_menu_description: (editForm.food_menu_description as string) || null,
        max_nights_per_stay: editForm.max_nights_per_stay ? parseInt(editForm.max_nights_per_stay as string) : null,
        max_vehicle_height_ft: editForm.max_vehicle_height_ft ? parseFloat(editForm.max_vehicle_height_ft as string) : null,
        max_vehicle_width_ft: editForm.max_vehicle_width_ft ? parseFloat(editForm.max_vehicle_width_ft as string) : null,
        max_vehicle_length_ft: editForm.max_vehicle_length_ft ? parseFloat(editForm.max_vehicle_length_ft as string) : null,
        electric_hookup_available: editForm.electric_hookup_available as boolean,
        electric_hookup_capacity: editForm.electric_hookup_available && editForm.electric_hookup_capacity ? parseInt(editForm.electric_hookup_capacity as string) : null,
        electric_hookup_price_per_night: editForm.electric_hookup_available && editForm.electric_hookup_price_per_night ? parseFloat(editForm.electric_hookup_price_per_night as string) : null,
      };

      // Handle approval status separately via admin endpoints
      const newStatus = editForm.approval_status as string;
      const oldStatus = editPlace?.approval_status;
      if (newStatus !== oldStatus) {
        if (newStatus === 'approved') await adminApi.approvePlace(id);
        else if (newStatus === 'rejected') await adminApi.rejectPlace(id, 'Rejected via CRM');
      }

      await placesApi.update(id, updateData as unknown as Partial<Place>);

      // Refresh the result in the list
      setResults(prev => prev.map(r => r.id === id ? {
        ...r,
        name: (updateData.name as string) || r.name,
        approval_status: newStatus || r.approval_status,
        price_per_night: (updateData.price_per_night as number) ?? r.price_per_night,
      } : r));

      setSaveMsg('saved');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save');
    }
    setSaving(false);
    // Auto-reset button after 2s
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const statusColor = (s: string) => {
    if (s === 'approved') return 'text-emerald-400';
    if (s === 'pending') return 'text-amber-400';
    if (s === 'draft') return 'text-slate-400';
    if (s === 'rejected') return 'text-red-400';
    return 'text-slate-400';
  };

  const inp = 'w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600';
  const lbl = 'block text-xs font-medium text-slate-400 mb-1';

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <input
          type="text"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search by site name, address, owner name or email…"
          className={inp}
          autoFocus
        />
      </div>

      {searching && <p className="text-sm text-slate-500 px-1">Searching…</p>}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(place => (
            <div key={place.id} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              {/* Row */}
              <button
                type="button"
                onClick={() => openEdit(place.id)}
                className="w-full flex items-start justify-between gap-4 p-4 hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{place.name}</p>
                  <p className="text-xs text-slate-400 truncate">{place.address}{place.city ? `, ${place.city}` : ''}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Owner: {place.owner_name} · {place.owner_email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${statusColor(place.approval_status)}`}>{place.approval_status}</span>
                  {place.price_per_night != null && <span className="text-xs text-slate-400">£{place.price_per_night}/night</span>}
                  <span className="text-xs text-slate-600">{editingId === place.id ? '▲ Close' : '▼ Edit'}</span>
                </div>
              </button>

              {/* Edit panel */}
              {editingId === place.id && (
                <div className="border-t border-slate-700 p-5 space-y-5 bg-slate-950">
                  {editLoading ? (
                    <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
                  ) : (
                    <>
                      {saveError && <div className="bg-red-900/40 text-red-300 text-sm px-4 py-2 rounded-lg">{saveError}</div>}

                      {/* Basic */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><label className={lbl}>Site Name</label><input className={inp} value={editForm.name as string} onChange={e => ef('name', e.target.value)} /></div>
                        <div className="col-span-2"><label className={lbl}>Description</label><textarea className={inp} rows={3} value={editForm.description as string} onChange={e => ef('description', e.target.value)} /></div>
                        <div className="col-span-2"><label className={lbl}>Address</label><input className={inp} value={editForm.address as string} onChange={e => ef('address', e.target.value)} /></div>
                        <div><label className={lbl}>City</label><input className={inp} value={editForm.city as string} onChange={e => ef('city', e.target.value)} /></div>
                        <div><label className={lbl}>Postal Code</label><input className={inp} value={editForm.postal_code as string} onChange={e => ef('postal_code', e.target.value)} /></div>
                        <div>
                          <label className={lbl}>Place Type</label>
                          <select className={inp} value={editForm.place_type as string} onChange={e => ef('place_type', e.target.value)}>
                            {PLACE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>Approval Status</label>
                          <select className={inp} value={editForm.approval_status as string} onChange={e => ef('approval_status', e.target.value)}>
                            {APPROVAL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <div><label className={lbl}>Price / Night (£)</label><input type="number" min="0" step="0.50" className={inp} value={editForm.price_per_night as string} onChange={e => ef('price_per_night', e.target.value)} /></div>
                        <div><label className={lbl}>Capacity (vans)</label><input type="number" min="1" className={inp} value={editForm.capacity as string} onChange={e => ef('capacity', e.target.value)} /></div>
                        <div className="col-span-2"><label className={lbl}>Access Route Description</label><textarea className={inp} rows={2} value={editForm.access_route_description as string} onChange={e => ef('access_route_description', e.target.value)} /></div>
                        <div className="col-span-2"><label className={lbl}>Business Description</label><textarea className={inp} rows={2} value={editForm.business_description as string} onChange={e => ef('business_description', e.target.value)} /></div>
                      </div>

                      {/* Facilities */}
                      <div>
                        <label className={lbl + ' text-slate-300 text-sm'}>Facilities</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {['WiFi', 'Drinking Water', 'Toilets', 'Showers', 'Chemical Toilet Disposal', 'Grey Water Disposal', 'Dog Friendly', 'Campfire Allowed'].map(fac => {
                            const sel = editAmenities.includes(fac);
                            return (
                              <button key={fac} type="button"
                                onClick={() => setEditAmenities(prev => sel ? prev.filter(f => f !== fac) : [...prev, fac])}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${sel ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-emerald-500'}`}
                              >{fac}</button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Electric hookup */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 accent-emerald-500" checked={editForm.electric_hookup_available as boolean} onChange={e => { ef('electric_hookup_available', e.target.checked); if (!e.target.checked) { ef('electric_hookup_capacity', ''); ef('electric_hookup_price_per_night', ''); } }} />
                          <span className="text-sm text-slate-300">⚡ Electric hookup available</span>
                        </label>
                        {!!(editForm.electric_hookup_available) && (
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <div><label className={lbl}>Number of electric spaces</label><input type="number" min="1" className={inp} value={editForm.electric_hookup_capacity as string} onChange={e => ef('electric_hookup_capacity', e.target.value)} /></div>
                            <div><label className={lbl}>Price/night (£, blank = free)</label><input type="number" min="0" step="0.50" className={inp} value={editForm.electric_hookup_price_per_night as string} onChange={e => ef('electric_hookup_price_per_night', e.target.value)} /></div>
                          </div>
                        )}
                      </div>

                      {/* Booking rules */}
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={lbl}>Max Nights Per Stay (blank = no limit)</label><input type="number" min="1" max="30" className={inp} value={editForm.max_nights_per_stay as string} onChange={e => ef('max_nights_per_stay', e.target.value)} /></div>
                        <div><label className={lbl}>Max Length ft</label><input type="number" step="0.1" className={inp} value={editForm.max_vehicle_length_ft as string} onChange={e => ef('max_vehicle_length_ft', e.target.value)} /></div>
                        <div><label className={lbl}>Max Height ft</label><input type="number" step="0.1" className={inp} value={editForm.max_vehicle_height_ft as string} onChange={e => ef('max_vehicle_height_ft', e.target.value)} /></div>
                        <div><label className={lbl}>Max Width ft</label><input type="number" step="0.1" className={inp} value={editForm.max_vehicle_width_ft as string} onChange={e => ef('max_vehicle_width_ft', e.target.value)} /></div>
                      </div>

                      {/* Food */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 accent-emerald-500" checked={editForm.serves_food as boolean} onChange={e => ef('serves_food', e.target.checked)} />
                          <span className="text-sm text-slate-300">Serves food</span>
                        </label>
                        {!!(editForm.serves_food) && (
                          <div><label className={lbl}>Menu Description</label><textarea className={inp} rows={2} value={editForm.food_menu_description as string} onChange={e => ef('food_menu_description', e.target.value)} /></div>
                        )}
                      </div>

                      {/* Photos */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-300">Photos ({editImageUrls.length})</span>
                          <a
                            href={`/place/${place.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                          >
                            View as user ↗
                          </a>
                        </div>
                        {editImageUrls.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {editImageUrls.map((url, i) => (
                              <div key={url} className="relative aspect-square rounded-lg overflow-hidden group">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                {i === 0 && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Main</span>}
                                <button
                                  type="button"
                                  onClick={() => setEditImageUrls(prev => prev.filter((_, idx) => idx !== i))}
                                  className="absolute top-1 right-1 bg-red-600/90 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >✕</button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">No photos uploaded yet</p>
                        )}
                        <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-slate-600 hover:border-emerald-500 transition-colors ${photoUploading ? 'opacity-50' : ''}`}>
                          <span className="text-xs text-slate-400">{photoUploading ? 'Uploading…' : '+ Add photos'}</span>
                          <input
                            type="file" accept="image/*" multiple className="hidden"
                            disabled={photoUploading}
                            onChange={async e => {
                              const files = Array.from(e.target.files || []);
                              if (!files.length) return;
                              setPhotoUploading(true);
                              try {
                                const res = await uploadApi.placeImages(place.id, files);
                                setEditImageUrls(prev => [...prev, ...(res.imageUrls || [])]);
                              } catch { setSaveError('Failed to upload photos'); }
                              setPhotoUploading(false);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {editImageUrls.length > 0 && <p className="text-[11px] text-slate-600">Removals take effect when you Save Changes. First photo is the main image.</p>}
                      </div>

                      {/* Save */}
                      <button
                        type="button"
                        onClick={() => handleSave(place.id)}
                        disabled={saving || saveMsg === 'saved'}
                        className={`w-full font-semibold py-2.5 rounded-xl text-sm transition-colors ${
                          saveMsg === 'saved'
                            ? 'bg-emerald-700 text-emerald-200 cursor-default'
                            : 'bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white'
                        }`}
                      >
                        {saving ? 'Saving…' : saveMsg === 'saved' ? '✓ Saved' : 'Save Changes'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!searching && query && results.length === 0 && (
        <p className="text-sm text-slate-500 px-1">No sites found for "{query}"</p>
      )}
    </div>
  );
}

function SearchHostsPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; email: string; phone: string }>({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [rowMsg, setRowMsg] = useState<{ id: number; msg: string; kind: 'ok' | 'err' } | null>(null);
  const [sendingReset, setSendingReset] = useState<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = (q: string) => {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); return; }
    debounce.current = setTimeout(() => {
      setSearching(true);
      adminApi.users({ role: 'host', search: q, limit: '25' })
        .then(d => setResults(d.users || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
  };

  const loadAllHosts = () => {
    setSearching(true);
    adminApi.users({ role: 'host', limit: '25' })
      .then(d => setResults(d.users || []))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  };

  const openEdit = (u: User) => {
    if (editingId === u.id) { setEditingId(null); return; }
    setEditingId(u.id);
    setRowMsg(null);
    setEditForm({
      name: u.name || '',
      email: (u.email && !u.email.endsWith('@noemail.properplace.internal')) ? u.email : '',
      phone: u.phone || u.phone_number || '',
    });
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    setRowMsg(null);
    try {
      const payload: { name?: string; email?: string; phone?: string } = {};
      if (editForm.name.trim()) payload.name = editForm.name.trim();
      if (editForm.email.trim()) payload.email = editForm.email.trim();
      payload.phone = editForm.phone.trim() || undefined;
      const res = await adminApi.updateUser(id, payload);
      setResults(prev => prev.map(u => u.id === id ? { ...u, ...res.user } : u));
      setRowMsg({ id, msg: 'Saved', kind: 'ok' });
      setTimeout(() => setRowMsg(m => m && m.id === id ? null : m), 2500);
    } catch (err) {
      setRowMsg({ id, msg: err instanceof ApiError ? err.message : 'Failed to save', kind: 'err' });
    }
    setSaving(false);
  };

  const handleSendReset = async (id: number) => {
    if (!confirm('Send a password reset email to this host?')) return;
    setSendingReset(id);
    setRowMsg(null);
    try {
      const res = await adminApi.sendPasswordResetEmail(id);
      setRowMsg({ id, msg: res.message || `Reset email sent`, kind: 'ok' });
      setTimeout(() => setRowMsg(m => m && m.id === id ? null : m), 3500);
    } catch (err) {
      setRowMsg({ id, msg: err instanceof ApiError ? err.message : 'Failed to send email', kind: 'err' });
    }
    setSendingReset(null);
  };

  const inp = 'w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600';
  const lbl = 'block text-xs font-medium text-slate-400 mb-1';

  const isPlaceholderEmail = (e?: string) => !!e && e.endsWith('@noemail.properplace.internal');

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
        <input
          type="text"
          value={query}
          onChange={e => runSearch(e.target.value)}
          placeholder="Search hosts by name, email or username…"
          className={inp}
          autoFocus
        />
        <button
          type="button"
          onClick={loadAllHosts}
          className="text-xs text-emerald-400 hover:text-emerald-300 underline"
        >
          Show recent hosts →
        </button>
      </div>

      {searching && <p className="text-sm text-slate-500 px-1">Searching…</p>}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(u => {
            const placeholder = isPlaceholderEmail(u.email);
            return (
              <div key={u.id} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => openEdit(u)}
                  className="w-full flex items-start justify-between gap-4 p-4 hover:bg-slate-800/60 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{u.name || u.username || `User #${u.id}`}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {placeholder ? <span className="italic text-slate-500">no email on file</span> : u.email}
                      {(u.phone || u.phone_number) && <span className="text-slate-500"> · {u.phone || u.phone_number}</span>}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      @{u.username || '—'}
                      {u.verified ? <span className="text-emerald-500/80"> · verified</span> : <span className="text-amber-500/80"> · unverified</span>}
                      {typeof u.bookings_count === 'number' && u.bookings_count > 0 && <span className="text-slate-500"> · {u.bookings_count} bookings</span>}
                    </p>
                  </div>
                  <span className="text-xs text-slate-600 shrink-0 mt-1">{editingId === u.id ? '▲ Close' : '▼ Edit'}</span>
                </button>

                {editingId === u.id && (
                  <div className="border-t border-slate-700 p-5 space-y-4 bg-slate-950">
                    {rowMsg && rowMsg.id === u.id && (
                      <div className={`text-sm px-3 py-2 rounded-lg ${rowMsg.kind === 'ok' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
                        {rowMsg.msg}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><label className={lbl}>Name</label><input className={inp} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div className="col-span-2">
                        <label className={lbl}>Email {placeholder && <span className="text-amber-500/80">(placeholder — add a real address to enable password reset)</span>}</label>
                        <input type="email" className={inp} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="host@example.com" />
                      </div>
                      <div className="col-span-2"><label className={lbl}>Phone</label><input type="tel" className={inp} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+44…" /></div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleSave(u.id)}
                        disabled={saving}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
                      >
                        {saving ? 'Saving…' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendReset(u.id)}
                        disabled={sendingReset === u.id || placeholder}
                        title={placeholder ? 'Add a real email address first' : 'Send password reset link'}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-100 border border-slate-600 font-semibold py-2.5 rounded-xl text-sm"
                      >
                        {sendingReset === u.id ? 'Sending…' : '✉ Send Password Reset Email'}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600">The reset link expires in 1 hour and lets the host choose a new password.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!searching && query && results.length === 0 && (
        <p className="text-sm text-slate-500 px-1">No hosts found for &quot;{query}&quot;</p>
      )}
    </div>
  );
}
