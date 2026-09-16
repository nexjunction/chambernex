// src/app/dashboard/admin/settings/AdminSettingsClient.tsx
'use client';

import { useState, useTransition, useEffect } from 'react';
import { updateAdminProfileAction } from '../actions';
import { useRouter } from 'next/navigation';

interface AdminSettingsClientProps {
  currentUser: {
    name: string;
    email: string;
  };
}

export default function AdminSettingsClient({ currentUser }: AdminSettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);
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
      const result = await updateAdminProfileAction(formData);
      if (result.success) {
        setMessage({ success: true, text: 'Profile and credentials updated successfully!' });
      } else {
        setMessage({ success: false, text: result.error || 'Failed to update profile.' });
      }
    });
  };

  const handleLogout = async () => {
    document.cookie = 'userEmail=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/login');
    router.refresh();
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDarkMode ? 'bg-[#0b132b] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <header className={`border-px px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md transition-colors ${
        isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-wide">Account Settings</h1>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage your master Super Admin credentials and platform security.</p>
        </div>
        <button
          onClick={handleLogout}
          type="button"
          className="w-full sm:w-auto bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-medium px-4 min-h-[40px] rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center"
        >
          Logout
        </button>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <div className={`border rounded-2xl p-4 sm:p-6 shadow-lg space-y-6 transition-colors ${
          isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
            Master Owner Profile
          </h2>

          {message && (
            <div className={`p-3.5 rounded-xl text-xs font-medium border ${message.success ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/50' : 'bg-rose-950/70 text-rose-400 border-rose-500/50'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] uppercase font-semibold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Full Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={currentUser.name}
                  required
                  className={`w-full border rounded-xl px-3.5 min-h-[44px] text-xs focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-[10px] uppercase font-semibold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={currentUser.email}
                  required
                  className={`w-full border rounded-xl px-3.5 min-h-[44px] text-xs focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className={`border-t pt-4 space-y-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                Change Password (Optional)
              </h3>

              <div>
                <label className={`block text-[10px] uppercase font-semibold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Current Password</label>
                <input
                  type="password"
                  name="oldPassword"
                  placeholder="Enter current password to authorize changes"
                  className={`w-full border rounded-xl px-3.5 min-h-[44px] text-xs focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] uppercase font-semibold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    placeholder="Enter new password"
                    className={`w-full border rounded-xl px-3.5 min-h-[44px] text-xs focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] uppercase font-semibold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Retype new password"
                    className={`w-full border rounded-xl px-3.5 min-h-[44px] text-xs focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Updating credentials will secure your active session.</p>
              <button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs px-6 min-h-[44px] rounded-xl transition shadow-lg cursor-pointer flex items-center justify-center"
              >
                {isPending ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}