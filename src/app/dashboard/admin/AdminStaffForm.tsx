// src/app/dashboard/admin/AdminStaffForm.tsx
'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createStaffAction } from './actions';

export default function AdminStaffForm() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  // Global Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Sync with global sidebar theme on load
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'dark');
    }

    // Listen for global theme switches from the sidebar
    const handleThemeChange = () => {
      const current = localStorage.getItem('app-theme');
      if (current !== null) {
        setIsDarkMode(current === 'dark');
      }
    };

    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createStaffAction(formData);
      if (result.success) {
        setMessage({ success: true, text: 'Staff account created successfully!' });
        formRef.current?.reset();
        router.refresh();
      } else {
        setMessage({ success: false, text: result.error || 'Failed to create staff account.' });
      }
    });
  };

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 shadow-lg space-y-4 transition-colors ${
      isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
    }`}>
      <h2 className={`text-xs sm:text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
        Add New Staff Member
      </h2>

      {message && (
        <div className={`p-3 rounded-xl text-xs ${message.success ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
          {message.text}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          required
          className={`border rounded-xl px-4 min-h-[44px] text-xs focus:outline-none focus:border-blue-500 ${
            isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
          }`}
        />
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          required
          className={`border rounded-xl px-4 min-h-[44px] text-xs focus:outline-none focus:border-blue-500 ${
            isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
          }`}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          className={`border rounded-xl px-4 min-h-[44px] text-xs focus:outline-none focus:border-blue-500 ${
            isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
          }`}
        />
        <select
          name="role"
          required
          className={`border rounded-xl px-4 min-h-[44px] text-xs focus:outline-none focus:border-blue-500 ${
            isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
          }`}
        >
          <option value="">Select Role *</option>
          <option value="ADMIN">Admin</option>
          <option value="DOCTOR">Doctor</option>
          <option value="RECEPTIONIST">Receptionist</option>
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs px-5 min-h-[44px] rounded-xl transition shadow-lg w-full sm:col-span-2 lg:col-span-4 lg:w-auto lg:justify-self-start flex items-center justify-center cursor-pointer"
        >
          {isPending ? 'Creating Account...' : '+ Create Staff Account'}
        </button>
      </form>
    </div>
  );
}