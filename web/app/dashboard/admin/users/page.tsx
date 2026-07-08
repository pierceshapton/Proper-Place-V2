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
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState('');

  // Create user
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', phone: '', role: 'host' });
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [createdResult, setCreatedResult] = useState<{ name: string; email: string; password: string | null; inviteSent: boolean } | null>(null);

  const handleCreateUser = async () => {
    if (!createForm.name.trim()) { setCreateErr('Name is required'); return; }
    setCreateErr('');
    setCreateBusy(true);
    try {
      const res = await adminApi.createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        role: createForm.role,
      });
      setCreatedResult({ name: res.user.name || createForm.name, email: res.user.email, password: res.otp_password, inviteSent: res.invite_sent });
      setCreateForm({ name: '', email: '', phone: '', role: 'host' });
      await load();
    } catch (err) {
      setCreateErr(err instanceof ApiError ? err.message : 'Failed to create user');
    } finally {
      setCreateBusy(false);
    }
  };

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

  const handleEditOpen = (user: User) => {
    setEditErr('');
    setEditForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
    setEditingUser(user);
  };

  const handleEditSave = async () => {
    if (!editingUser) return;
    setEditErr('');
    setEditBusy(true);
    try {
      await adminApi.updateUser(editingUser.id, {
        name: editForm.name.trim() || undefined,
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
      });
      setEditingUser(null);
      await load();
    } catch (err) {
      setEditErr(err instanceof ApiError ? err.message : 'Failed to save changes');
    } finally {
      setEditBusy(false);
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
    switch (r) { case 'admin': return 'bg-red-100 text-red-700'; case 'host': return 'bg-blue-100 text-blue-700'; case 'employee': return 'bg-violet-100 text-violet-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-blue"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">{users.length} total users</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreatedResult(null); setCreateErr(''); }}
          className="bg-light-blue hover:bg-accent-blue text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          + Create User
        </button>
      </div>

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
                <td className="py-3 px-4 text-sm text-gray-500">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleViewDetails(user)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-2 py-1"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEditOpen(user)}
                      className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg px-2 py-1"
                    >
                      Edit
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
                      <option value="employee">Employee</option>
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

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { if (!createBusy) { setShowCreate(false); setCreatedResult(null); } }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{createdResult ? 'User created' : 'Create new user'}</h2>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => { setShowCreate(false); setCreatedResult(null); }}>✕</button>
            </div>
            {createdResult ? (
              <div className="p-5 space-y-4">
                {createdResult.inviteSent ? (
                  <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                    <span className="text-emerald-500 text-xl leading-none mt-0.5">✉</span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Invitation email sent!</p>
                      <p className="text-xs text-emerald-700 mt-0.5">A link to set their password has been sent to <strong>{createdResult.email}</strong>. The link expires in 7 days.</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Account created successfully!</p>
                )}
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Name: </span><span className="font-medium text-gray-900">{createdResult.name}</span></div>
                  <div><span className="text-gray-500">Email: </span><span className="font-medium text-gray-900">{createdResult.email}</span></div>
                </div>
                {!createdResult.inviteSent && createdResult.password && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Temporary password - share with user</p>
                    <p className="font-mono text-lg font-bold text-amber-900 tracking-widest select-all">{createdResult.password}</p>
                    <p className="text-xs text-amber-600">The user will be prompted to change this on first login.</p>
                  </div>
                )}
                <div className="flex justify-end pt-1">
                  <button onClick={() => { setShowCreate(false); setCreatedResult(null); }} className="text-sm bg-light-blue hover:bg-accent-blue text-white rounded-lg px-4 py-2">Done</button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {createErr && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">{createErr}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-light-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-light-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+44 7700 000000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-light-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-light-blue"
                  >
                    <option value="user">User</option>
                    <option value="host">Host</option>
                    <option value="employee">Employee (CRM access, no admin tools)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button onClick={() => setShowCreate(false)} className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2">Cancel</button>
                  <button
                    onClick={handleCreateUser}
                    disabled={createBusy}
                    className="text-sm bg-light-blue hover:bg-accent-blue text-white rounded-lg px-4 py-2 disabled:opacity-50"
                  >
                    {createBusy ? 'Creating…' : 'Create user'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Edit user</h2>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setEditingUser(null)}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              {editErr && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">{editErr}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-light-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-light-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-light-blue"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditingUser(null)} className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2">Cancel</button>
                <button
                  onClick={handleEditSave}
                  disabled={editBusy}
                  className="text-sm bg-light-blue hover:bg-accent-blue text-white rounded-lg px-4 py-2 disabled:opacity-50"
                >
                  {editBusy ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedUser.name || 'User details'}</h2>
                <p className="text-sm text-gray-500">Joined {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '-'}</p>
              </div>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setSelectedUser(null)}>Close</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="text-gray-900 font-medium">{selectedUser.email || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="text-gray-900 font-medium">{selectedUser.phone || '-'}</p>
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
                        <p className="text-gray-600">{booking.check_in_date ? new Date(booking.check_in_date).toLocaleDateString() : '-'} to {booking.check_out_date ? new Date(booking.check_out_date).toLocaleDateString() : '-'}</p>
                        <p className="text-gray-500">Status: {booking.status || '-'}{booking.booking_ref ? ` • ${booking.booking_ref}` : ''}</p>
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
