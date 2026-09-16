// src/app/subscription/CheckoutButton.tsx
'use client';

import { useState } from 'react';

export default function CheckoutButton({ planName }: { planName: string }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect the user to the secure SSLCommerz gateway popup window
        window.location.href = data.url;
      } else {
        setErrorMsg(data.error || 'Failed to initialize payment gateway.');
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 active:bg-blue-700 hover:bg-blue-500 py-3.5 text-xs font-semibold text-white transition-all shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Connecting to Gateway...' : 'Pay with SSLCommerz'}
      </button>
      {errorMsg && <p className="text-[11px] text-rose-400 text-center">{errorMsg}</p>}
    </div>
  );
}