'use client';

import React, { useState } from 'react';
import {
  requestPasswordResetAction,
  resetPasswordWithOtpAction
} from '@/app/actions/authActions'; // Adjust path if your actions file is located elsewhere

interface ForgotPasswordProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Handler: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await requestPasswordResetAction(email);
    setLoading(false);

    if (res.success) {
      setMessage({ type: 'success', text: res.message });
      setStep(2); // Move to OTP entry step
    } else {
      setMessage({ type: 'error', text: res.error || 'Something went wrong.' });
    }
  };

  // Handler: Verify OTP & Proceed to Password Reset Input
  const handleVerifyOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit OTP code.' });
      return;
    }
    setMessage(null);
    setStep(3); // Move to new password entry step
  };

  // Handler: Final Password Reset Execution
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const res = await resetPasswordWithOtpAction(email, otp, newPassword);
    setLoading(false);

    if (res.success) {
      setMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        handleClose();
      }, 2500); // Close modal automatically after success message display
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update password.' });
    }
  };

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative border border-gray-100">

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          &times;
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">Reset Password</h2>
          <p className="text-sm text-gray-500 mt-1">
            {step === 1 && "Enter your account email to receive a password reset OTP."}
            {step === 2 && `Enter the 6-digit verification code sent to ${email}.`}
            {step === 3 && "Enter your new secure password."}
          </p>
        </div>

        {/* Feedback Alert Message */}
        {message && (
          <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* STEP 1: Request OTP Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@chamber.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send Reset OTP'}
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP Form */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">6-Digit OTP Code</label>
              <input
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-widest text-lg font-bold"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition text-sm"
              >
                Verify Code
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: New Password Form */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}