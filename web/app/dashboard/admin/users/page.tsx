'use client';

import { useEffect, useState } from 'react';
import { adminApi, ApiError, type AdminUserBooking, type User } from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedBookings, setSelectedBookings] = useState<AdminUserBooking[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await adminApi.users();
      setUsers(data.users || data as unknown as User[]);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setActionErr('');
    try {
      await adminApi.updateUserRole(userId, newRole);
      load();
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : 'Failed to update role');
    }
  };

  const handleViewDetails = async (user: User) => {
    setActionErr('');
    setDetailsLoading(true);
    setSelectedUser(user);
    try {
      const data = await adminApi.userDetails(user.id);
      setSelectedUser(data.user);
      setSelectedBookings(data.bookings || []);
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : 'Failed to load user details');
      setSelectedBookings([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    const confirmed = window.confirm(`Delete ${user.name || user.email}? This action is permanent.`);
    if (!confirmed) return;
    setActionErr('');
    setActionBusyId(user.id);
    try {
      await adminApi.deleteUser(user.id);
      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
        setSelectedBookings([]);
      }
      await load();
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : 'Failed to delete user');
    } finally {
      setActionBusyId(null);
    }
  };

  const filtered = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const roleColor = (r: string) => {
    switch (r) { case 'admin': return 'bg-red-100 text-red-700'; case 'host': return 'bg-blue-100 text-blue-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
      <p className="text-gray-500">{users.length} total users</p>

      {actionErr && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{actionErr}</div>}

      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or email..." className="bg-white border-gray-300 text-gray-900 max-w-md"
      />

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-500">User</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-500">Email</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-500">Role</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-500">Bookings</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-500">Joined</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-light-blue text-white flex items-center justify-center text-sm font-bold">
                        {(user.name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                      {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColor(user.role)}`}>{user.role}</span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">{user.bookings_count ?? 0}</td>
                <td className="py-3 px-4 text-sm text-gray-500">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleViewDetails(user)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-2 py-1"
                    >
                      View
                    </button>
                    <a
                      href={`mailto:${user.email}`}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg px-2 py-1"
                    >
                      Contact
                    </a>
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-700"
                    >
                      <option value="user">User</option>
                      <option value="host">Host</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      disabled={actionBusyId === user.id}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded-lg px-2 py-1 disabled:opacity-50"
                    >
                      {actionBusyId === user.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No users match your search.</p>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedUser.name || 'User details'}</h2>
                <p className="text-sm text-gray-500">Joined {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '—'}</p>
              </div>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setSelectedUser(null)}>Close</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="text-gray-900 font-medium">{selectedUser.email || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="text-gray-900 font-medium">{selectedUser.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Role</p>
                  <p className="text-gray-900 font-medium">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total bookings</p>
                  <p className="text-gray-900 font-medium">{selectedBookings.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a href={`mailto:${selectedUser.email}`} className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg px-3 py-1.5">Email user</a>
                {selectedUser.phone && <a href={`tel:${selectedUser.phone}`} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-3 py-1.5">Call user</a>}
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Booking history</h3>
                {detailsLoading ? (
                  <p className="text-sm text-gray-500">Loading booking details…</p>
                ) : selectedBookings.length === 0 ? (
                  <p className="text-sm text-gray-500">No bookings found.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedBookings.map(booking => (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                        <p className="font-medium text-gray-900">{booking.place_name || 'Unknown place'}{booking.place_city ? `, ${booking.place_city}` : ''}</p>
                        <p className="text-gray-600">{booking.check_in_date ? new Date(booking.check_in_date).toLocaleDateString() : '—'} to {booking.check_out_date ? new Date(booking.check_out_date).toLocaleDateString() : '—'}</p>
                        <p className="text-gray-500">Status: {booking.status || '—'}{booking.booking_ref ? ` • ${booking.booking_ref}` : ''}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
