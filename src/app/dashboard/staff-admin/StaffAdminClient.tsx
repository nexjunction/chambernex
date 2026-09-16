'use client';

import { useState, useEffect } from 'react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  position: string | null;
}

interface ConnectionItem {
  id: string;
  status: string;
  initiatedBy: string;
  admin: AdminUser;
}

interface ClientProps {
  currentUser: {
    id: string;
    role: string;
  };
  currentConnection: ConnectionItem | null;
  adminSearchResults: AdminUser[];
  searchQuery: string;
  onRequestConnection: (adminId: string, staffId: string) => Promise<any>;
  onRemoveConnection: (connectionId: string) => Promise<any>;
  onAcceptConnection: (connectionId: string) => Promise<any>;
}

export default function StaffAdminClient({
  currentUser,
  currentConnection,
  adminSearchResults,
  searchQuery,
  onRequestConnection,
  onRemoveConnection,
  onAcceptConnection,
}: ClientProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'dark');
    }

    const handleThemeChange = () => {
      const current = localStorage.getItem('app-theme');
      if (current !== null) {
        setIsDarkMode(current === 'dark');
      }
    };

    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  return (
    <div className={`p-6 space-y-6 max-w-5xl mx-auto transition-colors duration-300 ${
      isDarkMode ? 'text-slate-100' : 'text-slate-900'
    }`}>
      <div>
        <h1 className="text-2xl font-bold">Administrative Connection</h1>
        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Connect with your assigned administrative manager to handle your clinic workflow.
        </p>
      </div>

      {/* Current Connection Status Card */}
      <div className={`border rounded-2xl p-6 shadow-lg space-y-4 transition-colors ${
        isDarkMode ? 'bg-[#1c2541] border-blue-500/30' : 'bg-white border-blue-200'
      }`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-400">Your Current Administrator</h2>

        {!currentConnection ? (
          <p className={`text-xs py-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            You are not currently connected to any administrator. Search below to find and connect with your admin.
          </p>
        ) : (
          <div className={`border rounded-xl p-4 flex justify-between items-center transition-colors ${
            isDarkMode ? 'bg-[#131b2e] border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {currentConnection.admin.name}
              </h3>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentConnection.admin.position || 'Assigned Administrator'} | {currentConnection.admin.email}
              </p>
              <div className="mt-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  currentConnection.status === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {currentConnection.status === 'APPROVED'
                    ? '● Connected & Active'
                    : currentConnection.initiatedBy === 'ADMIN'
                      ? '● Pending Your Approval'
                      : '● Request Pending Approval'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Case 1: Pending request from Admin -> Accept or Decline */}
              {currentConnection.status === 'PENDING' && currentConnection.initiatedBy === 'ADMIN' && (
                <>
                  <form action={async () => {
                    await onAcceptConnection(currentConnection.id);
                  }}>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition cursor-pointer shadow"
                    >
                      Accept
                    </button>
                  </form>

                  <form action={async () => {
                    await onRemoveConnection(currentConnection.id);
                  }}>
                    <button
                      type="submit"
                      className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-medium px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Decline
                    </button>
                  </form>
                </>
              )}

              {/* Case 2: Pending request sent BY Staff -> Allow cancelling own request */}
              {currentConnection.status === 'PENDING' && currentConnection.initiatedBy === 'STAFF' && (
                <form action={async () => {
                  await onRemoveConnection(currentConnection.id);
                }}>
                  <button
                    type="submit"
                    className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-medium px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    Cancel Request
                  </button>
                </form>
              )}

              {/* Case 3: Approved/Active Connection -> Staff CANNOT disconnect */}
              {currentConnection.status === 'APPROVED' && (
                <span className={`text-[11px] italic px-2 py-1 rounded ${
                  isDarkMode ? 'text-slate-400 bg-[#131b2e]' : 'text-slate-500 bg-slate-100'
                }`}>
                  Managed by Administrator
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search & Request Admin Section */}
      {!currentConnection && (
        <div className={`border rounded-2xl p-6 shadow-lg space-y-4 transition-colors ${
          isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Find Your Administrator
          </h2>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Search for your assigned admin by name, email, phone, or position.
          </p>

          <form method="GET" className="flex gap-2 max-w-xl">
            <input
              type="text"
              name="query"
              defaultValue={searchQuery}
              placeholder="Search admin name, email, phone..."
              className={`flex-1 border rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2 rounded-xl transition cursor-pointer shadow"
            >
              Search
            </button>
          </form>

          {searchQuery && (
            <div className="mt-4 space-y-2">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Search Results
              </h3>
              {adminSearchResults.length === 0 ? (
                <p className={`text-xs py-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  No administrators found matching your search.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {adminSearchResults.map((admin) => (
                    <div key={admin.id} className={`border rounded-xl p-4 flex justify-between items-center transition-colors ${
                      isDarkMode ? 'bg-[#131b2e] border-slate-700/60' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{admin.name}</h4>
                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {admin.position || 'Administrator'} | {admin.email}
                        </p>
                      </div>

                      <form action={async () => {
                        await onRequestConnection(admin.id, currentUser.id);
                      }}>
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition cursor-pointer shadow"
                        >
                          Connect
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}