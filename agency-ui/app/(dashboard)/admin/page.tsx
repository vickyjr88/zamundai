'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CreditCard, Loader2, Shield, UserCog, Wallet } from 'lucide-react';
import api from '@/lib/api';

type OverviewResponse = {
  totals: {
    users: number;
    admins: number;
    jobs: number;
    jobsInFlight: number;
    payments: number;
    successfulPayments: number;
    spendEvents: number;
    chatMessages: number;
  };
  finance: {
    topupKes: number;
    openclawCostUsd: number;
    openclawCostKes: number;
    billedKes: number;
    creditsCharged: number;
    creditsLiability: number;
    grossMarginKes: number;
  };
};

type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

type AdminUser = {
  id: string;
  name?: string;
  email: string;
  mobileNumber: string;
  creditBalance: number;
  isAdmin: boolean;
  createdAt: string;
};

type AdminJob = {
  id: string;
  status: string;
  tokensUsed: number;
  costInUsd: number;
  billedCostKes: number;
  creditsCharged: number;
  billingMode: string | null;
  createdAt: string;
  user?: { id: string; email: string };
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [users, setUsers] = useState<Paginated<AdminUser> | null>(null);
  const [jobs, setJobs] = useState<Paginated<AdminJob> | null>(null);
  const [error, setError] = useState('');
  const [deltaInput, setDeltaInput] = useState<Record<string, string>>({});

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const me = await api.get('/auth/me');
      if (!me.data?.isAdmin) {
        setAuthorized(false);
        return;
      }

      setAuthorized(true);

      const [overviewRes, usersRes, jobsRes] = await Promise.all([
        api.get<OverviewResponse>('/admin/overview'),
        api.get<Paginated<AdminUser>>('/admin/users?page=1&limit=12'),
        api.get<Paginated<AdminJob>>('/admin/jobs?page=1&limit=12'),
      ]);

      setOverview(overviewRes.data);
      setUsers(usersRes.data);
      setJobs(jobsRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const metrics = useMemo(() => {
    if (!overview) return [];
    return [
      {
        label: 'Total Users',
        value: overview.totals.users.toLocaleString(),
        icon: UserCog,
      },
      {
        label: 'Jobs In Flight',
        value: overview.totals.jobsInFlight.toLocaleString(),
        icon: Loader2,
      },
      {
        label: 'Billed (KES)',
        value: overview.finance.billedKes.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        icon: Wallet,
      },
      {
        label: 'Gross Margin (KES)',
        value: overview.finance.grossMarginKes.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        icon: BarChart3,
      },
    ];
  }, [overview]);

  const onAdjustCredits = async (userId: string) => {
    const raw = deltaInput[userId];
    const delta = Number(raw);
    if (!Number.isFinite(delta) || delta === 0) {
      alert('Enter a non-zero number for credit adjustment');
      return;
    }

    try {
      await api.patch('/admin/users/credits', { userId, delta });
      await loadAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to adjust credits');
    }
  };

  const onToggleAdmin = async (user: AdminUser) => {
    try {
      await api.patch('/admin/users/admin', { userId: user.id, isAdmin: !user.isAdmin });
      await loadAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update admin role');
    }
  };

  if (authorized === false) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-red-300">
        You do not have access to this area.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-gray-800 px-4 sm:px-6 md:px-8 py-4 md:py-5">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-cyan-400" />
          <h1 className="text-white font-semibold text-base">Super Dashboard</h1>
        </div>
        <p className="text-gray-500 text-xs mt-0.5">Operations analytics and entity management</p>
      </div>

      <div className="px-4 sm:px-6 md:px-8 py-5 md:py-8 space-y-6">
        {error && <div className="text-red-300 text-sm bg-red-900/40 border border-red-700/50 rounded-lg px-3 py-2">{error}</div>}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-xs">{metric.label}</p>
                <metric.icon size={14} className="text-cyan-400" />
              </div>
              <p className="text-white text-lg md:text-2xl font-semibold mt-2">{metric.value}</p>
            </div>
          ))}
        </div>

        {overview && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              <CreditCard size={15} className="text-green-400" />
              Billing Snapshot
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <Stat label="Topups (KES)" value={overview.finance.topupKes} />
              <Stat label="OpenClaw Cost (USD)" value={overview.finance.openclawCostUsd} />
              <Stat label="OpenClaw Cost (KES)" value={overview.finance.openclawCostKes} />
              <Stat label="Billed (KES)" value={overview.finance.billedKes} />
              <Stat label="Credits Charged" value={overview.finance.creditsCharged} />
              <Stat label="Credits Liability" value={overview.finance.creditsLiability} />
            </div>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 overflow-x-auto">
          <h2 className="text-white text-sm font-semibold mb-4">Users</h2>
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-2 pr-3">Email</th>
                <th className="text-left py-2 pr-3">Phone</th>
                <th className="text-left py-2 pr-3">Credits</th>
                <th className="text-left py-2 pr-3">Admin</th>
                <th className="text-left py-2">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {users?.items.map((u) => (
                <tr key={u.id} className="border-b border-gray-800/60 text-gray-200">
                  <td className="py-2 pr-3">{u.email}</td>
                  <td className="py-2 pr-3">{u.mobileNumber}</td>
                  <td className="py-2 pr-3">{Number(u.creditBalance).toFixed(2)}</td>
                  <td className="py-2 pr-3">
                    <button
                      onClick={() => onToggleAdmin(u)}
                      className={`px-2 py-1 rounded-md border ${u.isAdmin ? 'border-cyan-500 text-cyan-300' : 'border-gray-700 text-gray-400'}`}
                    >
                      {u.isAdmin ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={deltaInput[u.id] ?? ''}
                        onChange={(e) => setDeltaInput((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        placeholder="+10 / -5"
                        className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-100"
                      />
                      <button
                        onClick={() => onAdjustCredits(u.id)}
                        className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        Apply
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 overflow-x-auto">
          <h2 className="text-white text-sm font-semibold mb-4">Recent Jobs</h2>
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-2 pr-3">Created</th>
                <th className="text-left py-2 pr-3">User</th>
                <th className="text-left py-2 pr-3">Status</th>
                <th className="text-left py-2 pr-3">USD Cost</th>
                <th className="text-left py-2 pr-3">Billed KES</th>
                <th className="text-left py-2">Mode</th>
              </tr>
            </thead>
            <tbody>
              {jobs?.items.map((j) => (
                <tr key={j.id} className="border-b border-gray-800/60 text-gray-200">
                  <td className="py-2 pr-3">{new Date(j.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-3">{j.user?.email ?? '-'}</td>
                  <td className="py-2 pr-3">{j.status}</td>
                  <td className="py-2 pr-3">{Number(j.costInUsd).toFixed(6)}</td>
                  <td className="py-2 pr-3">{Number(j.billedCostKes || 0).toFixed(2)}</td>
                  <td className="py-2">{j.billingMode ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <Loader2 size={15} className="animate-spin" />
            Loading admin data...
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2">
      <p className="text-gray-500">{label}</p>
      <p className="text-gray-100 font-semibold mt-1">{Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
    </div>
  );
}
