// src/app/subscription/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function SubscriptionPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch both global platform settings and the logged-in user's specific overrides
  useEffect(() => {
    async function fetchSubscriptionData() {
      try {
        const response = await fetch('/api/user/subscription');
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
          setUser(data.user);
        }
      } catch (err) {
        console.error('Failed to load subscription data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSubscriptionData();
  }, []);

  // Fallback base global prices
  const baseMonthly = settings?.monthlyPrice ?? 500;
  const baseHalfYearly = settings?.halfYearlyPrice ?? 2500;
  const baseAnnual = settings?.annualPrice ?? 5000;
  const baseLifetime = settings?.lifetimePrice ?? 120000;

  // Determine if there's a user-specific offer or fallback to global offer
  const discountPct = user?.userSpecificDiscountPct ?? settings?.offerDiscountPct ?? 0;
  const offerTitle = user?.userSpecificOfferTitle ?? settings?.offerTitle ?? '';

  // Calculate pricing considering custom overrides for each specific plan and individual discount percentages
  const getPlanPrice = (planId: string, basePrice: number) => {
    let rawPrice = basePrice;
    if (planId === 'MONTHLY' && user?.customMonthlyPrice != null) rawPrice = user.customMonthlyPrice;
    if (planId === 'HALF_YEARLY' && user?.customHalfYearlyPrice != null) rawPrice = user.customHalfYearlyPrice;
    if (planId === 'ANNUALLY' && user?.customAnnualPrice != null) rawPrice = user.customAnnualPrice;
    if (planId === 'LIFETIME' && user?.customLifetimePrice != null) rawPrice = user.customLifetimePrice;

    if (discountPct > 0) {
      return Math.round(rawPrice * (1 - discountPct / 100));
    }
    return rawPrice;
  };

  // Helper to check if a custom price override is specifically set for a plan
  const getCustomPriceOrNull = (planId: string) => {
    if (planId === 'MONTHLY') return user?.customMonthlyPrice ?? null;
    if (planId === 'HALF_YEARLY') return user?.customHalfYearlyPrice ?? null;
    if (planId === 'ANNUALLY') return user?.customAnnualPrice ?? null;
    if (planId === 'LIFETIME') return user?.customLifetimePrice ?? null;
    return null;
  };

  const monthlyFinal = getPlanPrice('MONTHLY', baseMonthly);
  const halfYearlyFinal = getPlanPrice('HALF_YEARLY', baseHalfYearly);
  const annualFinal = getPlanPrice('ANNUALLY', baseAnnual);
  const lifetimeFinal = getPlanPrice('LIFETIME', baseLifetime);

  const plans = [
    {
      id: 'MONTHLY',
      name: 'Monthly Plan',
      originalAmount: getCustomPriceOrNull('MONTHLY') ?? baseMonthly,
      rawAmount: monthlyFinal,
      price: `${monthlyFinal.toLocaleString()} BDT`,
      period: 'per month',
      description: 'Standard access billed monthly for individual practitioners.',
      features: ['Full Dashboard Access', 'Patient Management', 'Automated Queue', 'Standard Support'],
      highlight: user?.planType === 'MONTHLY',
    },
    {
      id: 'HALF_YEARLY',
      name: 'Half-Yearly Plan',
      originalAmount: getCustomPriceOrNull('HALF_YEARLY') ?? baseHalfYearly,
      rawAmount: halfYearlyFinal,
      price: `${halfYearlyFinal.toLocaleString()} BDT`,
      period: 'for 6 months',
      description: 'Great value package for growing chamber practices.',
      features: ['Full Dashboard Access', 'Priority Support', 'Advanced Analytics'],
      highlight: user?.planType === 'HALF_YEARLY',
    },
    {
      id: 'ANNUALLY',
      name: 'Annual Plan',
      originalAmount: getCustomPriceOrNull('ANNUALLY') ?? baseAnnual,
      rawAmount: annualFinal,
      price: `${annualFinal.toLocaleString()} BDT`,
      period: 'per year',
      description: 'Best choice for established independent doctors and clinics.',
      features: ['Best Yearly Value', 'All Premium Features', 'Priority 24/7 Support', 'Multi-Staff Linking'],
      highlight: user?.planType === 'ANNUALLY',
    },
    {
      id: 'LIFETIME',
      name: 'Lifetime Plan',
      originalAmount: getCustomPriceOrNull('LIFETIME') ?? baseLifetime,
      rawAmount: lifetimeFinal,
      price: `${lifetimeFinal.toLocaleString()} BDT`,
      period: 'one-time payment',
      description: 'Complete lifetime license with zero recurring subscription fees.',
      features: ['Lifetime Unlimited Access', 'All Future Updates', 'Dedicated Support Rep', 'Exclusive Customizations'],
      highlight: user?.planType === 'LIFETIME',
    },
  ];

  const handleCheckout = async (planId: string) => {
    setLoadingPlan(planId);
    setErrorMsg('');

    try {
      const response = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Securely redirect to SSLCommerz gateway interface (bKash, Nagad, Cards)
        window.location.href = data.url;
      } else {
        setErrorMsg(data.error || 'Failed to initialize payment gateway.');
        setLoadingPlan(null);
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
      setLoadingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
        <p className="text-sm">Loading Subscription Options...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6 font-sans text-slate-100">
      <div className="max-w-4xl w-full text-center mb-10">

        {/* Promotional Banner (Appears if global or user-specific discount is active) */}
        {discountPct > 0 && (
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-400/40 p-4 rounded-2xl shadow-xl flex items-center justify-between text-left">
            <div>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {user?.userSpecificOfferTitle ? 'Special Offer For You' : 'Promotional Discount Active'}
              </span>
              <h2 className="text-base font-extrabold text-white mt-1">
                {offerTitle || 'Limited Time Promotional Discount'}
              </h2>
              <p className="text-xs text-blue-100">
                Enjoy a customized -{discountPct}% price reduction across plans.
              </p>
            </div>
            <div className="bg-white text-blue-900 px-4 py-2 rounded-xl font-black text-sm shadow">
              -{discountPct}% OFF
            </div>
          </div>
        )}

        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Choose Your Chamber Subscription
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Your free trial or active subscription has expired. Select a plan below to process payment securely through bKash, Nagad, Rocket, or Cards.
        </p>

        {/* Helper option to switch account or log out if stuck */}
        <div className="mt-4">
          <a
            href="/login"
            className="text-xs text-slate-400 hover:text-slate-200 underline transition"
          >
            Log out or switch account
          </a>
        </div>

        {errorMsg && (
          <p className="mt-4 text-xs font-semibold text-rose-400 bg-rose-950/50 border border-rose-800 py-2.5 px-4 rounded-xl max-w-lg mx-auto shadow-inner">
            {errorMsg}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full">
        {plans.map((p) => {
          const hasCustomPrice = getCustomPriceOrNull(p.id) !== null;
          return (
            <div
              key={p.id}
              className={`rounded-2xl bg-slate-800 p-6 flex flex-col justify-between border relative shadow-xl ${
                p.highlight ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-700'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white">
                  {user?.planType === p.id ? 'Assigned Plan' : 'Most Popular'}
                </span>
              )}
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  {discountPct > 0 && (
                    <span className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      -{discountPct}%
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-col">
                  {discountPct > 0 || hasCustomPrice ? (
                    <>
                      <span className="text-xs text-slate-400 line-through">
                        {p.originalAmount.toLocaleString()} BDT
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-2xl font-extrabold tracking-tight text-white">
                          {p.price}
                        </span>
                        <span className="text-xs text-slate-400">/ {p.period}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold tracking-tight text-white">
                        {p.price}
                      </span>
                      <span className="text-xs text-slate-400">/ {p.period}</span>
                    </div>
                  )}
                </div>

                <p className="mt-4 text-xs text-slate-400 leading-relaxed">{p.description}</p>
                <ul className="mt-6 space-y-2 text-xs text-slate-300">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-center">
                      <span className="text-blue-400 mr-2">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => handleCheckout(p.id)}
                  disabled={loadingPlan !== null}
                  className={`w-full rounded-xl py-3 text-xs font-semibold text-white transition cursor-pointer shadow-md ${
                    p.highlight
                      ? 'bg-blue-600 hover:bg-blue-500'
                      : 'bg-slate-700 hover:bg-slate-600'
                  } disabled:opacity-50`}
                >
                  {loadingPlan === p.id ? 'Connecting to Gateway...' : 'Pay with SSLCommerz'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}