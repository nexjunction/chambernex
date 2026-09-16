// src/app/dashboard/receptionist/ReceptionistConsoleClient.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerPatientAction } from './actions';

interface Doctor {
  id: string;
  name: string;
  degrees: string | null;
  position: string;
  subStatus?: string | null;
  trialEndsAt?: string | Date | null;
  subEndsAt?: string | Date | null;
}

export default function ReceptionistConsoleClient({ doctors }: { doctors: Doctor[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    const res = await registerPatientAction(formData);
    setLoading(false);

    if (res.success) {
      alert('Appointment booked successfully!');
      formElement.reset();
      setErrorMsg(null);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'An unexpected error occurred.');
    }
  }

  async function handleLogout() {
    try {
      router.push('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  }

  return (
    <div className={`min-h-[100dvh] flex flex-col transition-colors duration-300 pb-[env(safe-area-inset-bottom)] ${
      isDarkMode ? 'bg-[#0b132b] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header - Optimized for Mobile Wrap */}
      <header className={`border-px px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md transition-colors ${
        isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-wide">Receptionist Console</h1>
          <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Patient Intake & Phone Booking Desk</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end">
          <Link
            href="/dashboard/account"
            className={`border px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              isDarkMode
                ? 'bg-[#131b2e] hover:bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            👤 Account
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6">
        <form onSubmit={handleSubmit} className={`border rounded-2xl p-4 sm:p-6 shadow-lg space-y-6 transition-colors ${
          isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <h2 className={`text-base sm:text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Book Appointment / Register Patient</h2>
            <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Vitals are optional for phone bookings. Fill them in when the patient arrives at the chamber.</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-xs p-3 rounded-xl">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Section 1: Demographics */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">1. Patient Demographics & Doctor Assignment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  minLength={2}
                  placeholder="e.g. Rahat Khan"
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Phone Number (Unique) *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  pattern="^\+?[0-9]{10,15}$"
                  title="Numbers only, 10 to 15 digits (e.g. +8801700000000)"
                  placeholder="e.g. +8801700000000"
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Emergency Contact</label>
                <input
                  type="tel"
                  name="emergencyPhone"
                  pattern="^\+?[0-9]{10,15}$"
                  title="Numbers only, 10 to 15 digits"
                  placeholder="e.g. +8801800000000"
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Gender *</label>
                <select name="sex" className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Age *</label>
                <input
                  type="number"
                  name="age"
                  required
                  min={0}
                  max={120}
                  defaultValue={30}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div className="sm:col-span-2 md:col-span-1">
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Attending Doctor *</label>
                <select name="doctorId" required className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}>
                  <option value="">Select Doctor</option>
                  {doctors?.map((doc) => {
                    const status = doc.subStatus || 'TRIAL';
                    return (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} {doc.degrees ? `- ${doc.degrees}` : ''} [{status}]
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Vitals */}
          <div className={`space-y-4 pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">2. Initial Vitals Intake (Optional for Phone Bookings)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Blood Pressure</label>
                <input type="text" name="bloodPressure" placeholder="e.g. 120/80" className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`} />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Weight</label>
                <input type="text" name="weight" placeholder="e.g. 68 kg" className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`} />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Height</label>
                <input type="text" name="height" placeholder="e.g. 5 ft 7 in" className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`} />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Temp</label>
                <input type="text" name="temperature" placeholder="e.g. 98.6°F" className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Pulse</label>
                <input type="text" name="pulse" placeholder="e.g. 72 bpm" className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`} />
              </div>
            </div>
          </div>

          {/* Section 3: Billing */}
          <div className={`space-y-4 pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">3. Fee Collection & Billing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Consultation Fee (৳)</label>
                <input type="number" name="consultationFee" min={0} defaultValue={1000} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`} />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Amount Collected (৳)</label>
                <input type="number" name="feePaid" min={0} defaultValue={1000} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`} />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className={`pt-4 border-t flex justify-end ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 sm:py-2.5 rounded-xl text-sm transition shadow-lg disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {loading ? 'Processing Booking...' : 'Book Appointment / Register'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}