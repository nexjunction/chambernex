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
  planType: string | null;
  subEndsAt: string | Date | null;
  trialEndsAt: string | Date | null;
  customMonthlyPrice: number | null;
  customHalfYearlyPrice: number | null;
  customAnnualPrice: number | null;
  customLifetimePrice: number | null;
  userSpecificOfferTitle: string | null;
  userSpecificDiscountPct: number | null;
  transactions: {
    id: string;
    amount: number;
    planType: string;
    paymentMethod: string;
    trxId: string | null;
    status: string;
    createdAt: string | Date;
  }[];
}

export default function UserManagementTable({ initialUsers }: { initialUsers: UserItem[] }) {
  // Filter incoming users to strictly retain doctors only
  const doctorUsersOnly = initialUsers.filter((u) => u.role?.toUpperCase() === 'DOCTOR');

  const [users, setUsers] = useState<UserItem[]>(doctorUsersOnly);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Modal form states
  const [newStatus, setNewStatus] = useState<'TRIAL' | 'ACTIVE' | 'EXPIRED'>('ACTIVE');
  const [selectedPlanType, setSelectedPlanType] = useState<
    'MONTHLY' | 'HALF_YEARLY' | 'ANNUAL' | 'LIFETIME' | 'CUSTOM'
  >('MONTHLY');
  const [isLifetimeFree, setIsLifetimeFree] = useState(false);
  const [trialDaysOverride, setTrialDaysOverride] = useState<string>('');
  const [months, setMonths] = useState(1);

  // Custom price overrides
  const [customMonthly, setCustomMonthly] = useState<string>('');
  const [customHalfYearly, setCustomHalfYearly] = useState<string>('');
  const [customAnnual, setCustomAnnual] = useState<string>('');
  const [customLifetime, setCustomLifetime] = useState<string>('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDiscount, setOfferDiscount] = useState<string>('');

  const handleModalOpen = (u: UserItem) => {
    setSelectedUser(u);
    setNewStatus((u.subStatus as any) || 'ACTIVE');
    setSelectedPlanType((u.planType as any) || 'MONTHLY');
    setIsLifetimeFree(!u.subEndsAt && u.subStatus === 'ACTIVE');
    setTrialDaysOverride('');
    setCustomMonthly(u.customMonthlyPrice ? u.customMonthlyPrice.toString() : '');
    setCustomHalfYearly(u.customHalfYearlyPrice ? u.customHalfYearlyPrice.toString() : '');
    setCustomAnnual(u.customAnnualPrice ? u.customAnnualPrice.toString() : '');
    setCustomLifetime(u.customLifetimePrice ? u.customLifetimePrice.toString() : '');
    setOfferTitle(u.userSpecificOfferTitle || '');
    setOfferDiscount(u.userSpecificDiscountPct ? u.userSpecificDiscountPct.toString() : '');
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    setMessage('');

    const res = await updateParticularUserAction(
      selectedUser.id,
      newStatus,
      selectedPlanType,
      isLifetimeFree,
      trialDaysOverride === '' ? null : Number(trialDaysOverride),
      customMonthly === '' ? null : Number(customMonthly),
      customHalfYearly === '' ? null : Number(customHalfYearly),
      customAnnual === '' ? null : Number(customAnnual),
      customLifetime === '' ? null : Number(customLifetime),
      offerTitle === '' ? null : offerTitle,
      offerDiscount === '' ? null : Number(offerDiscount),
      months
    );

    if (res.success) {
      setMessage(`Successfully updated subscription rules for ${selectedUser.name}!`);
      // Update local state instantly
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                subStatus: newStatus,
                planType: selectedPlanType,
                subEndsAt: isLifetimeFree
                  ? null
                  : months > 0
                  ? new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
                  : u.subEndsAt,
              }
            : u
        )
      );
      setSelectedUser(null);
    } else {
      setMessage('Failed to update user subscription configuration.');
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
            Doctor Subscriptions & Management
          </h3>
          <span className="text-xs text-slate-400 font-mono">Total Doctors: {users.length}</span>
        </div>

        {/* Desktop / Tablet Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#131b2e] text-slate-400 uppercase tracking-wider font-semibold">
                <th className="p-4">Doctor Details</th>
                <th className="p-4">Role</th>
                <th className="p-4">Plan / Status</th>
                <th className="p-4">Expires On</th>
                <th className="p-4">Transactions</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No doctor accounts found in the system.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#131b2e]/40 transition">
                    <td className="p-4">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-slate-400 break-all">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="rounded-md bg-slate-800 px-2.5 py-1 text-[10px] font-mono text-slate-300 border border-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 space-y-1">
                      <span className="inline-block rounded bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300 mr-1 border border-slate-700">
                        {u.planType || 'MONTHLY'}
                      </span>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          u.subStatus === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : u.subStatus === 'TRIAL'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {u.subStatus}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-mono">
                      {u.subStatus === 'TRIAL'
                        ? u.trialEndsAt
                          ? new Date(u.trialEndsAt).toLocaleDateString()
                          : 'N/A'
                        : !u.subEndsAt
                        ? 'Lifetime Free Access'
                        : new Date(u.subEndsAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-slate-400">{u.transactions?.length || 0} record(s)</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleModalOpen(u)}
                        className="rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 px-3 min-h-[38px] font-semibold transition cursor-pointer"
                      >
                        Manage Doctor
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View */}
        <div className="md:hidden p-4 space-y-3">
          {users.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No doctor accounts found in the system.
            </div>
          ) : (
            users.map((u) => (
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
                    <span className="text-slate-200 font-semibold">{u.planType || 'MONTHLY'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Expires On</span>
                    <span className="text-slate-300 font-mono">
                      {u.subStatus === 'TRIAL'
                        ? u.trialEndsAt
                          ? new Date(u.trialEndsAt).toLocaleDateString()
                          : 'N/A'
                        : !u.subEndsAt
                        ? 'Lifetime Free Access'
                        : new Date(u.subEndsAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Transactions</span>
                    <span className="text-slate-300">{u.transactions?.length || 0} record(s)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleModalOpen(u)}
                    className="w-full sm:w-auto rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 px-4 min-h-[40px] font-semibold transition cursor-pointer"
                  >
                    Manage Doctor
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comprehensive Manual Override Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-[#1c2541] p-5 sm:p-6 border border-slate-700 shadow-2xl my-8 space-y-4">
            <h3 className="text-base font-bold text-white">Manage Doctor Subscription Settings</h3>
            <p className="text-xs text-slate-300 break-words">
              Configuring custom rules for{' '}
              <span className="text-white font-semibold">{selectedUser.name}</span> ({selectedUser.email})
            </p>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-slate-300">Session Status</label>
                  <select
                    value={newStatus}
                    onChange={(e: any) => setNewStatus(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                  >
                    <option value="TRIAL">TRIAL Session</option>
                    <option value="ACTIVE">ACTIVE Session</option>
                    <option value="EXPIRED">EXPIRED / Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-slate-300">Assigned Plan Tier</label>
                  <select
                    value={selectedPlanType}
                    onChange={(e: any) => setSelectedPlanType(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="HALF_YEARLY">Half-Yearly</option>
                    <option value="ANNUAL">Annual</option>
                    <option value="LIFETIME">Lifetime</option>
                    <option value="CUSTOM">Custom Tier</option>
                  </select>
                </div>
              </div>

              {/* Lifetime Free Access Toggle */}
              <div className="flex items-center gap-2.5 bg-slate-900/50 p-3.5 rounded-lg border border-slate-700/50">
                <input
                  type="checkbox"
                  id="isLifetimeFree"
                  checked={isLifetimeFree}
                  onChange={(e) => setIsLifetimeFree(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 h-5 w-5 shrink-0 cursor-pointer"
                />
                <label htmlFor="isLifetimeFree" className="font-medium text-slate-200 cursor-pointer leading-tight">
                  Grant Lifetime Free Access (Nullify Expiry Date)
                </label>
              </div>

              {newStatus === 'TRIAL' && (
                <div>
                  <label className="block font-medium mb-1 text-slate-300">Trial Period (Total Days from Today)</label>
                  <input
                    type="number"
                    placeholder="e.g. 30"
                    value={trialDaysOverride}
                    onChange={(e) => setTrialDaysOverride(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                  />
                </div>
              )}

              {!isLifetimeFree && newStatus === 'ACTIVE' && (
                <div>
                  <label className="block font-medium mb-1 text-slate-300">Extend Active Duration (Months to Add)</label>
                  <input
                    type="number"
                    min="0"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                  />
                </div>
              )}

              {/* 4 Plan Custom Price Overrides */}
              <div className="space-y-2 border-t border-slate-700 pt-3">
                <label className="block font-medium text-slate-300">Custom Price Overrides per Plan (BDT)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Monthly Custom Price</span>
                    <input
                      type="number"
                      placeholder="Standard default"
                      value={customMonthly}
                      onChange={(e) => setCustomMonthly(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Half-Yearly Custom Price</span>
                    <input
                      type="number"
                      placeholder="Standard default"
                      value={customHalfYearly}
                      onChange={(e) => setCustomHalfYearly(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Annual Custom Price</span>
                    <input
                      type="number"
                      placeholder="Standard default"
                      value={customAnnual}
                      onChange={(e) => setCustomAnnual(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Lifetime Custom Price</span>
                    <input
                      type="number"
                      placeholder="Standard default"
                      value={customLifetime}
                      onChange={(e) => setCustomLifetime(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Promotional Offer Overrides */}
              <div className="border-t border-slate-700 pt-3 space-y-3">
                <h4 className="font-semibold text-white">Particular Doctor Promotional Offer</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1 text-slate-300">Offer Title</label>
                    <input
                      type="text"
                      placeholder="e.g., VIP Loyalty Deal"
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-slate-300">Discount (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0 - 100"
                      value={offerDiscount}
                      onChange={(e) => setOfferDiscount(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
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
                  {loading ? 'Saving...' : 'Save Doctor Customizations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}