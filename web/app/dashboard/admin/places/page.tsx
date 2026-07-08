'use client';

import { Fragment, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminApi, placesApi, ApiError, type Place } from '@/lib/api';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMaps';
import ReasonModal from '@/components/ReasonModal';



type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'draft';

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [rowNotice, setRowNotice] = useState<{ id: number; msg: string; kind: 'ok' | 'err' } | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isLoaded } = useJsApiLoader({ id: GOOGLE_MAPS_LOADER_ID, googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });

  const load = useCallback(async (opts?: { status?: StatusFilter; search?: string }) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '100' };
      const s = opts?.status ?? filter;
      const q = opts?.search ?? search;
      if (s && s !== 'all') params.status = s;
      else params.status = 'all';
      if (q.trim()) params.search = q.trim();
      const data = await adminApi.places(params);
      setPlaces(data.places || (data as unknown as Place[]));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    load({ status: 'all', search: '' });
    placesApi.list({}).then(d => {
      const p = (d as { places?: Place[] }).places || (d as unknown as Place[]);
      setAllPlaces(Array.isArray(p) ? p : []);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeFilter = (f: StatusFilter) => {
    setFilter(f);
    load({ status: f, search });
  };

  const onSearchChange = (v: string) => {
    setSearch(v);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => load({ status: filter, search: v }), 300);
  };

  const handleApprove = async (id: number) => {
    setActionErr('');
    try {
      await adminApi.approvePlace(id);
      setRowNotice({ id, msg: 'Approved', kind: 'ok' });
      setTimeout(() => setRowNotice(n => n && n.id === id ? null : n), 2500);
      load();
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : 'Failed');
    }
  };

  const handleReject = async (id: number, reason: string) => {
    setActionErr('');
    try {
      await adminApi.rejectPlace(id, reason);
      setRejectingId(null);
      load();
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : 'Failed');
    }
  };

  const handleToggleVisibility = async (place: Place) => {
    const currentlyHidden = place.status === 'unavailable';
    const nextHidden = !currentlyHidden;
    const label = nextHidden ? 'hide this site from the public map' : 'restore this site to the public map';
    if (!confirm(`Are you sure you want to ${label}?`)) return;
    setTogglingId(place.id);
    setRowNotice(null);
    try {
      const res = await adminApi.setPlaceVisibility(place.id, nextHidden);
      setPlaces(prev => prev.map(p => p.id === place.id ? { ...p, status: res.place.status } : p));
      setAllPlaces(prev => prev.map(p => p.id === place.id ? { ...p, status: res.place.status } : p));
      setRowNotice({ id: place.id, msg: nextHidden ? 'Hidden from map' : 'Back on map', kind: 'ok' });
      setTimeout(() => setRowNotice(n => n && n.id === place.id ? null : n), 2500);
    } catch (err) {
      setRowNotice({ id: place.id, msg: err instanceof ApiError ? err.message : 'Failed to toggle', kind: 'err' });
    }
    setTogglingId(null);
  };

  const counts = useMemo(() => ({
    all: places.length,
    pending: places.filter(p => p.approval_status === 'pending').length,
    approved: places.filter(p => p.approval_status === 'approved').length,
    rejected: places.filter(p => p.approval_status === 'rejected').length,
    draft: places.filter(p => p.approval_status === 'draft').length,
  }), [places]);

  const tabs: StatusFilter[] = ['all', 'pending', 'approved', 'rejected', 'draft'];

  const statusChip = (s?: string) => {
    switch (s) {
      case 'approved': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'draft': return 'bg-slate-100 text-slate-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
          <p className="text-sm text-gray-500 mt-1">All submitted sites across every pipeline stage. Approve, edit, or temporarily hide from the public map.</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search site name, address, host name, email…"
          className="w-full sm:w-80 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-light-blue/40"
        />
      </div>

      {actionErr && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{actionErr}</div>}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => changeFilter(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === t ? 'bg-light-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className="ml-1">({counts[t]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-light-blue" /></div>
      ) : places.length === 0 ? (
        <div className="text-center py-16 card bg-white">
          <p className="text-4xl mb-3">📍</p>
          <p className="text-gray-500">No sites match this filter{search ? ` for "${search}"` : ''}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Site</th>
                  <th className="px-4 py-3 font-medium">Host</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Approval</th>
                  <th className="px-4 py-3 font-medium">Map</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {places.map(place => {
                  const isExpanded = expandedId === place.id;
                  const hidden = place.status === 'unavailable';
                  const notice = rowNotice && rowNotice.id === place.id ? rowNotice : null;
                  return (
                    <Fragment key={place.id}>
                      <tr className={isExpanded ? 'bg-blue-50/40' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {place.image_urls?.[0] ? (
                              <img src={place.image_urls[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">·</div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate max-w-[220px]">{place.name}</p>
                              <p className="text-xs text-gray-400">#{place.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-800 truncate max-w-[160px]">{place.owner_name || `User #${place.owner_id}`}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[180px]">{place.owner_email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <p className="truncate max-w-[220px]">{[place.address, place.city].filter(Boolean).join(', ') || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{place.place_type?.replace(/_/g, ' ') || '-'}</td>
                        <td className="px-4 py-3 text-gray-800 whitespace-nowrap">£{Number(place.price_per_night || 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusChip(place.approval_status)}`}>
                            {place.approval_status || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility(place)}
                            disabled={togglingId === place.id}
                            title={hidden ? 'Currently hidden from the public map - click to restore' : 'Currently visible on the public map - click to hide'}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                              hidden
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            } disabled:opacity-50`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${hidden ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            {togglingId === place.id ? '…' : hidden ? 'Hidden' : 'Live'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5 flex-wrap">
                            {place.approval_status === 'pending' && (
                              <>
                                <button onClick={() => handleApprove(place.id)} className="btn-primary text-xs py-1 px-3">Approve</button>
                                <button onClick={() => setRejectingId(place.id)} className="bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs py-1 px-3 font-medium">Reject</button>
                              </>
                            )}
                            {place.approval_status === 'rejected' && (
                              <button onClick={() => handleApprove(place.id)} className="btn-primary text-xs py-1 px-3">Approve</button>
                            )}
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : place.id)}
                              className="text-light-blue hover:text-accent-blue text-xs font-medium py-1 px-2"
                            >
                              {isExpanded ? 'Hide' : 'View'}
                            </button>
                            <Link
                              href={`/crm/hosts?edit_place=${place.id}`}
                              className="text-emerald-600 hover:text-emerald-700 text-xs font-medium py-1 px-2"
                              title="Open the full editor in Host Onboarding"
                            >
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                      {notice && (
                        <tr>
                          <td colSpan={8} className={`px-4 py-1.5 text-xs ${notice.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {notice.msg}
                          </td>
                        </tr>
                      )}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0 bg-white border-t border-gray-100">
                            <PlaceDetails
                              place={place}
                              allPlaces={allPlaces}
                              isLoaded={isLoaded}
                              onSaved={(updated) => {
                                setPlaces(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
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

/* ── Expanded detail + quick-edit panel ─────────────────────────── */
function PlaceDetails({
  place,
  allPlaces,
  isLoaded,
  onSaved,
}: {
  place: Place;
  allPlaces: Place[];
  isLoaded: boolean;
  onSaved: (p: Partial<Place> & { id: number }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [form, setForm] = useState({
    name: place.name || '',
    description: place.description || '',
    price_per_night: place.price_per_night?.toString() || '',
    capacity: place.capacity?.toString() || '',
    address: place.address || '',
    city: place.city || '',
    postal_code: place.postal_code || '',
    approval_status: place.approval_status || 'pending',
  });

  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const images = place.image_urls || [];

  const onMapLoad = useCallback((map: google.maps.Map) => {
    if (!place.latitude || !place.longitude) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: Number(place.latitude), lng: Number(place.longitude) });
    allPlaces.forEach(p => {
      if (p.latitude && p.longitude) bounds.extend({ lat: Number(p.latitude), lng: Number(p.longitude) });
    });
    map.fitBounds(bounds, 60);
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

  const handleSave = async () => {
    setSaving(true);
    setSaveErr('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description || null,
        price_per_night: form.price_per_night ? parseFloat(form.price_per_night) : null,
        capacity: form.capacity ? parseInt(form.capacity, 10) : null,
        address: form.address || null,
        city: form.city || null,
        postal_code: form.postal_code || null,
      };
      const newStatus = form.approval_status;
      if (newStatus !== place.approval_status) {
        if (newStatus === 'approved') await adminApi.approvePlace(place.id);
        else if (newStatus === 'rejected') await adminApi.rejectPlace(place.id, 'Rejected via Sites table');
      }
      await placesApi.update(place.id, payload as unknown as Partial<Place>);
      onSaved({
        id: place.id,
        name: form.name.trim(),
        price_per_night: payload.price_per_night as number,
        capacity: payload.capacity as number,
        address: form.address,
        city: form.city,
        postal_code: form.postal_code,
        description: form.description,
        approval_status: newStatus,
      });
      setEditing(false);
    } catch (err) {
      setSaveErr(err instanceof ApiError ? err.message : 'Failed to save');
    }
    setSaving(false);
  };

  const inp = 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-light-blue/40';
  const lbl = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="border-t border-gray-100">
      {/* Quick-edit bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Quick edit for essentials.</span>
          <Link
            href={`/crm/hosts?edit_place=${place.id}`}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Full editor →
          </Link>
          <a
            href={`/place/${place.id}`}
            target="_blank"
            rel="noreferrer"
            className="text-light-blue hover:text-accent-blue font-medium"
          >
            View live listing ↗
          </a>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-primary text-sm py-1.5 px-4">Edit details</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setSaveErr(''); }} className="text-sm py-1.5 px-4 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        )}
      </div>

      {editing && (
        <div className="p-5 border-b border-gray-100 bg-white space-y-3">
          {saveErr && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{saveErr}</div>}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><label className={lbl}>Name</label><input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="md:col-span-2"><label className={lbl}>Description</label><textarea className={inp} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><label className={lbl}>Price / night (£)</label><input type="number" min="0" step="0.50" className={inp} value={form.price_per_night} onChange={e => setForm(f => ({ ...f, price_per_night: e.target.value }))} /></div>
            <div><label className={lbl}>Capacity (vans)</label><input type="number" min="1" className={inp} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
            <div className="md:col-span-2"><label className={lbl}>Address</label><input className={inp} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><label className={lbl}>City</label><input className={inp} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><label className={lbl}>Postal code</label><input className={inp} value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} /></div>
            <div>
              <label className={lbl}>Approval status</label>
              <select className={inp} value={form.approval_status} onChange={e => setForm(f => ({ ...f, approval_status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved (live)</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      )}

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

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light z-10" onClick={() => setLightbox(false)}>✕</button>
          <img src={images[imgIdx]} alt={place.name} className="max-w-[90vw] max-h-[90vh] object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-0 md:gap-px bg-gray-100">
        <div className="bg-white p-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Basic Information</h4>
            {detail('Name', place.name)}
            {detail('Place Type', place.place_type?.replace(/_/g, ' '))}
            {detail('Price per Night', `£${Number(place.price_per_night).toFixed(2)}`)}
            {detail('Capacity', place.capacity ? `${place.capacity} vehicles` : null)}
            {detail('Approval Status', place.approval_status)}
            {detail('Map Visibility', place.status === 'unavailable' ? 'Hidden from map' : 'Live on map')}
            {detail('Featured', place.featured)}
            {detail('Created', place.created_at ? new Date(place.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null)}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Location</h4>
            {detail('Address', place.address)}
            {detail('City', place.city)}
            {detail('Country', place.country)}
            {detail('Postal Code', place.postal_code)}
            {detail('Coordinates', place.latitude && place.longitude ? `${Number(place.latitude).toFixed(5)}, ${Number(place.longitude).toFixed(5)}` : null)}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Host</h4>
            {detail('Host Name', place.owner_name || place.host?.name)}
            {detail('Owner ID', place.owner_id)}
            {detail('Host Email', place.owner_email)}
            {detail('Contract Signed', place.host_contract_accepted_at ? `Yes (v${place.host_contract_version || '?'} - ${new Date(place.host_contract_accepted_at).toLocaleDateString('en-GB')})` : 'NO')}
          </div>

          {place.description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Description</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{place.description}</p>
            </div>
          )}
        </div>

        <div className="bg-white p-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Vehicle Size Limits</h4>
            {detail('Max Length', place.max_vehicle_length_ft ? `${place.max_vehicle_length_ft} ft` : null)}
            {detail('Max Height', place.max_vehicle_height_ft ? `${place.max_vehicle_height_ft} ft` : null)}
            {detail('Max Width', place.max_vehicle_width_ft ? `${place.max_vehicle_width_ft} ft` : null)}
            {!place.max_vehicle_length_ft && !place.max_vehicle_height_ft && !place.max_vehicle_width_ft && (
              <p className="text-sm text-gray-400 italic">No vehicle size limits specified</p>
            )}
          </div>

          {place.opening_hours && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Opening Hours</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{place.opening_hours}</p>
            </div>
          )}

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

          {place.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</h4>
              <p className="text-sm text-red-600">{place.rejection_reason}</p>
            </div>
          )}
        </div>
      </div>

      {isLoaded && place.latitude && place.longitude && (
        <div className="border-t border-gray-100 p-5">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Location Map</h4>
          <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 320 }}>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={{ lat: Number(place.latitude), lng: Number(place.longitude) }}
              zoom={12}
              onLoad={onMapLoad}
              options={{ mapTypeControl: true, streetViewControl: false, fullscreenControl: true }}
            >
              <Marker
                position={{ lat: Number(place.latitude), lng: Number(place.longitude) }}
                icon={{
                  url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="#DC2626"/><circle cx="16" cy="16" r="8" fill="white"/></svg>'),
                  scaledSize: new google.maps.Size(32, 42),
                }}
                title={`${place.name} (this place)`}
                zIndex={100}
              />
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
        </div>
      )}
    </div>
  );
}
