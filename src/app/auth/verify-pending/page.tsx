'use client';

import React, { useState } from 'react';
import SignupVerificationModal from '@/components/auth/SignupVerificationModal';

export default function VerifyPendingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [channel, setChannel] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [identifier, setIdentifier] = useState('');

  const openModalForChannel = (targetChannel: 'EMAIL' | 'PHONE') => {
    setChannel(targetChannel);
    setIdentifier(''); // User can input their specific email or phone to verify
    setIsModalOpen(true);
  };

  const handleVerificationComplete = (redirectPath: string) => {
    setIsModalOpen(false);
    // Redirects precisely to the correct role dashboard path (/dashboard/admin, /dashboard/doctor, etc.)
    window.location.href = redirectPath;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-center">

        {/* Warning Icon Badge */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-50 text-amber-600 mb-4">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Required</h1>
        <p className="text-sm text-gray-500 mb-6">
          To keep your chamber secure, you must verify both your email address and your phone number before accessing the platform.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => openModalForChannel('EMAIL')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition text-sm shadow-sm"
          >
            Verify Email Address
          </button>

          <button
            onClick={() => openModalForChannel('PHONE')}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-lg transition text-sm shadow-sm"
          >
            Verify Phone Number
          </button>
        </div>

        <div className="mt-6 border-t pt-4">
          <a href="/auth/login" className="text-xs text-blue-600 hover:underline">
            &larr; Back to Login
          </a>
        </div>
      </div>

      {/* Reusable Modal Component */}
      <SignupVerificationModal
        isOpen={isModalOpen}
        identifier={identifier}
        initialChannel={channel}
        onComplete={handleVerificationComplete}
      />
    </div>
  );
}