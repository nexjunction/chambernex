// src/app/dashboard/account/AccountClient.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  updateAccountAction,
  verifyEmailUpdateAction,
  verifyPhoneUpdateAction,
  changePasswordAction,
  sendConnectionRequest,
  updateConnectionStatus,
  sendAdminConnectionRequest,
  updateAdminConnectionStatus
} from './actions';

interface ConnectionItem {
  id: string;
  status: string;
  initiatedBy: string;
  doctorId: string;
  receptionistId: string;
  doctor: {
    id: string;
    name: string;
    email: string;
    position: string;
    degrees: string | null;
  };
  receptionist: {
    id: string;
    name: string;
    email: string;
    position: string;
  };
}

interface AdminConnectionItem {
  id: string;
  status: string;
  initiatedBy: string;
  adminId: string;
  targetId: string;
  admin: {
    id: string;
    name: string;
    email: string;
    position: string | null;
  };
  target: {
    id: string;
    name: string;
    email: string;
    position: string;
  };
}

interface UserProps {
  user: {
    id: string;
    email: string;
    name: string;
    position: string;
    degrees: string | null;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
  };
  initialConnections: ConnectionItem[];
  initialAdminConnections?: AdminConnectionItem[];
}

export default function AccountClient({ user, initialConnections, initialAdminConnections = [] }: UserProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Global Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Profile Form States
  const [name, setName] = useState(user.name);
  const [position, setPosition] = useState(user.position);
  const [degrees, setDegrees] = useState(user.degrees || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');

  // OTP Verification States for Contact Changes
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpType, setOtpType] = useState<'EMAIL' | 'PHONE' | null>(null);
  const [otpCode, setOtpCode] = useState('');

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

  // Keep avatar synced if user prop updates
  useEffect(() => {
    setAvatarUrl(user.avatarUrl || '');
  }, [user.avatarUrl]);

  // Connection States (Doctor <-> Receptionist)
  const [connections, setConnections] = useState<ConnectionItem[]>(initialConnections);
  const [targetEmail, setTargetEmail] = useState('');
  const [connLoading, setConnLoading] = useState(false);
  const [connMessage, setConnMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Admin Connection States (Admin <-> Staff)
  const [adminConnections, setAdminConnections] = useState<AdminConnectionItem[]>(initialAdminConnections);
  const [adminTargetEmail, setAdminTargetEmail] = useState('');
  const [adminConnLoading, setAdminConnLoading] = useState(false);
  const [adminConnMessage, setAdminConnMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isDoctor = user.role === 'DOCTOR';
  const isAdmin = user.role === 'ADMIN';
  const targetRoleName = isDoctor ? 'receptionist' : 'doctor';

  const dashboardRoute = isAdmin
    ? '/dashboard/admin'
    : isDoctor
      ? '/dashboard/doctor'
      : '/dashboard/receptionist';

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set('userId', user.id);

    const newEmailInput = (formData.get('email') as string)?.trim() || '';
    const newPhoneInput = (formData.get('phone') as string)?.trim() || '';

    const res = await updateAccountAction(formData);

    setLoading(false);
    if (res.success) {
      setMessage({ success: true, text: res.message || 'Profile updated successfully!' });

      if (res.requiresOtp) {
        setRequiresOtp(true);
        if (newEmailInput && newEmailInput !== user.email) {
          setOtpType('EMAIL');
        } else if (newPhoneInput && newPhoneInput !== user.phone) {
          setOtpType('PHONE');
        }
      } else {
        router.refresh();
      }
    } else {
      setMessage({ success: false, text: res.error || 'Failed to update profile.' });
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    const formData = new FormData();
    formData.set('userId', user.id);
    formData.set('currentPassword', currentPassword);
    formData.set('newPassword', newPassword);
    formData.set('confirmPassword', confirmPassword);

    const res = await changePasswordAction(formData);

    setPasswordLoading(false);
    if (res.success) {
      setPasswordMessage({ success: true, text: res.message || 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMessage({ success: false, text: res.error || 'Failed to update password.' });
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = otpType === 'EMAIL'
      ? await verifyEmailUpdateAction(user.id, otpCode)
      : await verifyPhoneUpdateAction(user.id, otpCode);

    setLoading(false);
    if (res.success) {
      setMessage({ success: true, text: res.message || 'Verified and updated successfully!' });
      setRequiresOtp(false);
      setOtpCode('');
      router.refresh();
    } else {
      setMessage({ success: false, text: res.error || 'Verification failed.' });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const localPreviewUrl = URL.createObjectURL(file);
      setAvatarUrl(localPreviewUrl);
    }
  }

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!targetEmail.trim()) return;

    setConnLoading(true);
    setConnMessage(null);

    const res = await sendConnectionRequest(user.id, user.role, targetEmail.trim());
    setConnLoading(false);

    if (res.success) {
      setConnMessage({ text: res.message || 'Connection request sent!', type: 'success' });
      setTargetEmail('');
      router.refresh();
    } else {
      setConnMessage({ text: res.error || 'Failed to send request.', type: 'error' });
    }
  }

  async function handleStatusChange(connectionId: string, status: 'APPROVED' | 'REJECTED') {
    const res = await updateConnectionStatus(connectionId, status);
    if (res.success) {
      setConnections((prev) =>
        prev.map((c) => (c.id === connectionId ? { ...c, status } : c))
      );
      router.refresh();
    } else {
      alert(res.error || 'Failed to update request status.');
    }
  }

  async function handleSendAdminRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!adminTargetEmail.trim()) return;

    setAdminConnLoading(true);
    setAdminConnMessage(null);

    const res = await sendAdminConnectionRequest(user.id, user.role, adminTargetEmail.trim());
    setAdminConnLoading(false);

    if (res.success) {
      setAdminConnMessage({ text: res.message || 'Administrative connection request sent!', type: 'success' });
      setAdminTargetEmail('');
      router.refresh();
    } else {
      setAdminConnMessage({ text: res.error || 'Failed to send request.', type: 'error' });
    }
  }

  async function handleAdminStatusChange(connectionId: string, status: 'APPROVED' | 'REJECTED') {
    const res = await updateAdminConnectionStatus(connectionId, status);
    if (res.success) {
      setAdminConnections((prev) =>
        prev.map((c) => (c.id === connectionId ? { ...c, status } : c))
      );
      router.refresh();
    } else {
      alert(res.error || 'Failed to update request status.');
    }
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDarkMode ? 'bg-[#0b132b] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <header className={`border-b px-6 py-4 flex items-center justify-between shadow-md transition-colors ${
        isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <h1 className="text-xl font-bold tracking-wide">Account & Staff Network</h1>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage your profile, credentials, security, and professional working connections</p>
        </div>
        <Link
          href={dashboardRoute}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow"
        >
          Back to Dashboard
        </Link>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-6">
        {/* Top Section: Profile Preview & Edit Form / OTP Verification Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card Preview */}
          <div className={`border rounded-2xl p-6 shadow-lg flex flex-col items-center text-center h-fit space-y-4 transition-colors ${
            isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`w-24 h-24 rounded-full border-2 border-blue-500 overflow-hidden flex items-center justify-center shadow-inner ${
              isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
            }`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className={`text-3xl font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{name}</h2>
              <p className="text-xs text-blue-400 font-medium">{position}</p>
              {degrees && <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{degrees}</p>}
            </div>
            <div className={`w-full pt-4 border-t text-left space-y-1 text-xs ${
              isDarkMode ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
            }`}>
              <p><b>Role:</b> <span className="uppercase text-emerald-400">{user.role}</span></p>
              <p><b>Email:</b> {email}</p>
              <p><b>Phone:</b> {phone || 'Not specified'}</p>
            </div>
          </div>

          {/* Edit Form or OTP Verification Panel */}
          <div className={`md:col-span-2 border rounded-2xl p-6 shadow-lg transition-colors ${
            isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {!requiresOtp ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <h2 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-700'
                }`}>Edit Information</h2>

                {message && (
                  <div
                    className={`text-xs p-3 rounded-xl border ${
                      message.success
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-red-500/20 border-red-500/50 text-red-300'
                    }`}
                  >
                    {message.success ? '✅ ' : '⚠️ '} {message.text}
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Position / Title *</label>
                    <input
                      type="text"
                      name="position"
                      required
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="e.g. Consulting Specialist"
                      className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                        isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Degrees & Qualifications</label>
                    <input
                      type="text"
                      name="degrees"
                      value={degrees}
                      onChange={(e) => setDegrees(e.target.value)}
                      placeholder="e.g. MBBS, FCPS"
                      className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                        isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Phone Number <span className="text-[10px] text-amber-400 font-normal">(Changes require OTP)</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+8801700000000"
                      className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                        isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Profile Picture File</label>
                    <input
                      type="file"
                      name="avatarFile"
                      accept="image/*"
                      onChange={handleFileChange}
                      className={`w-full border rounded-xl px-3 py-1.5 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 focus:outline-none cursor-pointer ${
                        isDarkMode ? 'bg-[#131b2e] border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Email Address <span className="text-[10px] text-amber-400 font-normal">(Changes require OTP)</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className={`pt-4 border-t flex justify-end ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition shadow-lg disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            ) : (
              /* OTP Verification Box */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                    🔐 Verify New {otpType === 'EMAIL' ? 'Email Address' : 'Phone Number'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setRequiresOtp(false)}
                    className="text-xs text-slate-400 hover:underline"
                  >
                    Cancel
                  </button>
                </div>

                {message && (
                  <div className={`text-xs p-3 rounded-xl border ${
                    message.success ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-red-500/20 border-red-500/50 text-red-300'
                  }`}>
                    {message.text}
                  </div>
                )}

                <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  A 6-digit verification code has been dispatched to your new {otpType?.toLowerCase()}. If running in development mode, check your server terminal console.
                </p>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Enter 6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className={`w-full border rounded-xl px-4 py-3 text-center tracking-widest text-lg font-bold focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className={`pt-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setRequiresOtp(false)}
                    className={`px-4 py-2.5 rounded-xl text-sm transition border ${
                      isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition shadow-lg disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify & Confirm Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Password Update Section */}
        <div className={`border rounded-2xl p-6 shadow-lg transition-colors ${
          isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h2 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-700'
          }`}>Change Password</h2>

          {passwordMessage && (
            <div
              className={`text-xs p-3 rounded-xl border mb-4 ${
                passwordMessage.success
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-red-500/20 border-red-500/50 text-red-300'
              }`}
            >
              {passwordMessage.success ? '✅ ' : '⚠️ '} {passwordMessage.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Current Password *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>New Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className={`pt-4 border-t flex justify-end ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="submit"
                disabled={passwordLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition shadow-lg disabled:opacity-50"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Bottom Section 1: Staff Network & Connection Manager (Doctor <-> Receptionist) */}
        {!isAdmin && (
          <div className={`border rounded-2xl p-6 shadow-lg space-y-6 transition-colors ${
            isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-1">
                Connect with a {targetRoleName.charAt(0).toUpperCase() + targetRoleName.slice(1)}
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Enter the exact email address of the {targetRoleName} to send a working connection request. Once approved, you can securely collaborate.
              </p>
            </div>

            {connMessage && (
              <div
                className={`text-xs p-3 rounded-xl border ${
                  connMessage.type === 'success'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-red-500/20 border-red-500/50 text-red-300'
                }`}
              >
                {connMessage.type === 'success' ? '✅ ' : '⚠️ '} {connMessage.text}
              </div>
            )}

            <form onSubmit={handleSendRequest} className="flex gap-3">
              <input
                type="email"
                required
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                placeholder={`Enter ${targetRoleName} email address...`}
                className={`flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="submit"
                disabled={connLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition shadow disabled:opacity-50"
              >
                {connLoading ? 'Sending...' : 'Send Request'}
              </button>
            </form>

            {/* Connection List */}
            <div className={`pt-4 border-t space-y-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Active & Pending Working Partners</h3>

              {connections.length === 0 ? (
                <p className={`text-xs py-4 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No connections established yet.</p>
              ) : (
                <div className="space-y-3">
                  {connections.map((conn) => {
                    const partner = isDoctor ? conn.receptionist : conn.doctor;
                    if (!partner) return null;
                    const isIncoming = conn.initiatedBy !== user.role;
                    const isPending = conn.status === 'PENDING';

                    return (
                      <div
                        key={conn.id}
                        className={`flex flex-wrap items-center justify-between gap-4 border p-4 rounded-xl transition-colors ${
                          isDarkMode ? 'bg-[#131b2e] border-slate-700/80' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{partner.name}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                conn.status === 'APPROVED'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : conn.status === 'PENDING'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}
                            >
                              {conn.status}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {partner.position} ({partner.email})
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending && isIncoming ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(conn.id, 'APPROVED')}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition shadow"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(conn.id, 'REJECTED')}
                                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium px-3 py-1.5 rounded-lg transition border border-red-500/30"
                              >
                                Reject
                              </button>
                            </>
                          ) : isPending ? (
                            <span className={`text-xs italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Waiting for approval...</span>
                          ) : (
                            <span className="text-xs text-emerald-400 font-medium">Active Partner</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Section 2: Administrative Network & Connection Manager (Admin <-> Staff) */}
        <div className={`border rounded-2xl p-6 shadow-lg space-y-6 transition-colors ${
          isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-1">
              {isAdmin ? 'Connect with Medical Staff (Doctor / Receptionist)' : 'Connect with Administrator'}
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {isAdmin
                ? 'Enter the email address of a doctor or receptionist to request administrative oversight.'
                : 'Enter the email address of an administrator to connect and manage your clinic workflow.'}
            </p>
          </div>

          {adminConnMessage && (
            <div
              className={`text-xs p-3 rounded-xl border ${
                adminConnMessage.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              }`}
            >
              {adminConnMessage.type === 'success' ? '✅ ' : ''} {adminConnMessage.text}
            </div>
          )}

          <form onSubmit={handleSendAdminRequest} className="flex gap-3">
            <input
              type="email"
              required
              value={adminTargetEmail}
              onChange={(e) => setAdminTargetEmail(e.target.value)}
              placeholder={isAdmin ? "Enter staff email address..." : "Enter admin email address..."}
              className={`flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${
                isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="submit"
              disabled={adminConnLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition shadow disabled:opacity-50"
            >
              {adminConnLoading ? 'Sending...' : 'Send Request'}
            </button>
          </form>

          {/* Admin Connection List */}
          <div className={`pt-4 border-t space-y-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Active & Pending Administrative Links</h3>

            {adminConnections.length === 0 ? (
              <p className={`text-xs py-4 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No administrative connections established yet.</p>
            ) : (
              <div className="space-y-3">
                {adminConnections.map((conn) => {
                  const partner = isAdmin ? conn.target : conn.admin;
                  if (!partner) return null;
                  const isIncoming = conn.initiatedBy !== user.role;
                  const isPending = conn.status === 'PENDING';

                  return (
                    <div
                      key={conn.id}
                      className={`flex flex-wrap items-center justify-between gap-4 border p-4 rounded-xl transition-colors ${
                        isDarkMode ? 'bg-[#131b2e] border-slate-700/80' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{partner.name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              conn.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : conn.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {conn.status}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {partner.position || 'Administrator'} ({partner.email})
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending && isIncoming ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAdminStatusChange(conn.id, 'APPROVED')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition shadow"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdminStatusChange(conn.id, 'REJECTED')}
                              className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium px-3 py-1.5 rounded-lg transition border border-red-500/30"
                            >
                              Reject
                            </button>
                          </>
                        ) : isPending ? (
                          <span className={`text-xs italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Waiting for approval...</span>
                        ) : (
                          <span className="text-xs text-emerald-400 font-medium">Active Link</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}