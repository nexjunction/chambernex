// src/app/dashboard/settings/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { generateOtp, sendEmailOtp, sendSmsOtp } from '@/lib/otpService';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

// Temporary memory store for contact updates verification
const pendingContactChanges = new Map<string, { userId: string; newField: 'email' | 'phone'; newValue: string; otp: string; expires: number }>();

export async function updateProfileDetails(data: { name: string; username: string }) {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('userEmail')?.value;

    if (!userEmail) {
      return { success: false, error: 'Unauthorized session.' };
    }

    const updatedUser = await prisma.user.update({
      where: { email: userEmail },
      data: {
        name: data.name,
        username: data.username,
      },
    });

    // If email changed, update the cookie as well
    if (updatedUser.email !== userEmail) {
      cookieStore.set({
        name: 'userEmail',
        value: updatedUser.email,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return { success: true, message: 'Profile details updated successfully.' };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: 'Failed to update profile details. Username might already be taken.' };
  }
}

export async function requestContactChangeOtp(field: 'email' | 'phone', newValue: string) {
  try {
    const cookieStore = await cookies();
    const currentUserEmail = cookieStore.get('userEmail')?.value;

    if (!currentUserEmail) {
      return { success: false, error: 'Unauthorized session.' };
    }

    const currentUser = await prisma.user.findUnique({ where: { email: currentUserEmail } });
    if (!currentUser) return { success: false, error: 'User not found.' };

    // Check if new email/phone is already taken by someone else
    const conflict = await prisma.user.findFirst({
      where: {
        OR: [
          field === 'email' ? { email: newValue } : { phone: newValue }
        ],
      },
    });

    if (conflict) {
      return { success: false, error: `This ${field} is already registered to another account.` };
    }

    const otp = generateOtp();
    const expires = Date.now() + 5 * 60 * 1000; // 5 mins

    pendingContactChanges.set(currentUser.id, {
      userId: currentUser.id,
      newField: field,
      newValue,
      otp,
      expires,
    });

    let res;
    if (field === 'email') {
      res = await sendEmailOtp(newValue, otp);
    } else {
      res = await sendSmsOtp(newValue, otp);
    }

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to dispatch verification code.' };
    }

    return { success: true, message: `Verification code sent to your new ${field}.` };
  } catch (error) {
    console.error('Contact change OTP error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function verifyAndApplyContactChange(otp: string) {
  try {
    const cookieStore = await cookies();
    const currentUserEmail = cookieStore.get('userEmail')?.value;
    if (!currentUserEmail) return { success: false, error: 'Unauthorized session.' };

    const currentUser = await prisma.user.findUnique({ where: { email: currentUserEmail } });
    if (!currentUser) return { success: false, error: 'User not found.' };

    const pending = pendingContactChanges.get(currentUser.id);
    if (!pending) {
      return { success: false, error: 'No active contact change request found. Please restart.' };
    }

    if (Date.now() > pending.expires) {
      pendingContactChanges.delete(currentUser.id);
      return { success: false, error: 'Verification code has expired.' };
    }

    if (pending.otp !== otp) {
      return { success: false, error: 'Incorrect verification code entered.' };
    }

    // Apply update to Database
    const updateData: any = {};
    if (pending.newField === 'email') {
      updateData.email = pending.newValue;
      updateData.isEmailVerified = true;
    } else {
      updateData.phone = pending.newValue;
      updateData.isPhoneVerified = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id: pending.userId },
      data: updateData,
    });

    pendingContactChanges.delete(currentUser.id);

    // Update session cookie if email changed
    if (pending.newField === 'email') {
      cookieStore.set({
        name: 'userEmail',
        value: updatedUser.email,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return { success: true, message: `${pending.newField === 'email' ? 'Email address' : 'Mobile number'} updated successfully!` };
  } catch (error) {
    console.error('Verify contact error:', error);
    return { success: false, error: 'Failed to complete update.' };
  }
}