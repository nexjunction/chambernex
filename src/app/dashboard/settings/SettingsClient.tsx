// src/app/dashboard/settings/SettingsClient.tsx
'use client';

import { useState } from 'react';
import { updateProfileDetails, requestContactChangeOtp, verifyAndApplyContactChange } from './actions';

export default function SettingsClient({ initialUser }: { initialUser: any }) {
  const [name, setName] = useState(initialUser.name || '');
  const [username, setUsername] = useState(initialUser.username || '');

  // Contact Change States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [changeField, setChangeField] = useState<'email' | 'phone'>('email');
  const [newContactValue, setNewContactValue] = useState('');
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otp, setOtp] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    const res = await updateProfileDetails({ name, username });
    setIsLoading(false);

    if (res.success) {
      setMessage(res.message);
    } else {
      setError(res.error || 'Failed to update profile.');
    }
  };

  const handleRequestOtpClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    const res = await requestContactChangeOtp(changeField, newContactValue);
    setIsLoading(false);

    if (res.success) {
      setIsOtpStep(true);
      setMessage(res.message);
    } else {
      setError(res.error || 'Failed to dispatch code.');
    }
  };

  const handleVerifyOtpClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    const res = await verifyAndApplyContactChange(otp);
    setIsLoading(false);

    if (res.success) {
      setMessage(res.message);
      setIsModalOpen(false);
      setIsOtpStep(false);
      setOtp('');
      window.location.reload(); // Refresh to reflect latest info
    } else {
      setError(res.error || 'Verification failed.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 sm:space-y-8 font-sans text-slate-100 pb-[env(safe-area-inset-bottom)]">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400">Manage your profile details and secure contact information.</p>
      </div>

      {error && <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-sm text-red-200">{error}</div>}
      {message && <div className="p-3 bg-emerald-900/50 border border-emerald-500 rounded-lg text-sm text-emerald-200">{message}</div>}

      {/* Profile Details Form */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 shadow-md">
        <h2 className="text-base sm:text-lg font-semibold mb-4 text-white">Personal Information</h2>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-300">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-slate-300">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 active:bg-blue-700 hover:bg-blue-500 transition rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Contact Channels Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 shadow-md space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-white">Security & Contact Channels</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="overflow-hidden">
              <p className="text-xs text-slate-400">Email Address</p>
              <p className="text-sm font-medium text-white truncate">{initialUser.email}</p>
            </div>
            <button
              onClick={() => { setChangeField('email'); setNewContactValue(''); setIsOtpStep(false); setIsModalOpen(true); }}
              className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 active:bg-slate-700 hover:bg-slate-700 border border-slate-600 text-xs font-semibold rounded-md transition cursor-pointer text-center"
            >
              Change
            </button>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="overflow-hidden">
              <p className="text-xs text-slate-400">Mobile Phone Number</p>
              <p className="text-sm font-medium text-white">{initialUser.phone || 'Not set'}</p>
            </div>
            <button
              onClick={() => { setChangeField('phone'); setNewContactValue('+880'); setIsOtpStep(false); setIsModalOpen(true); }}
              className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 active:bg-slate-700 hover:bg-slate-700 border border-slate-600 text-xs font-semibold rounded-md transition cursor-pointer text-center"
            >
              Change
            </button>
          </div>
        </div>
      </div>

      {/* Verification Modal for Contact Change */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-white capitalize">
              Change {changeField}
            </h3>

            {!isOtpStep ? (
              <form onSubmit={handleRequestOtpClick} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">
                    New {changeField === 'email' ? 'Email Address' : 'Mobile Number (+880...)'}
                  </label>
                  <input
                    type={changeField === 'email' ? 'email' : 'text'}
                    value={newContactValue}
                    onChange={(e) => setNewContactValue(e.target.value)}
                    placeholder={changeField === 'email' ? 'new@mail.com' : '+8801712345678'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-700 active:bg-slate-600 hover:bg-slate-600 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 active:bg-blue-700 hover:bg-blue-500 text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpClick} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter the 6-digit verification code sent to <span className="font-semibold text-white break-all">{newContactValue}</span>
                </p>
                <div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-center text-xl tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-700 active:bg-slate-600 hover:bg-slate-600 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Cancel button
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-500 text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}