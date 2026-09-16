// src/app/dashboard/admin/subscriptions/page.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  getSubscriptionDataAction,
  updateParticularUserAction,
  updatePlatformSettingsAction,
} from './actions';

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState<{ users: any[]; totalRevenue: number; settings: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
  const [isPending, startTransition] = useTransition();

  // Edit Particular User Modal State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<'TRIAL' | 'ACTIVE' | 'EXPIRED'>('ACTIVE');
  const [isLifetimeFree, setIsLifetimeFree] = useState(false);
  const [trialDaysOverride, setTrialDaysOverride] = useState<string>('');
  const [months, setMonths] = useState(1);

  // 4 Plan-Specific Custom Price Override States
  const [customMonthlyPrice, setCustomMonthlyPrice] = useState<string>('');
  const [customHalfYearlyPrice, setCustomHalfYearlyPrice] = useState<string>('');
  const [customAnnualPrice, setCustomAnnualPrice] = useState<string>('');
  const [customLifetimePrice, setCustomLifetimePrice] = useState<string>('');

  const [userOfferTitle, setUserOfferTitle] = useState('');
  const [userOfferDiscount, setUserOfferDiscount] = useState<string>('');

  // Global Settings Form State (All 4 Plans & Offers)
  const [trialDays, setTrialDays] = useState(30);
  const [monthlyPrice, setMonthlyPrice] = useState(500);
  const [halfYearlyPrice, setHalfYearlyPrice] = useState(2500);
  const [annualPrice, setAnnualPrice] = useState(5000);
  const [lifetimePrice, setLifetimePrice] = useState(120000);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDiscountPct, setOfferDiscountPct] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await getSubscriptionDataAction();
    setData(res);
    if (res.settings) {
      setTrialDays(res.settings.defaultTrialDays ?? 30);
      setMonthlyPrice(res.settings.monthlyPrice ?? 500);
      setHalfYearlyPrice(res.settings.halfYearlyPrice ?? 2500);
      setAnnualPrice(res.settings.annualPrice ?? 5000);
      setLifetimePrice(res.settings.lifetimePrice ?? 120000);
      setOfferTitle(res.settings.offerTitle || '');
      setOfferDiscountPct(res.settings.offerDiscountPct || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter out non-doctor users (adjust 'DOCTOR' to match your database role string if it differs, e.g., 'doctor')
  const doctorUsers = data?.users?.filter((u) => u.role?.toUpperCase() === 'DOCTOR') || [];

  const handleParticularUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    startTransition(async () => {
      await updateParticularUserAction(
        selectedUser.id,
        newStatus,
        isLifetimeFree,
        trialDaysOverride === '' ? null : Number(trialDaysOverride),
        customMonthlyPrice === '' ? null : Number(customMonthlyPrice),
        customHalfYearlyPrice === '' ? null : Number(customHalfYearlyPrice),
        customAnnualPrice === '' ? null : Number(customAnnualPrice),
        customLifetimePrice === '' ? null : Number(customLifetimePrice),
        userOfferTitle === '' ? null : userOfferTitle,
        userOfferDiscount === '' ? null : Number(userOfferDiscount),
        Number(months)
      );
      setSelectedUser(null);
      await loadData();
    });
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    startTransition(async () => {
      await updatePlatformSettingsAction(
        Number(trialDays),
        Number(monthlyPrice),
        Number(halfYearlyPrice),
        Number(annualPrice),
        Number(lifetimePrice),
        offerTitle,
        Number(offerDiscountPct)
      );
      setSuccessMessage('Global platform settings and plan pricing updated successfully.');
      await loadData();
    });
  };

  const downloadEarningsReport = () => {
    if (!doctorUsers.length) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Transaction ID,Doctor Name,Email,Plan Type,Amount (BDT),Status,Payment Date\n';

    doctorUsers.forEach((u) => {
      if (u.transactions && u.transactions.length > 0) {
        u.transactions.forEach((tx: any) => {
          const dateStr = new Date(tx.createdAt).toLocaleDateString();
          const row = `"${tx.id}","${u.name}","${u.email}","${tx.planType}","${tx.amount}","${tx.status}","${dateStr}"`;
          csvContent += row + '\n';
        });
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `doctor_earnings_ledger_${new Date().toISOString().slice(0, 7)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
        <p className="text-sm">Loading Control Panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-8 font-sans text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header & Revenue Summary */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Doctor Subscription & Revenue Control</h1>
            <p className="text-xs text-slate-400 mt-1">Manage global trial lengths, pricing tiers, special offers, and granular doctor overrides.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {activeTab === 'users' && (
              <button
                onClick={downloadEarningsReport}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 min-h-[44px] text-xs font-semibold text-white transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Download Earnings Report (Excel)</span>
              </button>
            )}

            <div className="rounded-xl bg-slate-800 border border-slate-700 px-5 py-3 shadow-lg flex flex-col justify-center">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Lifetime Platform Revenue</p>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-0.5">BDT {data?.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 min-h-[44px] rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            Doctor Subscriptions & Ledger ({doctorUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 min-h-[44px] rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            Global Trial & Pricing Configuration
          </button>
        </div>

        {/* TAB 1: USERS & SUBSCRIPTIONS */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {doctorUsers.length === 0 ? (
              <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center text-slate-400 text-xs shadow-xl">
                No doctor accounts found in the system.
              </div>
            ) : (
              <>
                {/* Desktop/Tablet Table View */}
                <div className="hidden md:block rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider border-b border-slate-700">
                        <tr>
                          <th className="p-4">Doctor Details</th>
                          <th className="p-4">Plan / Status</th>
                          <th className="p-4">Expiry / Trial End</th>
                          <th className="p-4">Custom Pricing & Offers</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {doctorUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-750/50 transition">
                            <td className="p-4">
                              <div className="font-bold text-white">{u.name}</div>
                              <div className="text-slate-400 break-all">{u.email}</div>
                            </td>
                            <td className="p-4 space-y-1">
                              <span className="inline-block rounded bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300 mr-1">
                                {u.planType || 'MONTHLY'}
                              </span>
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  u.subStatus === 'ACTIVE'
                                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                                    : u.subStatus === 'TRIAL'
                                    ? 'bg-blue-900/60 text-blue-300 border border-blue-500/40'
                                    : 'bg-red-900/60 text-red-300 border border-red-500/40'
                                }`}
                              >
                                {u.subStatus}
                              </span>
                            </td>
                            <td className="p-4 text-slate-300">
                              {u.subStatus === 'TRIAL'
                                ? u.trialEndsAt ? new Date(u.trialEndsAt).toLocaleDateString() : 'N/A'
                                : (!u.subEndsAt ? 'Lifetime Free Access' : new Date(u.subEndsAt).toLocaleDateString())}
                            </td>
                            <td className="p-4 text-slate-300 space-y-0.5">
                              <div>
                                {u.customMonthlyPrice || u.customHalfYearlyPrice || u.customAnnualPrice || u.customLifetimePrice
                                  ? 'Custom Overrides Set'
                                  : 'Standard Tier Prices'}
                              </div>
                              {u.userSpecificOfferTitle && (
                                <div className="text-[10px] text-amber-400 font-medium">
                                  Offer: {u.userSpecificOfferTitle} ({u.userSpecificDiscountPct}%)
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setNewStatus(u.subStatus || 'ACTIVE');
                                  setIsLifetimeFree(!u.subEndsAt && u.subStatus === 'ACTIVE');
                                  setTrialDaysOverride('');

                                  setCustomMonthlyPrice(u.customMonthlyPrice ? u.customMonthlyPrice.toString() : '');
                                  setCustomHalfYearlyPrice(u.customHalfYearlyPrice ? u.customHalfYearlyPrice.toString() : '');
                                  setCustomAnnualPrice(u.customAnnualPrice ? u.customAnnualPrice.toString() : '');
                                  setCustomLifetimePrice(u.customLifetimePrice ? u.customLifetimePrice.toString() : '');

                                  setUserOfferTitle(u.userSpecificOfferTitle || '');
                                  setUserOfferDiscount(u.userSpecificDiscountPct ? u.userSpecificDiscountPct.toString() : '');
                                }}
                                className="rounded-lg bg-blue-600 px-3 min-h-[38px] font-semibold text-white hover:bg-blue-500 transition cursor-pointer"
                              >
                                Manage Doctor
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Stacked Card View */}
                <div className="md:hidden space-y-3">
                  {doctorUsers.map((u) => (
                    <div key={u.id} className="rounded-xl bg-slate-800 border border-slate-700 p-4 space-y-3 shadow-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-white text-sm">{u.name}</div>
                          <div className="text-slate-400 text-xs break-all">{u.email}</div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                            u.subStatus === 'ACTIVE'
                              ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                              : u.subStatus === 'TRIAL'
                              ? 'bg-blue-900/60 text-blue-300 border border-blue-500/40'
                              : 'bg-red-900/60 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {u.subStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-700/60">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Plan Type</span>
                          <span className="text-slate-200 font-semibold">{u.planType || 'MONTHLY'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Expiry / End</span>
                          <span className="text-slate-200 font-semibold">
                            {u.subStatus === 'TRIAL'
                              ? u.trialEndsAt ? new Date(u.trialEndsAt).toLocaleDateString() : 'N/A'
                              : (!u.subEndsAt ? 'Lifetime Free' : new Date(u.subEndsAt).toLocaleDateString())}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs pt-2 border-t border-slate-700/60 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Pricing Overrides</span>
                          <span className="text-slate-300 font-medium">
                            {u.customMonthlyPrice || u.customHalfYearlyPrice || u.customAnnualPrice || u.customLifetimePrice
                              ? 'Custom Overrides Set'
                              : 'Standard Tier Prices'}
                          </span>
                          {u.userSpecificOfferTitle && (
                            <span className="block text-[10px] text-amber-400 font-medium">
                              Offer: {u.userSpecificOfferTitle} ({u.userSpecificDiscountPct}%)
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setNewStatus(u.subStatus || 'ACTIVE');
                            setIsLifetimeFree(!u.subEndsAt && u.subStatus === 'ACTIVE');
                            setTrialDaysOverride('');

                            setCustomMonthlyPrice(u.customMonthlyPrice ? u.customMonthlyPrice.toString() : '');
                            setCustomHalfYearlyPrice(u.customHalfYearlyPrice ? u.customHalfYearlyPrice.toString() : '');
                            setCustomAnnualPrice(u.customAnnualPrice ? u.customAnnualPrice.toString() : '');
                            setCustomLifetimePrice(u.customLifetimePrice ? u.customLifetimePrice.toString() : '');

                            setUserOfferTitle(u.userSpecificOfferTitle || '');
                            setUserOfferDiscount(u.userSpecificDiscountPct ? u.userSpecificDiscountPct.toString() : '');
                          }}
                          className="rounded-lg bg-blue-600 px-3 min-h-[40px] font-semibold text-white hover:bg-blue-500 transition cursor-pointer"
                        >
                          Manage Doctor
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: GLOBAL SETTINGS & OFFERS */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl bg-slate-800 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-xl">
            <h2 className="text-base sm:text-lg font-bold text-white mb-1">Global Platform & Plan Configuration</h2>
            <p className="text-xs text-slate-400 mb-6">Modify trial lengths, standard package pricing for all 4 subscription tiers, and launch promotional discounts.</p>

            {successMessage && (
              <div className="mb-4 rounded-lg bg-emerald-900/50 border border-emerald-500/40 p-3 text-xs text-emerald-300">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSettingsSubmit} className="space-y-5 text-xs">
              <div>
                <label className="block font-medium mb-1 text-slate-300">Default Trial Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-700 pt-4">
                <div>
                  <label className="block font-medium mb-1 text-slate-300">Monthly Plan Price (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-slate-300">Half-Yearly Plan Price (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    value={halfYearlyPrice}
                    onChange={(e) => setHalfYearlyPrice(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-slate-300">Annual Plan Price (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    value={annualPrice}
                    onChange={(e) => setAnnualPrice(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-slate-300">Lifetime Plan Price (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    value={lifetimePrice}
                    onChange={(e) => setLifetimePrice(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-white mb-3">Promotional Offer & Discounts</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block font-medium mb-1 text-slate-300">Offer Banner Title (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., Seasonal Discount"
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-slate-300">Discount Percentage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={offerDiscountPct}
                      onChange={(e) => setOfferDiscountPct(Number(e.target.value))}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 w-full sm:w-auto px-6 min-h-[44px] font-semibold text-white transition text-xs cursor-pointer shadow-lg flex items-center justify-center"
                >
                  {isPending ? 'Saving Settings...' : 'Save Global Settings & Prices'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PARTICULAR DOCTOR MANAGEMENT MODAL */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-slate-800 p-5 sm:p-6 border border-slate-700 shadow-2xl my-8">
              <h3 className="text-base sm:text-lg font-bold text-white mb-1">Manage Doctor Subscription Settings</h3>
              <p className="text-xs text-slate-400 mb-4 break-words">Configuring custom rules for <span className="text-white font-medium">{selectedUser.name}</span></p>

              <form onSubmit={handleParticularUserSubmit} className="space-y-4 text-xs">

                {/* Session Status Control Only */}
                <div>
                  <label className="block font-medium mb-1 text-slate-300">Session Status Control</label>
                  <select
                    value={newStatus}
                    onChange={(e: any) => setNewStatus(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                  >
                    <option value="TRIAL">TRIAL Session</option>
                    <option value="ACTIVE">ACTIVE Session</option>
                    <option value="EXPIRED">EXPIRED / Kill Session</option>
                  </select>
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

                {/* Trial Extension / Reduction */}
                {newStatus === 'TRIAL' && (
                  <div>
                    <label className="block font-medium mb-1 text-slate-300">Trial Period (Total Days from Today)</label>
                    <input
                      type="number"
                      placeholder="e.g., 10 (reduce) or 45 (extend)"
                      value={trialDaysOverride}
                      onChange={(e) => setTrialDaysOverride(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                )}

                {!isLifetimeFree && newStatus === 'ACTIVE' && (
                  <div>
                    <label className="block font-medium mb-1 text-slate-300">Extend Active Duration (Months to add)</label>
                    <input
                      type="number"
                      min="0"
                      value={months}
                      onChange={(e) => setMonths(Number(e.target.value))}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                    />
                  </div>
                )}

                {/* 4 Plan Custom Price Overrides Grid */}
                <div className="space-y-2 border-t border-slate-700 pt-3">
                  <label className="block font-medium text-slate-300">Custom Price Overrides per Plan (BDT)</label>
                  <p className="text-[10px] text-slate-400">Leave blank to fallback to global standard tier prices.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Monthly Plan Custom Price</span>
                      <input
                        type="number"
                        placeholder="e.g., 400"
                        value={customMonthlyPrice}
                        onChange={(e) => setCustomMonthlyPrice(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Half-Yearly Custom Price</span>
                      <input
                        type="number"
                        placeholder="e.g., 2000"
                        value={customHalfYearlyPrice}
                        onChange={(e) => setCustomHalfYearlyPrice(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Annual Plan Custom Price</span>
                      <input
                        type="number"
                        placeholder="e.g., 4000"
                        value={customAnnualPrice}
                        onChange={(e) => setCustomAnnualPrice(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Lifetime Plan Custom Price</span>
                      <input
                        type="number"
                        placeholder="e.g., 50000"
                        value={customLifetimePrice}
                        onChange={(e) => setCustomLifetimePrice(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* User-Specific Promotional Offers */}
                <div className="border-t border-slate-700 pt-3 space-y-3">
                  <h4 className="font-semibold text-white">Particular Doctor Promotional Offer</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1 text-slate-300">Offer Title</label>
                      <input
                        type="text"
                        placeholder="e.g., Special Review Bonus"
                        value={userOfferTitle}
                        onChange={(e) => setUserOfferTitle(e.target.value)}
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
                        value={userOfferDiscount}
                        onChange={(e) => setUserOfferDiscount(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 min-h-[44px] px-3 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="rounded-lg bg-slate-700 px-4 min-h-[44px] font-semibold text-slate-300 hover:bg-slate-600 transition cursor-pointer flex items-center justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-blue-600 px-5 min-h-[44px] font-semibold text-white hover:bg-blue-500 transition disabled:opacity-50 cursor-pointer shadow-lg flex items-center justify-center"
                  >
                    {isPending ? 'Updating...' : 'Save Doctor Customizations'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}