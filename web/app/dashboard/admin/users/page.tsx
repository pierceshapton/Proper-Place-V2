'use client';

import { useEffect, useState } from 'react';
import { adminApi, ApiError, type User } from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionErr, setActionErr] = useState('');

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
                <td className="py-3 px-4 text-sm text-gray-500">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                <td className="py-3 px-4">
                  <select
                    value={user.role}
                    onChange={e => handleRoleChange(user.id, e.target.value)}
                    className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-700"
                  >
                    <option value="user">User</option>
                    <option value="host">Host</option>
                    <option value="admin">Admin</option>
                  </select>
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
    </div>
  );
}
