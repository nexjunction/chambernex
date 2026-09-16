// src/app/dashboard/admin/settings/payment/page.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { getPaymentConfigAction, savePaymentConfigAction } from './actions';

export default function SuperAdminPaymentSettingsPage() {
  const [storeId, setStoreId] = useState('');
  const [storePassword, setStorePassword] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getPaymentConfigAction()
      .then((config) => {
        if (config) {
          setStoreId(config.storeId || '');
          setStorePassword(config.storePassword || '');
          setIsLive(config.isLive || false);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    startTransition(async () => {
      const res = await savePaymentConfigAction(storeId, storePassword, isLive);
      if (res.success) {
        setMessage({ type: 'success', text: 'SSLCommerz gateway credentials updated successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to update credentials or unauthorized.' });
      }
    });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 text-slate-400 font-sans text-xs">
        Loading gateway configuration...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 font-sans text-slate-100 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">SSLCommerz Gateway Management</h1>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Connect your application directly to SSLCommerz. Changes take effect instantly for bKash, Nagad, and card transactions.
        </p>
      </div>

      {message.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/50'
              : 'bg-rose-950/70 text-rose-400 border-rose-500/50'
          }`}
        >
          {message.text}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-[#1c2541] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5"
      >
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Store ID</label>
          <input
            type="text"
            required
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            placeholder="e.g., yourstorelive"
            className="w-full rounded-xl bg-slate-900 border border-slate-700 min-h-[44px] px-3.5 text-white text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Store Password / API Secret</label>
          <input
            type="password"
            required
            value={storePassword}
            onChange={(e) => setStorePassword(e.target.value)}
            placeholder="••••••••••••••••"
            className="w-full rounded-xl bg-slate-900 border border-slate-700 min-h-[44px] px-3.5 text-white text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 bg-[#131b2e]/60 p-3.5 rounded-xl border border-slate-800">
          <input
            type="checkbox"
            id="isLive"
            checked={isLive}
            onChange={(e) => setIsLive(e.target.checked)}
            className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
          />
          <label htmlFor="isLive" className="text-xs font-medium text-slate-200 cursor-pointer leading-tight">
            Enable Live Production Mode{' '}
            <span className="text-slate-400 font-normal block sm:inline mt-0.5 sm:mt-0">
              (Uncheck for Sandbox / Testing mode)
            </span>
          </label>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto rounded-xl bg-blue-600 px-6 min-h-[44px] text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition shadow-lg cursor-pointer flex items-center justify-center"
          >
            {isPending ? 'Saving Credentials...' : 'Save & Connect Gateway'}
          </button>
        </div>
      </form>
    </div>
  );
}