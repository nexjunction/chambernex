// src/app/dashboard/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getClinicStaffAction, deleteUserAction } from './actions';
import AdminStaffForm from './AdminStaffForm';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string | Date;
}

const PROTECTED_SUPER_ADMIN_EMAILS = [
  'nexjunction@gmail.com',
];

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Multi-select & Bulk Deletion State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Global Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

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

  useEffect(() => {
    async function fetchStaff() {
      try {
        const res = await getClinicStaffAction();
        if (res.success && res.staff) {
          setStaffList(res.staff);
        } else {
          setFetchError(res.error || 'Failed to fetch staff directory.');
        }
      } catch (err) {
        setFetchError('An unexpected error occurred while fetching staff.');
      } finally {
        setLoading(false);
      }
    }

    fetchStaff();
  }, []);

  // Helper to check if a user is a protected super admin
  const isProtectedAdmin = (email: string) => {
    return PROTECTED_SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
  };

  // Selection handlers (Excludes protected accounts from selection)
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const deletableIds = staffList
        .filter((s) => !isProtectedAdmin(s.email))
        .map((s) => s.id);
      setSelectedIds(deletableIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, email: string) => {
    if (isProtectedAdmin(email)) return; // Prevent selecting super admin

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Single Delete Handler
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    setFetchError(null);
    setActionMessage(null);

    const res = await deleteUserAction(userToDelete.id);
    if (res.success) {
      setStaffList(staffList.filter((staff) => staff.id !== userToDelete.id));
      setSelectedIds(selectedIds.filter((id) => id !== userToDelete.id));
      setActionMessage(`Successfully deleted user "${userToDelete.name}".`);
      setUserToDelete(null);
    } else {
      setFetchError(res.error || 'Failed to delete user.');
      setUserToDelete(null);
    }
    setIsDeleting(false);
  };

  // Bulk Delete Handler
  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;

    setIsBulkDeleting(true);
    setFetchError(null);
    setActionMessage(null);

    let successCount = 0;
    let failedMsg = '';

    for (const id of selectedIds) {
      const res = await deleteUserAction(id);
      if (res.success) {
        successCount++;
      } else {
        failedMsg = res.error || 'Some users could not be deleted.';
      }
    }

    setStaffList(staffList.filter((staff) => !selectedIds.includes(staff.id)));
    setSelectedIds([]);
    setShowBulkConfirm(false);
    setIsBulkDeleting(false);

    if (successCount > 0) {
      setActionMessage(`Successfully deleted ${successCount} user(s) permanently.`);
    }
    if (failedMsg) {
      setFetchError(failedMsg);
    }
  };

  const deletableStaffList = staffList.filter((s) => !isProtectedAdmin(s.email));

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDarkMode ? 'bg-[#0b132b] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <header className={`border-b px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-md transition-colors ${
        isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-wide">Super Admin & Clinic Control Portal</h1>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage platform-wide staff members, subscriptions, and administrative oversight.</p>
        </div>
        <form action="/login" method="POST" className="w-full sm:w-auto">
          <button
            type="submit"
            className="w-full sm:w-auto bg-rose-600/25 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-medium px-4 min-h-[44px] rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center"
          >
            Logout
          </button>
        </form>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Subscription & Privacy Control Card */}
        <div className={`border rounded-2xl p-5 sm:p-6 shadow-lg transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
          isDarkMode ? 'bg-[#1c2541] border-blue-500/30' : 'bg-white border-blue-200'
        }`}>
          <div>
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-blue-400 mb-2">Master Platform Oversight & Privacy Policy</h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>You have permanent platform-wide administrative control with strict data separation boundaries.</p>
          </div>
          <a
            href="/dashboard/admin/subscriptions"
            className="w-full md:w-auto rounded-xl bg-blue-600 hover:bg-blue-500 px-4 min-h-[44px] text-xs font-semibold text-white transition shadow-lg shrink-0 flex items-center justify-center gap-2"
          >
            <span>Manage Subscriptions & Approvals</span>
            <span className="bg-blue-700 px-2 py-0.5 rounded-md text-[10px]">Verify TrxID</span>
          </a>
        </div>

        {/* Feedback Banners */}
        {actionMessage && (
          <div className="p-3 rounded-xl text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {actionMessage}
          </div>
        )}
        {fetchError && (
          <div className="p-3 rounded-xl text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30">
            ⚠️ {fetchError}
          </div>
        )}

        <AdminStaffForm />

        {/* Staff List Table */}
        <div className={`border rounded-2xl p-4 sm:p-6 shadow-lg transition-colors relative ${
          isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className={`text-xs sm:text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              Clinic Staff Directory
            </h2>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 bg-rose-950/60 border border-rose-500/40 px-4 py-2 rounded-xl shadow-md">
                <span className="text-xs text-rose-200 font-medium">
                  {selectedIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setShowBulkConfirm(true)}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 min-h-[36px] rounded-lg transition shadow cursor-pointer"
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <p className={`text-xs py-6 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading staff directory...</p>
          ) : staffList.length === 0 ? (
            <p className={`text-xs py-6 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No staff members found.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-xs uppercase ${
                      isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                    }`}>
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all deletable staff members"
                          checked={deletableStaffList.length > 0 && selectedIds.length === deletableStaffList.length}
                          onChange={handleSelectAll}
                          className="rounded bg-slate-900 border-slate-700 text-blue-600 h-4 w-4 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Added On</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                    {staffList.map((staff) => {
                      const isSelected = selectedIds.includes(staff.id);
                      const protectedUser = isProtectedAdmin(staff.email);

                      return (
                        <tr key={staff.id} className={`transition ${
                          isSelected
                            ? (isDarkMode ? 'bg-blue-950/30' : 'bg-blue-50')
                            : (isDarkMode ? 'hover:bg-[#131b2e]/50' : 'hover:bg-slate-50')
                        }`}>
                          <td className="py-3 px-4">
                            {!protectedUser ? (
                              <input
                                type="checkbox"
                                aria-label={`Select ${staff.name}`}
                                checked={isSelected}
                                onChange={() => handleSelectOne(staff.id, staff.email)}
                                className="rounded bg-slate-900 border-slate-700 text-blue-600 h-4 w-4 cursor-pointer"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-500" title="Protected Master Account">🔒</span>
                            )}
                          </td>
                          <td className={`py-3 px-4 font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {staff.name} {protectedUser && <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">Super Admin</span>}
                          </td>
                          <td className={`py-3 px-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{staff.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${
                              staff.role === 'ADMIN'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : staff.role === 'DOCTOR'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            }`}>
                              {staff.role}
                            </span>
                          </td>
                          <td className={`py-3 px-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {new Date(staff.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!protectedUser ? (
                              <button
                                type="button"
                                onClick={() => setUserToDelete({ id: staff.id, name: staff.name })}
                                className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 px-3 min-h-[36px] rounded-lg font-semibold transition cursor-pointer"
                              >
                                Delete
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Protected</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {staffList.map((staff) => {
                  const isSelected = selectedIds.includes(staff.id);
                  const protectedUser = isProtectedAdmin(staff.email);

                  return (
                    <div
                      key={staff.id}
                      className={`border rounded-xl p-4 space-y-3 transition ${
                        isSelected
                          ? (isDarkMode ? 'bg-blue-950/30 border-blue-500/40' : 'bg-blue-50 border-blue-300')
                          : (isDarkMode ? 'bg-[#131b2e]/60 border-slate-700/60' : 'bg-slate-50 border-slate-200')
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {!protectedUser ? (
                            <input
                              type="checkbox"
                              aria-label={`Select ${staff.name}`}
                              checked={isSelected}
                              onChange={() => handleSelectOne(staff.id, staff.email)}
                              className="rounded bg-slate-900 border-slate-700 text-blue-600 h-5 w-5 cursor-pointer"
                            />
                          ) : (
                            <span className="text-xs" title="Protected Master Account">🔒</span>
                          )}
                          <div>
                            <span className={`text-sm font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {staff.name} {protectedUser && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded ml-1">Master</span>}
                            </span>
                            <span className={`text-xs block break-all ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{staff.email}</span>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${
                          staff.role === 'ADMIN'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : staff.role === 'DOCTOR'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {staff.role}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-[11px]">
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                          Added: {new Date(staff.createdAt).toLocaleDateString()}
                        </span>
                        {!protectedUser ? (
                          <button
                            type="button"
                            onClick={() => setUserToDelete({ id: staff.id, name: staff.name })}
                            className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 px-3 min-h-[36px] rounded-lg font-semibold transition cursor-pointer"
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-slate-500 italic">Cannot Delete Super Admin</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Single Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-[#1c2541] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-start space-x-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full border border-rose-500/30 shrink-0 text-base">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-wider">Confirm Permanent Deletion</h3>
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Are you sure you want to permanently delete <span className="font-bold text-rose-400">{userToDelete.name}</span> from the database? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className={`w-full sm:w-auto rounded-xl px-4 min-h-[44px] text-xs font-semibold transition cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-full sm:w-auto rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 px-4 min-h-[44px] text-xs font-semibold text-white transition shadow-lg cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-[#1c2541] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-start space-x-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full border border-rose-500/30 shrink-0 text-base">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-wider">Confirm Bulk Deletion</h3>
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Are you sure you want to permanently delete <span className="font-bold text-rose-400">{selectedIds.length} selected user(s)</span> from the database? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => setShowBulkConfirm(false)}
                disabled={isBulkDeleting}
                className={`w-full sm:w-auto rounded-xl px-4 min-h-[44px] text-xs font-semibold transition cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                disabled={isBulkDeleting}
                className="w-full sm:w-auto rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 px-4 min-h-[44px] text-xs font-semibold text-white transition shadow-lg cursor-pointer"
              >
                {isBulkDeleting ? 'Deleting Selected...' : `Yes, Delete ${selectedIds.length} User(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}