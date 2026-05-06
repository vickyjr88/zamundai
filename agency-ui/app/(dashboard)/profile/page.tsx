'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { CreditCard, User, Mail, Phone, RefreshCw, Calendar, Zap } from 'lucide-react';
import api from '@/lib/api';

type UserProfile = {
  id: string;
  name?: string;
  email: string;
  mobileNumber: string;
  creditBalance: number;
  createdAt: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');
  const [form, setForm] = useState({
    name: '',
    mobileNumber: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fetchProfile = () => {
    setLoading(true);
    api
      .get('/auth/me')
      .then((res) => {
        setProfile(res.data);
        setForm((prev) => ({
          ...prev,
          name: res.data.name || '',
          mobileNumber: res.data.mobileNumber || '',
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();

    const maybeVerifyPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      const reference = params.get('reference') || params.get('trxref');
      if (!reference) {
        return;
      }

      try {
        const res = await api.get(`/payments/verify/${reference}`);
        if (res.data?.success) {
          setPaymentNotice('Payment confirmed and credits updated.');
          fetchProfile();
        } else {
          setPaymentNotice('Payment verification is pending. Please refresh shortly.');
        }
      } catch {
        setPaymentNotice('Unable to verify payment automatically. Credits will update after webhook confirmation.');
      } finally {
        params.delete('reference');
        params.delete('trxref');
        const next = params.toString();
        window.history.replaceState(null, '', next ? `${window.location.pathname}?${next}` : window.location.pathname);
      }
    };

    void maybeVerifyPayment();
  }, []);

  const onCancelEdit = () => {
    setEditing(false);
    setProfileError('');
    setProfileSuccess('');
    setForm((prev) => ({
      ...prev,
      name: profile?.name || '',
      mobileNumber: profile?.mobileNumber || '',
    }));
  };

  const onSaveProfile = async () => {
    if (!profile) return;

    setProfileError('');
    setProfileSuccess('');

    if (!form.name.trim()) {
      setProfileError('Name is required.');
      return;
    }

    if (!form.mobileNumber.trim()) {
      setProfileError('Mobile number is required.');
      return;
    }

    setSaving(true);
    try {
      const payload: {
        name: string;
        mobileNumber: string;
      } = {
        name: form.name.trim(),
        mobileNumber: form.mobileNumber.trim(),
      };

      const res = await api.patch('/auth/me', payload);
      setProfile(res.data);
      setProfileSuccess('Profile updated successfully.');
      setEditing(false);
    } catch (err: any) {
      setProfileError(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }

    if (!passwordForm.newPassword) {
      setPasswordError('New password is required.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Password changed successfully.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Page header */}
      <div className="border-b border-gray-800 px-4 sm:px-6 md:px-8 py-4 md:py-5">
        <h1 className="text-white font-semibold text-base">Profile &amp; Credits</h1>
        <p className="text-gray-500 text-xs mt-0.5">Manage your account and credit balance</p>
      </div>

      <div className="px-4 sm:px-6 md:px-8 py-5 md:py-8 max-w-3xl space-y-6">
        {/* Credit balance card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-semibold flex items-center gap-2 text-sm">
              <Zap size={16} className="text-green-400" />
              Credit Balance
            </h2>
            <button
              onClick={fetchProfile}
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="Refresh balance"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="flex items-end gap-2 mb-1">
            <span className="text-5xl font-bold text-green-400">
              {profile ? Math.floor(Number(profile.creditBalance)) : '—'}
            </span>
            <span className="text-gray-500 text-sm mb-2">credits</span>
          </div>
          <p className="text-gray-600 text-xs mb-6">
            Each agent task costs approximately 1 credit per 100 tokens
          </p>

          {paymentNotice && (
            <div className="bg-green-900/30 border border-green-700/50 text-green-200 text-xs rounded-lg px-3 py-2 mb-4">
              {paymentNotice}
            </div>
          )}

          <TopUpButton />
        </div>

        {/* Account details card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-semibold flex items-center gap-2 text-sm">
              <User size={16} className="text-blue-400" />
              Account Details
            </h2>
            {!editing ? (
              <button
                onClick={() => {
                  setEditing(true);
                  setProfileError('');
                  setProfileSuccess('');
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Edit Profile
              </button>
            ) : null}
          </div>

          {profileError && (
            <div className="bg-red-900/40 border border-red-700/50 text-red-200 text-xs rounded-lg px-3 py-2 mb-4">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="bg-green-900/30 border border-green-700/50 text-green-200 text-xs rounded-lg px-3 py-2 mb-4">
              {profileSuccess}
            </div>
          )}

          <div className="space-y-5">
            {editing ? (
              <>
                <EditableField
                  icon={<User size={14} />}
                  label="Full Name"
                  value={form.name}
                  onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                  placeholder="Jane Doe"
                />

                <Field icon={<Mail size={14} />} label="Email" value={profile?.email} />

                <EditableField
                  icon={<Phone size={14} />}
                  label="Mobile Number"
                  value={form.mobileNumber}
                  onChange={(value) => setForm((prev) => ({ ...prev, mobileNumber: value }))}
                  placeholder="+254700000000"
                />

                <Field
                  icon={<Calendar size={14} />}
                  label="Member Since"
                  value={
                    profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString('en-ZA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : undefined
                  }
                />

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={onSaveProfile}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={onCancelEdit}
                    disabled={saving}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold px-4 py-2 rounded-lg border border-gray-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <Field icon={<User size={14} />} label="Full Name" value={profile?.name} />
                <Field icon={<Mail size={14} />} label="Email" value={profile?.email} />
                <Field icon={<Phone size={14} />} label="Mobile Number" value={profile?.mobileNumber} />
                <Field
                  icon={<Calendar size={14} />}
                  label="Member Since"
                  value={
                    profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString('en-ZA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : undefined
                  }
                />
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold flex items-center gap-2 text-sm mb-6">
            <User size={16} className="text-orange-400" />
            Change Password
          </h2>

          {passwordError && (
            <div className="bg-red-900/40 border border-red-700/50 text-red-200 text-xs rounded-lg px-3 py-2 mb-4">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="bg-green-900/30 border border-green-700/50 text-green-200 text-xs rounded-lg px-3 py-2 mb-4">
              {passwordSuccess}
            </div>
          )}

          <div className="space-y-5">
            <EditableField
              icon={<User size={14} />}
              label="Current Password"
              value={passwordForm.currentPassword}
              onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
              placeholder="Enter current password"
              type="password"
            />

            <EditableField
              icon={<User size={14} />}
              label="New Password"
              value={passwordForm.newPassword}
              onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
              placeholder="At least 6 characters"
              type="password"
            />

            <EditableField
              icon={<User size={14} />}
              label="Confirm New Password"
              value={passwordForm.confirmPassword}
              onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
              placeholder="Confirm new password"
              type="password"
            />

            <div className="pt-2">
              <button
                onClick={onChangePassword}
                disabled={passwordSaving}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2 text-gray-300 text-sm">
        <span className="text-gray-500">{icon}</span>
        <span className="break-all">{value ?? '—'}</span>
      </div>
    </div>
  );
}

function EditableField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
}) {
  return (
    <div>
      <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2 text-gray-300 text-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <span className="text-gray-500">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-gray-100 placeholder:text-gray-500"
        />
      </div>
    </div>
  );
}

function TopUpButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const AMOUNTS = [10000, 25000, 50000, 100000];
  const [selected, setSelected] = useState(25000);

  const handleTopUp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/payments/initiate', { amount: selected });
      if (res.data?.authorization_url) {
        window.location.href = res.data.authorization_url;
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Amount selector */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Select top-up amount (KES)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => setSelected(amt)}
              className={`py-2 rounded-xl text-sm font-semibold transition-colors border ${
                selected === amt
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              KES {(amt / 100).toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleTopUp}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
      >
        {loading ? (
          <>
            <RefreshCw size={15} className="animate-spin" />
            Redirecting to Paystack…
          </>
        ) : (
          <>
            <CreditCard size={15} />
            Top Up KES {(selected / 100).toLocaleString()} via Paystack
          </>
        )}
      </button>

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      <p className="text-gray-700 text-xs text-center">Secure payment processing via Paystack</p>
    </div>
  );
}
