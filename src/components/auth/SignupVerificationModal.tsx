'use client';

import React, { useState, useEffect } from 'react';
import {
  sendSignupOtpAction,
  verifySignupOtpAction
} from '@/app/actions/authActions';

interface SignupVerificationProps {
  isOpen: boolean;
  identifier: string; // Pre-filled user email or phone from session
  channel: 'EMAIL' | 'PHONE';
  onComplete: (redirectPath: string) => void;
}

export default function SignupVerificationModal({
  isOpen,
  identifier,
  channel,
  onComplete
}: SignupVerificationProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 60-second resend countdown timer state
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!isOpen || !identifier) return;

    // Automatically send OTP upon modal open without asking user to type
    handleSendOtp();

    // Start 60-second countdown timer
    setCountdown(60);
    setCanResend(false);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, identifier, channel]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    setLoading(true);
    setMessage(null);

    const res = await sendSignupOtpAction(identifier, channel);
    setLoading(false);

    if (res.success) {
      setMessage({ type: 'success', text: res.message });
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to send OTP.' });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await verifySignupOtpAction(identifier, otp, channel);
    setLoading(false);

    if (res.success && res.redirectPath) {
      setMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        onComplete(res.redirectPath!); // Routes to the precise dashboard based on role
      }, 1200);
    } else {
      setMessage({ type: 'error', text: res.error || 'Verification failed.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative border border-gray-100">

        <div className="mb-6">
          <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-600 rounded-md uppercase">
            {channel} Verification
          </span>
          <h2 className="text-xl font-bold text-gray-800 mt-2">
            Verify Your {channel === 'EMAIL' ? 'Email Address' : 'Phone Number'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            We automatically sent a 6-digit code to <span className="font-semibold text-gray-700">{identifier}</span>. It expires in 10 minutes.
          </p>
        </div>

        {message && (
          <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Enter 6-Digit Code</label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition text-sm disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Confirm & Verify'}
          </button>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
            <span>Didn't receive the code?</span>
            <button
              type="button"
              disabled={!canResend || loading}
              onClick={handleSendOtp}
              className={`font-semibold ${canResend ? 'text-blue-600 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
            >
              {canResend ? 'Resend OTP' : `Resend in ${countdown}s`}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}