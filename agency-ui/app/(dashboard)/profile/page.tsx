'use client';

import { useState, useEffect } from 'react';
import { CreditCard, User, Mail, Phone, RefreshCw, Calendar, Zap } from 'lucide-react';
import api from '@/lib/api';

type UserProfile = {
  id: string;
  email: string;
  mobileNumber: string;
  creditBalance: number;
  createdAt: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = () => {
    setLoading(true);
    api
      .get('/auth/me')
      .then((res) => setProfile(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

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
      <div className="border-b border-gray-800 px-8 py-5">
        <h1 className="text-white font-semibold text-base">Profile &amp; Credits</h1>
        <p className="text-gray-500 text-xs mt-0.5">Manage your account and credit balance</p>
      </div>

      <div className="px-8 py-8 max-w-3xl space-y-6">
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

          <TopUpButton />
        </div>

        {/* Account details card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold flex items-center gap-2 text-sm mb-6">
            <User size={16} className="text-blue-400" />
            Account Details
          </h2>

          <div className="space-y-5">
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
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2 text-gray-300 text-sm">
        <span className="text-gray-500">{icon}</span>
        <span>{value ?? '—'}</span>
      </div>
    </div>
  );
}

function TopUpButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const AMOUNTS = [500, 1000, 2500, 5000];
  const [selected, setSelected] = useState(1000);

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
        <p className="text-xs text-gray-500 mb-2">Select top-up amount (ZAR)</p>
        <div className="grid grid-cols-4 gap-2">
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
              R{amt.toLocaleString()}
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
            Top Up R{selected.toLocaleString()} via Paystack
          </>
        )}
      </button>

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      <p className="text-gray-700 text-xs text-center">Secure payment processing via Paystack</p>
    </div>
  );
}
