'use client';

import { useEffect, useState } from 'react';
import { adminApi, type HostApplication } from '@/lib/api';
import ReasonModal from '@/components/ReasonModal';

export default function HostApplicationsPage() {
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [approvingApp, setApprovingApp] = useState<HostApplication | null>(null);
  const [rejectingApp, setRejectingApp] = useState<HostApplication | null>(null);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const res = await adminApi.hostApplications(filter === 'all' ? undefined : filter);
      setApplications(res.applications || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadApplications(); }, [filter]);

  const handleApprove = async (app: HostApplication, notes: string) => {
    setActionLoading(app.id);
    try {
      await adminApi.approveHostApplication(app.id, notes);
      setApprovingApp(null);
      loadApplications();
    } catch (e) {
      alert('Error approving: ' + e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (app: HostApplication, notes: string) => {
    setActionLoading(app.id);
    try {
      await adminApi.rejectHostApplication(app.id, notes);
      setRejectingApp(null);
      loadApplications();
    } catch (e) {
      alert('Error rejecting: ' + e);
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const filters = ['pending', 'approved', 'rejected', 'all'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Host Applications</h1>
        <p className="text-gray-500 mt-1">Review and manage applications from users wanting to become hosts.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-light-blue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-light-blue"></div>
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>No {filter} applications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => (
            <div key={app.id} className="card bg-white p-5 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{app.contact_name}</h3>
                  <p className="text-sm text-gray-500">Applied: {new Date(app.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor(app.status)}`}>
                  {app.status}
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <span>📧</span> {app.email}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span>📞</span> {app.phone}
                </div>
                {app.business_type && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>🏢</span> {app.business_type}
                  </div>
                )}
                {app.van_spaces && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>🚐</span> {app.van_spaces} van space(s)
                  </div>
                )}
                {app.address && (
                  <div className="flex items-center gap-2 text-gray-600 md:col-span-2">
                    <span>📍</span> {app.address}
                  </div>
                )}
                {app.referral_code && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>🎁</span> Referral: {app.referral_code}
                  </div>
                )}
              </div>

              {/* Description */}
              {app.business_description && (
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{app.business_description}</p>
              )}

              {/* Admin notes */}
              {app.admin_notes && (
                <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg border border-gray-200">
                  Admin notes: {app.admin_notes}
                </p>
              )}

              {/* Actions */}
              {app.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setRejectingApp(app)}
                    disabled={actionLoading === app.id}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setApprovingApp(app)}
                    disabled={actionLoading === app.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === app.id ? 'Processing...' : 'Approve'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {approvingApp && (
        <ReasonModal
          title={`Approve ${approvingApp.contact_name}'s Application`}
          description="This will upgrade their account to host role. Add optional admin notes."
          placeholder="Optional admin notes..."
          confirmLabel="Approve"
          confirmColor="bg-green-600 hover:bg-green-700"
          onConfirm={(notes) => handleApprove(approvingApp, notes)}
          onCancel={() => setApprovingApp(null)}
        />
      )}
      {rejectingApp && (
        <ReasonModal
          title={`Reject ${rejectingApp.contact_name}'s Application`}
          description="Provide a reason for rejection."
          placeholder="Rejection reason..."
          confirmLabel="Reject"
          required
          onConfirm={(notes) => handleReject(rejectingApp, notes)}
          onCancel={() => setRejectingApp(null)}
        />
      )}
    </div>
  );
}
