// src/app/login/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { generateOtp, sendEmailOtp, sendSmsOtp } from '@/lib/otpService';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcrypt';

const SUPER_ADMIN_EMAIL = 'nexjunction@gmail.com';

// Temporary memory store for signup OTP states (email mapping to data & code)
const pendingSignups = new Map<string, { data: any; otp: string; expires: number }>();

// Helper to check if a user's trial or subscription is still valid
function isSubscriptionActive(user: any) {
  if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return true; // Super admin never expires

  const now = new Date();

  // DEBUG LOGS TO INSPECT DATABASE VALUES
  console.log('--- SUBSCRIPTION CHECK DEBUG ---');
  console.log('User Email:', user.email);
  console.log('Role:', user.role);
  console.log('subStatus:', user.subStatus);
  console.log('trialEndsAt (raw):', user.trialEndsAt);
  console.log('createdAt (raw):', user.createdAt);

  // 1. If explicitly ACTIVE subscription
  if (user.subStatus === 'ACTIVE') {
    if (!user.subEndsAt) return true; // Lifetime subscription has no end date
    return new Date(user.subEndsAt) > now;
  }

  // 2. If explicitly marked EXPIRED
  if (user.subStatus === 'EXPIRED') {
    return false;
  }

  // 3. TRIAL Logic: If subStatus is TRIAL (or NULL/missing), calculate 30 days from trialEndsAt or createdAt
  let trialEnd: Date;
  if (user.trialEndsAt) {
    trialEnd = new Date(user.trialEndsAt);
  } else if (user.createdAt) {
    // Fallback for older/NULL rows: 30 days from when the user account was created
    trialEnd = new Date(new Date(user.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
  } else {
    // Absolute fallback if everything is null: 30 days from right now
    trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  console.log('Calculated trialEnd:', trialEnd);
  console.log('Current Time (now):', now);
  console.log('Is trialEnd > now?', trialEnd > now);
  console.log('--------------------------------');

  return trialEnd > now; // Returns true if within 30 days, false if expired
}

export async function loginAction(identifier: string, pass: string) {
  if (!identifier || !pass) {
    return { success: false, error: 'All fields are required.' };
  }

  const query = identifier.trim();

  // Find user by email or phone
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: query },
        { phone: query },
      ],
    },
  });

  if (!user || !user.password) {
    return { success: false, error: 'Invalid credentials or user not found.' };
  }

  // Securely compare the submitted password with the database hash
  const isPasswordValid = await bcrypt.compare(pass, user.password);

  if (!isPasswordValid) {
    return { success: false, error: 'Invalid password.' };
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: 'userEmail',
    value: user.email,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  // Check if trial/subscription has expired (Bypassed entirely for Super Admin & Admins)
  if (user.role !== 'ADMIN' && !isSuperAdmin) {
    const activeSub = isSubscriptionActive(user);
    if (!activeSub) {
      redirect('/subscription');
    }
  }

  // Dynamic role and position-based redirection
  if (user.role === 'ADMIN' || isSuperAdmin) {
    if (isSuperAdmin) {
      redirect('/dashboard/admin');
    } else {
      redirect('/dashboard/assigned-admin');
    }
  } else if (user.role === 'DOCTOR') {
    redirect('/dashboard/doctor');
  } else {
    redirect('/dashboard/receptionist');
  }
}

export async function signupAction(payload: {
  name: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  pass: string;
  channel: 'EMAIL' | 'PHONE';
  otp?: string;
}) {
  try {
    const { name, email, phone, role, pass, channel, otp } = payload;

    // Phase 1: Requesting Real OTP
    if (!otp) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { phone }],
        },
      });

      if (existingUser) {
        return { success: false, error: 'An account with this email or phone already exists.' };
      }

      const generatedOtp = generateOtp();
      const expires = Date.now() + 5 * 60 * 1000; // valid for 5 mins

      pendingSignups.set(email, {
        data: { name, email, phone, role, pass },
        otp: generatedOtp,
        expires,
      });

      let res;
      if (channel === 'EMAIL') {
        res = await sendEmailOtp(email, generatedOtp);
      } else {
        res = await sendSmsOtp(phone, generatedOtp);
      }

      if (!res.success) {
        return { success: false, error: res.error || 'Failed to dispatch OTP verification code.' };
      }

      return { success: true, otpRequired: true };
    }

    // Phase 2: Verifying OTP and Creating Account
    const pending = pendingSignups.get(email);
    if (!pending) {
      return { success: false, error: 'Registration session expired. Please restart.' };
    }

    if (Date.now() > pending.expires) {
      pendingSignups.delete(email);
      return { success: false, error: 'OTP has expired. Please request a new one.' };
    }

    if (pending.otp !== otp) {
      return { success: false, error: 'Incorrect OTP code entered.' };
    }

    const hashedPassword = await bcrypt.hash(pass, 12);

    // Fetch global trial duration from platform settings
    const platformSetting = await prisma.platformSetting.findFirst();
    const trialDays = platformSetting?.defaultTrialDays ?? 30;

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role: role.toUpperCase(),
        position: role.toUpperCase() === 'DOCTOR' ? 'Consulting Specialist' : 'Receptionist',
        password: hashedPassword,
        isEmailVerified: true,
        isPhoneVerified: true,
        subStatus: 'TRIAL',
        trialEndsAt: trialEndDate,
      },
    });

    pendingSignups.delete(email);

    const cookieStore = await cookies();
    cookieStore.set({
      name: 'userEmail',
      value: newUser.email,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return { success: true, role: newUser.role };
  } catch (err) {
    console.error('Signup error:', err);
    return { success: false, error: 'Database creation or verification failed.' };
  }
}