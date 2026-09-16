// src/app/dashboard/admin/settings/subscriptions/page.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  getSubscriptionDataAction,
  updatePlatformSettingsAction,
  updateUserCustomPriceAction,
  approveTransactionAction,
  rejectTransactionAction
} from './actions';

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'settings'>('users');
  const [isPending, startTransition] = useTransition();

  // Global Settings Form State
  const [trialDays, setTrialDays] = useState(30);
  const [monthlyPrice, setMonthlyPrice] = useState(500);
  const [halfYearlyPrice, setHalfYearlyPrice] = useState(2500);
  const [annualPrice, setAnnualPrice] = useState(5000);
  const [lifetimePrice, setLifetimePrice] = useState(120000);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDiscountPct, setOfferDiscountPct] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Per-User Custom Tier Price Modal/Inline State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [customMonthly, setCustomMonthly] = useState<string>('');
  const [customHalfYearly, setCustomHalfYearly] = useState<string>('');
  const [customAnnual, setCustomAnnual] = useState<string>('');
  const [customLifetime, setCustomLifetime] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    const res = await getSubscriptionDataAction();
    setData(res);
    if (res?.settings) {
      setTrialDays(res.settings.defaultTrialDays ?? 30);
      setMonthlyPrice(res.settings.monthlyPrice ?? 500);
      setHalfYearlyPrice(res.settings.halfYearlyPrice ?? 2500);
      setAnnualPrice(res.settings.annualPrice ?? 5000);
      setLifetimePrice(res.settings.lifetimePrice ?? 120000);
      setOfferTitle(res.settings.offerTitle ?? '');
      setOfferDiscountPct(res.settings.offerDiscountPct ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    startTransition(async () => {
      const res = await updatePlatformSettingsAction(
        trialDays,
        monthlyPrice,
        halfYearlyPrice,
        annualPrice,
        lifetimePrice,
        offerTitle,
        offerDiscountPct
      );
      if (res.success) {
        setSuccessMessage('Global platform settings updated successfully!');
        await loadData();
      } else {
        setErrorMessage('Failed to update settings.');
      }
    });
  };

  const handleSaveCustomPrices = (userId: string) => {
    startTransition(async () => {
      const payload = {
        userId,
        customMonthlyPrice: customMonthly.trim() === '' ? null : Number(customMonthly),
        customHalfYearlyPrice: customHalfYearly.trim() === '' ? null : Number(customHalfYearly),
        customAnnualPrice: customAnnual.trim() === '' ? null : Number(customAnnual),
        customLifetimePrice: customLifetime.trim() === '' ? null : Number(customLifetime),
      };

      const res = await updateUserCustomPriceAction(payload);
      if (res.success) {
        setEditingUserId(null);
        await loadData();
      }
    });
  };

  const handleApprove = (trxId: string) => {
    startTransition(async () => {
      const res = await approveTransactionAction(trxId);
      if (res.success) {
        await loadData();
      }
    });
  };

  const handleReject = (trxId: string) => {
    startTransition(async () => {
      const res = await rejectTransactionAction(trxId);
      if (res.success) {
        await loadData();
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
        <p className="text-sm">Loading Subscriptions & Billing Panel...</p>
      </div>
    );
  }

  const users = data?.users || [];
  const transactions = data?.transactions || [];
  const totalRevenue = data?.totalRevenue || 0;

  return (
    <div className="min-h-screen bg-slate-900 p-8 font-sans text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header & Revenue Overview */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-white">Subscription & Revenue Management</h1>
            <p className="text-xs text-slate-400 mt-1">Manage user subscriptions, transaction approvals, and global discount pricing defaults.</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 px-5 py-3 rounded-xl text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Verified Revenue</p>
            <p className="text-xl font-extrabold text-emerald-400 mt-0.5">৳ {totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-700 pb-3">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            👥 User Subscriptions ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'transactions' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            💳 Transactions Ledger ({transactions.filter((t: any) => t.status === 'PENDING').length} Pending)
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ⚙️ Global Pricing & Configuration
          </button>
        </div>

        {/* TAB 1: USERS SUBSCRIPTIONS */}
        {activeTab === 'users' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-700 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Access Ends / Trial Ends</th>
                  <th className="pb-3">Custom Tier Pricing</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-700/20 transition align-top">
                    <td className="py-3">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3">
                      <span className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.subStatus === 'ACTIVE' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40' :
                        u.subStatus === 'TRIAL' ? 'bg-blue-900/60 text-blue-300 border border-blue-500/40' :
                        'bg-red-900/60 text-red-300 border border-red-500/40'
                      }`}>
                        {u.subStatus}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-[11px]">
                      {u.subStatus === 'TRIAL'
                        ? (u.trialEndsAt ? new Date(u.trialEndsAt).toLocaleDateString() : 'N/A')
                        : (u.subEndsAt ? new Date(u.subEndsAt).toLocaleDateString() : 'Lifetime')}
                    </td>
                    <td className="py-3">
                      {editingUserId === u.id ? (
                        <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-slate-700 w-72">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Set Custom Prices (leave empty for default)</p>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <label className="text-[10px] text-slate-400">Monthly</label>
                              <input
                                type="number"
                                placeholder="Default"
                                value={customMonthly}
                                onChange={(e) => setCustomMonthly(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-white text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400">Half-Yearly</label>
                              <input
                                type="number"
                                placeholder="Default"
                                value={customHalfYearly}
                                onChange={(e) => setCustomHalfYearly(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-white text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400">Annual</label>
                              <input
                                type="number"
                                placeholder="Default"
                                value={customAnnual}
                                onChange={(e) => setCustomAnnual(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-white text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400">Lifetime</label>
                              <input
                                type="number"
                                placeholder="Default"
                                value={customLifetime}
                                onChange={(e) => setCustomLifetime(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-white text-xs"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => handleSaveCustomPrices(u.id)}
                              disabled={isPending}
                              className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded text-white font-bold cursor-pointer text-[10px]"
                            >
                              Save Tiers
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 cursor-pointer text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-[11px] font-mono space-y-0.5">
                            <div>M: {u.customMonthlyPrice ? `৳${u.customMonthlyPrice}` : <span className="text-slate-500">Default</span>}</div>
                            <div>6M: {u.customHalfYearlyPrice ? `৳${u.customHalfYearlyPrice}` : <span className="text-slate-500">Default</span>}</div>
                            <div>1Y: {u.customAnnualPrice ? `৳${u.customAnnualPrice}` : <span className="text-slate-500">Default</span>}</div>
                            <div>L: {u.customLifetimePrice ? `৳${u.customLifetimePrice}` : <span className="text-slate-500">Default</span>}</div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingUserId(u.id);
                              setCustomMonthly(u.customMonthlyPrice ? u.customMonthlyPrice.toString() : '');
                              setCustomHalfYearly(u.customHalfYearlyPrice ? u.customHalfYearlyPrice.toString() : '');
                              setCustomAnnual(u.customAnnualPrice ? u.customAnnualPrice.toString() : '');
                              setCustomLifetime(u.customLifetimePrice ? u.customLifetimePrice.toString() : '');
                            }}
                            className="text-blue-400 hover:underline text-[10px] cursor-pointer mt-1 block"
                          >
                            Edit Custom Prices
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: TRANSACTIONS LEDGER */}
        {activeTab === 'transactions' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-700 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Method & TrxID</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">No payment transactions recorded yet.</td>
                  </tr>
                ) : (
                  transactions.map((trx: any) => (
                    <tr key={trx.id} className="hover:bg-slate-700/20 transition">
                      <td className="py-3">
                        <div className="font-bold text-white">{trx.user?.name}</div>
                        <div className="text-[10px] text-slate-400">{trx.user?.email}</div>
                      </td>
                      <td className="py-3 font-semibold text-blue-300">{trx.planType}</td>
                      <td className="py-3 font-mono font-bold text-white">৳ {trx.amount.toLocaleString()}</td>
                      <td className="py-3">
                        <div className="font-bold text-slate-200">{trx.paymentMethod}</div>
                        <div className="font-mono text-[10px] text-blue-400">{trx.trxId}</div>
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          trx.status === 'COMPLETED' || trx.status === 'APPROVED' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40' :
                          trx.status === 'PENDING' ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40' :
                          'bg-red-900/60 text-red-300 border border-red-500/40'
                        }`}>
                          {trx.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {trx.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(trx.id)}
                              disabled={isPending}
                              className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded text-white font-bold transition shadow cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(trx.id)}
                              disabled={isPending}
                              className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-white font-bold transition shadow cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: GLOBAL SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1">Global Platform Configuration</h2>
            <p className="text-xs text-slate-400 mb-6">Modify default trial lengths, package pricing across all four tiers, and launch promotional discounts.</p>

            {successMessage && (
              <div className="mb-4 rounded-lg bg-emerald-900/50 border border-emerald-500/40 p-3 text-xs text-emerald-300">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 rounded-lg bg-red-900/50 border border-red-500/40 p-3 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-300">Default Trial Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Default Monthly Price (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Default Half-Yearly Price (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    value={halfYearlyPrice}
                    onChange={(e) => setHalfYearlyPrice(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Default Annual Price (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    value={annualPrice}
                    onChange={(e) => setAnnualPrice(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Default Lifetime Price (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    value={lifetimePrice}
                    onChange={(e) => setLifetimePrice(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-white mb-3">🏷️ Promotional Offer & Discounts</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-300">Offer Banner Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Special Season Discount / Spring Offer"
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-300">Discount Percentage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={offerDiscountPct}
                      onChange={(e) => setOfferDiscountPct(Number(e.target.value))}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 px-6 py-3 font-semibold text-white transition text-xs disabled:opacity-50 cursor-pointer shadow-lg"
                >
                  {isPending ? 'Saving Settings...' : 'Save Global Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}