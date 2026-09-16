// src/app/dashboard/assigned-admin/staff/[id]/StaffDetailClient.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface StaffDetailClientProps {
  staff: any;
  isDoctor: boolean;
  isReceptionist: boolean;
  doctorVisits: any[];
  totalCollected: number;
  dailyEarnings: number;
  annualEarnings: number;
  totalDues: number;
  receptionistConnections: any[];
  receptionistActivity: any[];
}

export default function StaffDetailClient({
  staff,
  isDoctor,
  isReceptionist,
  doctorVisits,
  totalCollected,
  dailyEarnings,
  annualEarnings,
  totalDues,
  receptionistConnections,
  receptionistActivity,
}: StaffDetailClientProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Function to check and update theme from localStorage
    const updateThemeFromStorage = () => {
      const savedTheme = localStorage.getItem('app-theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    };

    // Run on initial mount
    updateThemeFromStorage();

    // 1. Listen to custom window events (try both common naming conventions)
    window.addEventListener('theme-change', updateThemeFromStorage);
    window.addEventListener('app-theme-changed', updateThemeFromStorage);

    // 2. Listen to native storage events
    window.addEventListener('storage', updateThemeFromStorage);

    // 3. Fallback polling mechanism: catches theme toggles instantly if the sidebar doesn't dispatch events
    const interval = setInterval(updateThemeFromStorage, 200);

    return () => {
      window.removeEventListener('theme-change', updateThemeFromStorage);
      window.removeEventListener('app-theme-changed', updateThemeFromStorage);
      window.removeEventListener('storage', updateThemeFromStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 p-6 space-y-6 max-w-7xl mx-auto ${
      isDarkMode ? 'bg-[#0b132b] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Navigation Header */}
      <div className="flex justify-between items-center">
        <div>
          <Link
            href="/dashboard/assigned-admin"
            className="text-xs text-blue-400 hover:underline mb-1 inline-block"
          >
            ← Back to Administrative Dashboard
          </Link>
          <h1 className="text-2xl font-bold">{staff.name}&apos;s Operational Profile</h1>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Viewing records and professional data under your administrative oversight.
          </p>
        </div>

        <span className="text-xs px-3 py-1 rounded-full font-semibold bg-purple-900/40 text-purple-300 border border-purple-600/30">
          Role: {staff.role}
        </span>
      </div>

      {/* Profile Overview Card */}
      <div className={`border rounded-2xl p-6 shadow-lg grid grid-cols-1 md:grid-cols-4 gap-6 items-center transition-colors ${
        isDarkMode ? 'bg-[#1c2541] border-blue-500/30' : 'bg-white border-blue-200'
      }`}>
        <div className="flex flex-col items-center md:items-start space-y-3">
          {staff.avatarUrl ? (
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500/40">
              <Image src={staff.avatarUrl} alt={staff.name} fill className="object-cover" />
            </div>
          ) : (
            <div className={`w-24 h-24 rounded-full border-2 flex items-center justify-center text-xl font-bold ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              {staff.name ? staff.name.charAt(0) : 'U'}
            </div>
          )}
        </div>

        <div className={`md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border ${
          isDarkMode ? 'bg-[#131b2e] border-slate-700/60' : 'bg-slate-50 border-slate-200'
        }`}>
          <div>
            <span className={`text-[10px] uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Full Name</span>
            <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{staff.name}</span>
          </div>
          <div>
            <span className={`text-[10px] uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Email Address</span>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{staff.email}</span>
          </div>
          <div>
            <span className={`text-[10px] uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Professional Position</span>
            <span className="text-sm font-semibold text-emerald-400">{staff.position || 'Not specified'}</span>
          </div>
          <div>
            <span className={`text-[10px] uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phone Number</span>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{staff.phone || 'N/A'}</span>
          </div>
          {staff.degrees && (
            <div className="sm:col-span-2">
              <span className={`text-[10px] uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Degrees & Qualifications</span>
              <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{staff.degrees}</span>
            </div>
          )}
        </div>
      </div>

      {/* ================= DOCTOR SPECIFIC VIEW ================= */}
      {isDoctor && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className={`border rounded-2xl p-5 shadow-lg ${isDarkMode ? 'bg-[#1c2541] border-emerald-500/30' : 'bg-white border-emerald-200'}`}>
              <span className={`text-[10px] uppercase block tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Daily Earn</span>
              <span className="text-xl font-black text-emerald-400 mt-1 block">৳ {dailyEarnings.toLocaleString()}</span>
              <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Collected today.</p>
            </div>

            <div className={`border rounded-2xl p-5 shadow-lg ${isDarkMode ? 'bg-[#1c2541] border-purple-500/30' : 'bg-white border-purple-200'}`}>
              <span className={`text-[10px] uppercase block tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Annual Earn</span>
              <span className="text-xl font-black text-purple-400 mt-1 block">৳ {annualEarnings.toLocaleString()}</span>
              <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>This calendar year.</p>
            </div>

            <div className={`border rounded-2xl p-5 shadow-lg ${isDarkMode ? 'bg-[#1c2541] border-blue-500/30' : 'bg-white border-blue-200'}`}>
              <span className={`text-[10px] uppercase block tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Collected</span>
              <span className="text-xl font-black text-blue-400 mt-1 block">৳ {totalCollected.toLocaleString()}</span>
              <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Lifetime collections.</p>
            </div>

            <div className={`border rounded-2xl p-5 shadow-lg ${isDarkMode ? 'bg-[#1c2541] border-amber-500/30' : 'bg-white border-amber-200'}`}>
              <span className={`text-[10px] uppercase block tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Market Dues</span>
              <span className="text-xl font-black text-amber-400 mt-1 block">৳ {totalDues.toLocaleString()}</span>
              <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pending payments.</p>
            </div>

            <div className={`border rounded-2xl p-5 shadow-lg ${isDarkMode ? 'bg-[#1c2541] border-slate-700' : 'bg-white border-slate-200'}`}>
              <span className={`text-[10px] uppercase block tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Consultations</span>
              <span className={`text-xl font-black mt-1 block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{doctorVisits.length} Records</span>
              <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total visits.</p>
            </div>
          </div>

          <div className={`border rounded-2xl p-6 shadow-lg space-y-4 ${isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Patient Consultation History</h2>

            {doctorVisits.length === 0 ? (
              <p className={`text-xs py-4 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No patient histories or appointments recorded yet for this doctor.</p>
            ) : (
              <div className="space-y-3">
                {doctorVisits.map((visit) => (
                  <div key={visit.id} className={`border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    isDarkMode ? 'bg-[#131b2e] border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Patient: {visit.patient?.name || 'General Patient'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-blue-900/40 text-blue-300 border border-blue-600/30">
                          {visit.status || 'Completed'}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Diagnosis:</span> {visit.diagnosis || 'Routine consultation checkup.'}
                      </p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <div className="text-xs font-bold text-emerald-400">Collected: ৳ {visit.feePaid ?? visit.consultationFee ?? 0}</div>
                      <div className="text-[11px] font-semibold text-amber-400">Dues: ৳ {visit.dues ?? 0}</div>
                      <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(visit.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= RECEPTIONIST SPECIFIC VIEW ================= */}
      {isReceptionist && (
        <div className="space-y-6">
          <div className={`border rounded-2xl p-6 shadow-lg space-y-4 ${isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Connected Doctors Assigned to this Receptionist</h2>

            {receptionistConnections.length === 0 ? (
              <p className={`text-xs py-4 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>This receptionist is not currently connected to any doctors.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {receptionistConnections.map((conn) => (
                  <div key={conn.id} className={`border rounded-xl p-4 space-y-2 ${isDarkMode ? 'bg-[#131b2e] border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-start">
                      <h3 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{conn.doctor?.name || 'Doctor'}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-600/30">
                        Partnered Doctor
                      </span>
                    </div>
                    <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{conn.doctor?.email || 'No email'}</p>
                    <p className={`text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Position: {conn.doctor?.position || 'Doctor'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`border rounded-2xl p-6 shadow-lg space-y-4 ${isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Clinic Visits Handled Under Partnered Doctors</h2>

            {receptionistActivity.length === 0 ? (
              <p className={`text-xs py-4 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No patient visits recorded yet for this receptionist&apos;s connected doctors.</p>
            ) : (
              <div className="space-y-3">
                {receptionistActivity.map((act) => (
                  <div key={act.id} className={`border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    isDarkMode ? 'bg-[#131b2e] border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Doctor: {act.doctor?.name || 'Unassigned'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-purple-900/40 text-purple-300 border border-purple-600/30">
                          {act.status || 'Scheduled'}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Diagnosis / Symptoms:</span> {act.diagnosis || act.symptoms || 'Standard intake registered.'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Patient: {act.patient?.name || 'Walk-in'}</span>
                      <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(act.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}