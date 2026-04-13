'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { usersApi, authApi, uploadApi, ApiError, type User } from '@/lib/api';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<'profile' | 'vehicle' | 'security'>('profile');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [profile, setProfile] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    phone_number: user?.phone_number || '',
  });

  const [vehicle, setVehicle] = useState({
    vehicle_registration: user?.vehicle_registration || '',
    vehicle_length: user?.vehicle_length?.toString() || '',
    vehicle_height: user?.vehicle_height?.toString() || '',
    vehicle_width: user?.vehicle_width?.toString() || '',
  });

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await usersApi.update(user.id, profile);
      await refreshUser();
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await usersApi.update(user.id, {
        vehicle_registration: vehicle.vehicle_registration,
        vehicle_length: vehicle.vehicle_length ? parseFloat(vehicle.vehicle_length) : undefined,
        vehicle_height: vehicle.vehicle_height ? parseFloat(vehicle.vehicle_height) : undefined,
        vehicle_width: vehicle.vehicle_width ? parseFloat(vehicle.vehicle_width) : undefined,
      });
      await refreshUser();
      setSuccess('Vehicle details updated!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update vehicle details');
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSaving(true); setError('');
    try {
      const data = await uploadApi.images([file]);
      if (data.images?.[0]?.url) {
        await usersApi.update(user.id, { avatar_url: data.images[0].url } as Partial<typeof user>);
        await refreshUser();
        setSuccess('Avatar updated!');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload avatar');
    }
    setSaving(false);
  };

  const handleResendVerification = async () => {
    try {
      await authApi.resendVerification();
      setSuccess('Verification email sent!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send verification email');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>

      {/* Email verification banner */}
      {user && !user.verified && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-800">Email not verified</p>
            <p className="text-xs text-yellow-600">Please verify your email to access all features</p>
          </div>
          <button onClick={handleResendVerification} className="text-sm text-yellow-700 hover:text-yellow-900 font-medium">Resend Email</button>
        </div>
      )}

      {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {(['profile', 'vehicle', 'security'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setSuccess(''); setError(''); }} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'profile' ? '👤 Profile' : t === 'vehicle' ? '🚐 Vehicle' : '🔒 Security'}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="card bg-white p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 bg-light-blue rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md cursor-pointer hover:bg-gray-50">
                <span className="text-xs">📷</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <p className="text-xs text-light-blue capitalize">{user?.role}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="bg-white border-gray-300 text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Tell others about yourself..." className="bg-white border-gray-300 text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="tel" value={profile.phone_number} onChange={e => setProfile(p => ({ ...p, phone_number: e.target.value }))} placeholder="+44..." className="bg-white border-gray-300 text-gray-900" />
            </div>
            <button type="submit" disabled={saving} className="btn-primary py-2 px-6 text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Profile'}</button>
          </form>
        </div>
      )}

      {/* Vehicle tab */}
      {tab === 'vehicle' && (
        <div className="card bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Details</h2>
          <p className="text-sm text-gray-500 mb-6">These details help hosts ensure your vehicle fits their space.</p>
          <form onSubmit={handleSaveVehicle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Plate</label>
              <input type="text" value={vehicle.vehicle_registration} onChange={e => setVehicle(v => ({ ...v, vehicle_registration: e.target.value.toUpperCase() }))} placeholder="AB21 XYZ" className="bg-white border-gray-300 text-gray-900 uppercase" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Length (ft)</label>
                <input type="number" step="0.1" value={vehicle.vehicle_length} onChange={e => setVehicle(v => ({ ...v, vehicle_length: e.target.value }))} placeholder="25" className="bg-white border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (ft)</label>
                <input type="number" step="0.1" value={vehicle.vehicle_height} onChange={e => setVehicle(v => ({ ...v, vehicle_height: e.target.value }))} placeholder="10" className="bg-white border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Width (ft)</label>
                <input type="number" step="0.1" value={vehicle.vehicle_width} onChange={e => setVehicle(v => ({ ...v, vehicle_width: e.target.value }))} placeholder="8" className="bg-white border-gray-300 text-gray-900" />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary py-2 px-6 text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Vehicle Details'}</button>
          </form>
        </div>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <div className="card bg-white p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!passwords.current) { setError('Current password is required'); return; }
              if (passwords.newPass !== passwords.confirm) { setError('Passwords do not match'); return; }
              if (passwords.newPass.length < 8) { setError('Password must be at least 8 characters'); return; }
              setSaving(true); setError(''); setSuccess('');
              try {
                await usersApi.changePassword({ currentPassword: passwords.current, newPassword: passwords.newPass });
                setSuccess('Password changed!');
                setPasswords({ current: '', newPass: '', confirm: '' });
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Failed to change password');
              }
              setSaving(false);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" className="bg-white border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" value={passwords.newPass} onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))} placeholder="Min 8 characters" className="bg-white border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" className="bg-white border-gray-300 text-gray-900" />
              </div>
              <button type="submit" disabled={saving} className="btn-primary py-2 px-6 text-sm disabled:opacity-50">{saving ? 'Updating...' : 'Update Password'}</button>
            </form>
          </div>

          <hr />

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Info</h2>
            <div className="text-sm space-y-2 text-gray-600">
              <p><span className="font-medium text-gray-700">Email:</span> {user?.email}</p>
              <p><span className="font-medium text-gray-700">Role:</span> <span className="capitalize">{user?.role}</span></p>
              <p><span className="font-medium text-gray-700">Member since:</span> {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : 'Unknown'}</p>
              <p><span className="font-medium text-gray-700">Email verified:</span> {user?.verified ? '✅ Yes' : '❌ No'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
