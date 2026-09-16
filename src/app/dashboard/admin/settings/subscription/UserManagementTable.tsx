// src/app/dashboard/admin/subscriptions/UserManagementTable.tsx
'use client';

import { useState } from 'react';
import { updateParticularUserAction } from './actions';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  subStatus: string;
  planType: string;
  subEndsAt: string | Date | null;
  trialEndsAt: string | Date | null;
  customMonthlyPrice?: number | null;
  customHalfYearlyPrice?: number | null;
  customAnnualPrice?: number | null;
  customLifetimePrice?: number | null;
  userSpecificOfferTitle?: string | null;
  userSpecificDiscountPct?: number | null;
  transactions: {
    id: string;
    amount: number;
    planType: string;
    paymentMethod: string;
    trxId: string;
    status: string;
    createdAt: string | Date;
  }[];
}

export default function UserManagementTable({ initialUsers }: { initialUsers: UserItem[] }) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Modal form states
  const [subStatus, setSubStatus] = useState<'TRIAL' | 'ACTIVE' | 'EXPIRED'>('ACTIVE');
  const [planType, setPlanType] = useState<'MONTHLY' | 'HALF_YEARLY' | 'ANNUAL' | 'LIFETIME' | 'CUSTOM'>('MONTHLY');
  const [isLifetimeFree, setIsLifetimeFree] = useState(false);
  const [trialDaysOverride, setTrialDaysOverride] = useState<number | null>(null);
  const [monthsToAdd, setMonthsToAdd] = useState<number>(1);
  const [customMonthlyPrice, setCustomMonthlyPrice] = useState<number | null>(null);
  const [customHalfYearlyPrice, setCustomHalfYearlyPrice] = useState<number | null>(null);
  const [customAnnualPrice, setCustomAnnualPrice] = useState<number | null>(null);
  const [customLifetimePrice, setCustomLifetimePrice] = useState<number | null>(null);
  const [userSpecificOfferTitle, setUserSpecificOfferTitle] = useState<string>('');
  const [userSpecificDiscountPct, setUserSpecificDiscountPct] = useState<number | null>(null);

  const openModal = (user: UserItem) => {
    setSelectedUser(user);
    setSubStatus((user.subStatus as any) || 'ACTIVE');
    setPlanType((user.planType as any) || 'MONTHLY');
    setIsLifetimeFree(user.planType === 'LIFETIME');
    setCustomMonthlyPrice(user.customMonthlyPrice ?? null);
    setCustomHalfYearlyPrice(user.customHalfYearlyPrice ?? null);
    setCustomAnnualPrice(user.customAnnualPrice ?? null);
    setCustomLifetimePrice(user.customLifetimePrice ?? null);
    setUserSpecificOfferTitle(user.userSpecificOfferTitle ?? '');
    setUserSpecificDiscountPct(user.userSpecificDiscountPct ?? null);
  };

  const handleAdvancedUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    setMessage('');

    const res = await updateParticularUserAction(
      selectedUser.id,
      subStatus,
      planType,
      isLifetimeFree,
      trialDaysOverride,
      customMonthlyPrice,
      customHalfYearlyPrice,
      customAnnualPrice,
      customLifetimePrice,
      userSpecificOfferTitle,
      userSpecificDiscountPct,
      monthsToAdd
    );

    if (res.success) {
      setMessage(`Successfully updated subscription for ${selectedUser.name}!`);

      // Calculate new expiry date locally for instant UI update
      let newExpiry: Date | null = null;
      if (!isLifetimeFree && planType !== 'LIFETIME' && subStatus !== 'EXPIRED') {
        newExpiry = new Date();
        newExpiry.setMonth(newExpiry.getMonth() + monthsToAdd);
      } else if (subStatus === 'EXPIRED') {
        newExpiry = new Date();
      }

      setUsers(
        users.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                subStatus,
                planType: isLifetimeFree ? 'LIFETIME' : planType,
                subEndsAt: isLifetimeFree ? null : newExpiry,
                customMonthlyPrice,
                customHalfYearlyPrice,
                customAnnualPrice,
                customLifetimePrice,
                userSpecificOfferTitle,
                userSpecificDiscountPct,
              }
            : u
        )
      );
      setSelectedUser(null);
    } else {
      setMessage('Failed to update user subscription settings.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-xl bg-emerald-950/70 border border-emerald-500/50 p-3.5 text-xs text-emerald-200">
          {message}
        </div>
      )}

      <div className="rounded-2xl bg-[#1c2541] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            All Platform Users & Subscriptions
          </h3>
          <span className="text-xs text-slate-400 font-mono">Total Users: {users.length}</span>
        </div>

        {/* Desktop / Tablet Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#131b2e] text-slate-400 uppercase tracking-wider font-semibold">
                <th className="p-4">User Details</th>
                <th className="p-4">Role</th>
                <th className="p-4">Plan / Status</th>
                <th className="p-4">Expires On</th>
                <th className="p-4">Transactions</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#131b2e]/40 transition">
                  <td className="p-4">
                    <div className="font-bold text-white">{u.name}</div>
                    <div className="text-slate-400 break-all">{u.email}</div>
                  </td>
                  <td className="p-4">
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          u.subStatus === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : u.subStatus === 'TRIAL'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {u.subStatus}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">({u.planType || 'MONTHLY'})</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-300 font-mono">
                    {u.subEndsAt ? new Date(u.subEndsAt).toLocaleDateString() : 'Lifetime / No Expiry'}
                  </td>
                  <td className="p-4 text-slate-400">{u.transactions.length} record(s)</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => openModal(u)}
                      className="rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 px-3 min-h-[38px] font-semibold transition cursor-pointer"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View */}
        <div className="md:hidden p-4 space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-xl bg-[#131b2e]/60 border border-slate-800 p-4 space-y-3 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-white text-sm">{u.name}</div>
                  <div className="text-slate-400 text-xs break-all">{u.email}</div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                    u.subStatus === 'ACTIVE'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : u.subStatus === 'TRIAL'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {u.subStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Role</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700 inline-block mt-0.5">
                    {u.role}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Plan Type</span>
                  <span className="text-slate-200 font-mono font-semibold mt-0.5 block">
                    {u.planType || 'MONTHLY'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Expires On</span>
                  <span className="text-slate-300 font-mono">
                    {u.subEndsAt ? new Date(u.subEndsAt).toLocaleDateString() : 'Lifetime / No Expiry'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Transactions</span>
                  <span className="text-slate-300">{u.transactions.length} record(s)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => openModal(u)}
                  className="w-full sm:w-auto rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 px-4 min-h-[40px] font-semibold transition cursor-pointer"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Particular User Management Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-[#1c2541] p-5 sm:p-6 border border-slate-700 shadow-2xl my-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Advanced User Subscription Manager</h3>
                <p className="text-xs text-slate-300 break-words">
                  {selectedUser.name} ({selectedUser.email})
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white text-sm font-bold min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdvancedUpdate} className="space-y-4 text-xs">
              {/* Status & Plan Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Subscription Status</label>
                  <select
                    value={subStatus}
                    onChange={(e) => setSubStatus(e.target.value as any)}
                    className="w-full rounded-xl bg-[#131b2e] border border-slate-700 min-h-[44px] px-3 text-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Plan Type</label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value as any)}
                    className="w-full rounded-xl bg-[#131b2e] border border-slate-700 min-h-[44px] px-3 text-white"
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="HALF_YEARLY">HALF_YEARLY</option>
                    <option value="ANNUAL">ANNUAL</option>
                    <option value="LIFETIME">LIFETIME</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </select>
                </div>
              </div>

              {/* Lifetime Free toggle */}
              <div className="flex items-center gap-2.5 bg-[#131b2e]/60 p-3.5 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="lifetimeFree"
                  checked={isLifetimeFree}
                  onChange={(e) => setIsLifetimeFree(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-blue-600 h-5 w-5 shrink-0 cursor-pointer"
                />
                <label htmlFor="lifetimeFree" className="text-white font-medium cursor-pointer leading-tight">
                  Grant Permanent Lifetime Free Access (No Expiry)
                </label>
              </div>

              {/* Months to Add or Trial Override */}
              {!isLifetimeFree && subStatus !== 'EXPIRED' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Months to Extend/Add</label>
                    <input
                      type="number"
                      value={monthsToAdd}
                      onChange={(e) => setMonthsToAdd(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl bg-[#131b2e] border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                  {subStatus === 'TRIAL' && (
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Trial Days Override</label>
                      <input
                        type="number"
                        placeholder="e.g. 30"
                        onChange={(e) => setTrialDaysOverride(parseInt(e.target.value) || null)}
                        className="w-full rounded-xl bg-[#131b2e] border border-slate-700 min-h-[44px] px-3 text-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Custom Prices Overrides Section */}
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <p className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">User-Specific Custom Pricing Tiers</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Custom Monthly ($)</label>
                    <input
                      type="number"
                      placeholder="Default"
                      value={customMonthlyPrice ?? ''}
                      onChange={(e) => setCustomMonthlyPrice(e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full rounded-xl bg-[#131b2e] border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Custom Half-Yearly ($)</label>
                    <input
                      type="number"
                      placeholder="Default"
                      value={customHalfYearlyPrice ?? ''}
                      onChange={(e) => setCustomHalfYearlyPrice(e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full rounded-xl bg-[#131b2e] border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Custom Annual ($)</label>
                    <input
                      type="number"
                      placeholder="Default"
                      value={customAnnualPrice ?? ''}
                      onChange={(e) => setCustomAnnualPrice(e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full rounded-xl bg-[#131b2e] border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Custom Lifetime ($)</label>
                    <input
                      type="number"
                      placeholder="Default"
                      value={customLifetimePrice ?? ''}
                      onChange={(e) => setCustomLifetimePrice(e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full rounded-xl bg-[#131b2e] border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* User Specific Offers */}
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <p className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Personal Offer Banner / Discount</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Offer Title</label>
                    <input
                      type="text"
                      placeholder="e.g. VIP Discount"
                      value={userSpecificOfferTitle}
                      onChange={(e) => setUserSpecificOfferTitle(e.target.value)}
                      className="w-full rounded-xl bg-[#131b2e] border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Discount %</label>
                    <input
                      type="number"
                      placeholder="e.g. 20"
                      value={userSpecificDiscountPct ?? ''}
                      onChange={(e) => setUserSpecificDiscountPct(e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full rounded-xl bg-[#131b2e] border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="rounded-lg bg-slate-700 px-4 min-h-[44px] font-semibold text-slate-300 hover:bg-slate-600 transition cursor-pointer flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-5 min-h-[44px] font-semibold text-white hover:bg-blue-500 transition disabled:opacity-50 cursor-pointer shadow-lg flex items-center justify-center"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}