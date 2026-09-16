// src/app/dashboard/assigned-admin/AssignedAdminPortalContent.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateConnectionStatus } from './actions';

export default function AssignedAdminPortalContent({ currentUser }: { currentUser: any }) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this staff member?')) return;
    setLoadingId(connectionId);
    try {
      await updateConnectionStatus(connectionId, 'REJECTED');
    } catch (err) {
      console.error('Failed to disconnect:', err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className={`p-6 space-y-6 max-w-7xl mx-auto transition-colors duration-300 min-h-screen ${
      isDarkMode ? 'bg-[#0b132b] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Header & Global Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Assigned Admin Operational Portal</h1>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage daily clinic activities, scheduling, and operational boundaries.
          </p>
        </div>

        {/* Header Actions: Theme Toggle, Account Settings & Logout */}
        <div className="flex items-center gap-3">
          {/* Theme Change Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`text-xs font-medium px-3 py-2 rounded-xl transition cursor-pointer border shadow-md flex items-center gap-1.5 ${
              isDarkMode
                ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>

          <Link
            href="/dashboard/assigned-admin/account"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2 rounded-xl transition cursor-pointer shadow-lg"
          >
            Account & Profile
          </Link>

          <form action={async () => {
            'use server';
            // Handled via server action or cookie clearance if embedded
          }}>
            <button
              type="submit"
              className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-medium px-4 py-2 rounded-xl transition cursor-pointer shadow-lg"
            >
              Logout
            </button>
          </form>
        </div>
      </div>

      {/* Operational Overview Card */}
      <div className={`border rounded-2xl p-6 shadow-lg transition-colors ${
        isDarkMode ? 'bg-[#1c2541] border-blue-500/30' : 'bg-white border-blue-200'
      }`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-400 mb-2">Operational Dashboard</h2>
        <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          Welcome back, {currentUser.name}. You have standard administrative access to manage clinic workflows.
        </p>

        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border transition-colors ${
          isDarkMode ? 'bg-[#131b2e] border-slate-700/60' : 'bg-slate-100 border-slate-200'
        }`}>
          <div>
            <span className={`text-[10px] uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Position / Role</span>
            <span className="text-sm font-bold text-emerald-400">
              {currentUser.role === 'ADMIN' ? 'Assigned Administrator' : (currentUser.position || 'Assigned Administrator')}
            </span>
          </div>
          <div>
            <span className={`text-[10px] uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active Staff Boundaries</span>
            <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              {currentUser.adminConnections.filter((c: any) => c.status === 'APPROVED').length} Staff Members Connected
            </span>
          </div>
          <div>
            <span className={`text-[10px] uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status</span>
            <span className="text-sm font-bold text-blue-300">Active & Authorized</span>
          </div>
        </div>
      </div>

      {/* Currently Managed Staff Section */}
      <div className={`border rounded-2xl p-6 shadow-lg space-y-4 transition-colors ${
        isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Your Connected Staff Members
        </h2>

        {currentUser.adminConnections.length === 0 ? (
          <p className={`text-xs py-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            You have not connected with any staff members yet. Use your Account & Profile page to search and send connection requests.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentUser.adminConnections.map((conn: any) => (
              <div key={conn.id} className={`border rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors ${
                isDarkMode ? 'bg-[#131b2e] border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{conn.target.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-purple-900/40 text-purple-300 border border-purple-600/30">
                      {conn.target.role}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{conn.target.email}</p>
                  <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Position: {conn.target.position || 'N/A'}</p>
                </div>

                {/* Action Hub / Data Access */}
                <div className={`space-y-2 pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold ${
                      conn.status === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {conn.status === 'APPROVED' ? '● Active Connection' : '● Pending Approval'}
                    </span>

                    <button
                      onClick={() => handleDisconnect(conn.id)}
                      disabled={loadingId === conn.id}
                      className="text-rose-400 hover:text-rose-300 text-xs font-medium transition cursor-pointer bg-transparent disabled:opacity-50"
                    >
                      {loadingId === conn.id ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>

                  {conn.status === 'APPROVED' && (
                    <Link
                      href={`/dashboard/assigned-admin/staff/${conn.target.id}`}
                      className="w-full mt-2 block text-center bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-medium py-1.5 rounded-lg transition"
                    >
                      View Staff Data & Records →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}