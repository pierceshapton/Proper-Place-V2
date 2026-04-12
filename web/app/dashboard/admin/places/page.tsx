'use client';

import { useEffect, useState } from 'react';
import { adminApi, ApiError, type Place } from '@/lib/api';

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionErr, setActionErr] = useState('');

  const load = async () => {
    try {
      const data = await adminApi.places();
      setPlaces(data.places || data as unknown as Place[]);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: number) => {
    setActionErr('');
    try { await adminApi.approvePlace(id); load(); } catch (err) { setActionErr(err instanceof ApiError ? err.message : 'Failed'); }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Rejection reason:');
    if (reason === null) return;
    setActionErr('');
    try { await adminApi.rejectPlace(id, reason); load(); } catch (err) { setActionErr(err instanceof ApiError ? err.message : 'Failed'); }
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
          {filtered.map(place => (
            <div key={place.id} className="card bg-white p-5">
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
                  {place.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{place.description}</p>}
                  {place.rejection_reason && <p className="text-sm text-red-500 mt-2">Rejection reason: {place.rejection_reason}</p>}
                  {place.amenities && place.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {place.amenities.map(a => <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {place.approval_status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(place.id)} className="btn-primary text-sm py-1.5 px-4">Approve</button>
                      <button onClick={() => handleReject(place.id)} className="bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm py-1.5 px-4 font-medium transition-colors">Reject</button>
                    </>
                  )}
                  {place.approval_status === 'rejected' && (
                    <button onClick={() => handleApprove(place.id)} className="btn-primary text-sm py-1.5 px-4">Approve</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
