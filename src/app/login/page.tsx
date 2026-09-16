// src/app/login/page.tsx
'use client';

import { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { loginAction, signupAction } from './actions';

type UserRole = 'DOCTOR' | 'ACCOUNTANT' | 'ADMIN';
type FormMode = 'LOGIN' | 'SIGNUP';
type OtpChannel = 'EMAIL' | 'PHONE';

export default function AuthPage() {
  const [mode, setMode] = useState<FormMode>('LOGIN');
  const [role, setRole] = useState<UserRole>('DOCTOR');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [channel, setChannel] = useState<OtpChannel>('EMAIL');

  // Sign In Form States
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+880');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Security & Validation States
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // RegEx Patterns
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const bdPhoneRegex = /^\+8801[3-9]\d{8}$/;
  const usernameRegex = /^[a-zA-Z0-9_]{4,15}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.startsWith('+880')) {
      setPhone(value);
    } else {
      setPhone('+880');
    }
  };

  // Handle Login via Server Action
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your Email, Phone Number, or Username.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setError('');
    setIsLoading(true);

    const res = await loginAction(identifier, loginPassword);
    if (res && !res.success) {
      setError(res.error || 'Login failed.');
      setIsLoading(false);
    }
  };

  // Handle Signup Validation & Server Action Submission
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOtpSent) {
      if (firstName.trim().length < 2 || lastName.trim().length < 2) {
        setError('First and Last names must be at least 2 characters long.');
        return;
      }
      if (!usernameRegex.test(username)) {
        setError('Username must be 4–15 characters (letters, numbers, underscores only).');
        return;
      }
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!bdPhoneRegex.test(phone)) {
        setError('Enter a valid 11-digit Bangladeshi mobile number after +880 (e.g., +8801712345678).');
        return;
      }
      if (!passwordRegex.test(signupPassword)) {
        setError('Password must be 8+ chars with at least 1 uppercase letter, 1 number, and 1 special character.');
        return;
      }
      if (signupPassword !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }
      if (!captchaToken) {
        setError('Please verify the Google reCAPTCHA check.');
        return;
      }

      setError('');
      setIsLoading(true);

      const mappedRole = role === 'ACCOUNTANT' ? 'RECEPTIONIST' : role;

      const res = await signupAction({
        name: `${firstName} ${lastName}`,
        username,
        email,
        phone,
        role: mappedRole,
        pass: signupPassword,
        channel,
      });

      setIsLoading(false);

      if (res.success && res.otpRequired) {
        setIsOtpSent(true);
      } else {
        setError(res.error || 'Failed to send OTP verification code.');
      }
      return;
    }

    if (otp.length !== 6) {
      setError('OTP code must be exactly 6 digits.');
      return;
    }

    setError('');
    setIsLoading(true);

    const mappedRole = role === 'ACCOUNTANT' ? 'RECEPTIONIST' : role;

    const res = await signupAction({
      name: `${firstName} ${lastName}`,
      username,
      email,
      phone,
      role: mappedRole,
      pass: signupPassword,
      channel,
      otp,
    });

    if (res.success) {
      if (res.role === 'DOCTOR') {
        window.location.href = '/dashboard/doctor';
      } else if (res.role === 'ADMIN') {
        window.location.href = '/dashboard/assigned-admin';
      } else {
        window.location.href = '/dashboard/receptionist';
      }
    } else {
      setError(res.error || 'Registration failed.');
      setIsLoading(false);
    }
  };

  const resetForm = (targetMode: FormMode) => {
    setMode(targetMode);
    setIsOtpSent(false);
    setError('');
    setCaptchaToken(null);
    setPhone('+880');
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 font-sans text-slate-100">
      <div className="w-full max-w-lg rounded-xl bg-slate-800 p-6 sm:p-8 shadow-2xl border border-slate-700">

        {/* Header with Logo */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo.png"
            alt="ChamberNex.live Logo"
            className="h-14 w-auto object-contain mb-3"
          />
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">
            Chamber Portal
          </h2>
          <p className="mt-1 text-center text-sm text-slate-400">
            {mode === 'LOGIN' ? 'Sign in to your account' : 'Create a secured staff or doctor account'}
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-4 rounded-md bg-red-900/50 border border-red-500 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* User Role Selector - Shown ONLY on SIGNUP mode */}
        {mode === 'SIGNUP' && !isOtpSent && (
          <div className="mb-6">
            <label className="block text-xs font-medium mb-1 text-slate-300">Select Registering Role</label>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-900 p-1 text-xs font-semibold">
              {(['DOCTOR', 'ACCOUNTANT', 'ADMIN'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-md py-2.5 transition ${
                    role === r
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r === 'ACCOUNTANT' ? 'RECEPTION' : r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-300">
                Email, Username or Phone Number
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+8801712345678 / user@mail.com"
                className="w-full h-12 rounded-lg bg-slate-900 border border-slate-700 px-3.5 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-slate-300">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 rounded-lg bg-slate-900 border border-slate-700 px-3.5 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-500 transition mt-2 text-sm disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* SIGNUP FORM */}
        {mode === 'SIGNUP' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            {!isOtpSent ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-300">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full h-12 rounded-lg bg-slate-900 border border-slate-700 px-3.5 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-300">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full h-12 rounded-lg bg-slate-900 border border-slate-700 px-3.5 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="john_doe99"
                    className="w-full h-12 rounded-lg bg-slate-900 border border-slate-700 px-3.5 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@chamber.com"
                    className="w-full h-12 rounded-lg bg-slate-900 border border-slate-700 px-3.5 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Mobile Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+8801712345678"
                    className="w-full h-12 rounded-lg bg-slate-900 border border-slate-700 px-3.5 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Password</label>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 rounded-lg bg-slate-900 border border-slate-700 px-3.5 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 rounded-lg bg-slate-900 border border-slate-700 px-3.5 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Channel Selector for OTP */}
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Send Verification Code Via</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setChannel('EMAIL')}
                      className={`rounded-lg py-2.5 text-xs font-semibold transition border ${
                        channel === 'EMAIL'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel('PHONE')}
                      className={`rounded-lg py-2.5 text-xs font-semibold transition border ${
                        channel === 'PHONE'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      SMS
                    </button>
                  </div>
                </div>

                <div className="flex justify-center py-2 overflow-x-auto">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                    onChange={(token) => setCaptchaToken(token)}
                    theme="dark"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-medium mb-1 text-slate-300">
                  Enter 6-Digit {channel === 'EMAIL' ? 'Email' : 'SMS'} Verification Code sent to{' '}
                  <span className="font-semibold text-white">{channel === 'EMAIL' ? email : phone}</span>
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full h-12 rounded-lg bg-slate-900 border border-slate-700 px-3 text-center text-xl tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-500 transition mt-2 text-sm disabled:opacity-50"
            >
              {isLoading
                ? 'Processing...'
                : !isOtpSent
                ? `Send OTP & Register as ${role}`
                : 'Verify OTP & Complete Account'}
            </button>
          </form>
        )}

        {/* Mode Switcher */}
        <div className="mt-6 text-center text-xs text-slate-400">
          {mode === 'LOGIN' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => resetForm('SIGNUP')}
                className="text-blue-400 underline font-medium hover:text-blue-300 cursor-pointer"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => resetForm('LOGIN')}
                className="text-blue-400 underline font-medium hover:text-blue-300 cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}