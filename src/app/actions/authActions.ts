'use server';

import { prisma } from '@/lib/prisma'; // Adjust your prisma import path if needed
import bcrypt from 'bcrypt';

// 1. Request Password Reset OTP
export async function requestPasswordResetAction(email: string) {
  try {
    const trimmedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });

    if (!user) {
      // Return a generic message to prevent email harvesting/enumeration attacks
      return { success: true, message: 'If an account with this email exists, an OTP has been sent.' };
    }

    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiresAt },
    });

    // TODO: Integrate your SMS/Email provider here. For testing, check your terminal:
    console.log(`[DEV OTP] Password Reset OTP for ${trimmedEmail}: ${otp}`);

    return { success: true, message: 'Password reset OTP sent successfully.' };
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return { success: false, error: 'Failed to process password reset request.' };
  }
}

// 2. Verify OTP & Reset Password
export async function resetPasswordWithOtpAction(email: string, otp: string, newPassword: string) {
  try {
    const trimmedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      return { success: false, error: 'Invalid request or active OTP session not found.' };
    }

    if (user.otpCode !== otp.trim() || new Date() > user.otpExpiresAt) {
      return { success: false, error: 'Invalid or expired OTP code.' };
    }

    // Hash the new password securely
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otpCode: null,
        otpExpiresAt: null, // Clear token after use
      },
    });

    return { success: true, message: 'Password updated successfully. You can now log in.' };
  } catch (error: any) {
    console.error('Password reset execution error:', error);
    return { success: false, error: 'Failed to reset password.' };
  }
}

// 3. Send Sign-up OTP for Dual Channel (Email or Phone)
export async function sendSignupOtpAction(identifier: string, channel: 'EMAIL' | 'PHONE') {
  try {
    const query = channel === 'EMAIL'
      ? { email: identifier.toLowerCase().trim() }
      : { phone: identifier.trim() };

    const user = await prisma.user.findFirst({ where: query });
    if (!user) {
      return { success: false, error: 'User account not found for verification.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiresAt },
    });

    console.log(`[DEV OTP] Sign-up OTP via ${channel} for ${identifier}: ${otp}`);

    return { success: true, message: `Verification OTP sent to your ${channel.toLowerCase()} successfully.` };
  } catch (error: any) {
    console.error('Send signup OTP error:', error);
    return { success: false, error: 'Failed to dispatch verification OTP.' };
  }
}

// 4. Verify Sign-up OTP & Return Role-Based Redirection Path
export async function verifySignupOtpAction(identifier: string, otp: string, channel: 'EMAIL' | 'PHONE') {
  try {
    const query = channel === 'EMAIL'
      ? { email: identifier.toLowerCase().trim() }
      : { phone: identifier.trim() };

    const user = await prisma.user.findFirst({ where: query });
    if (!user || !user.otpCode || !user.otpExpiresAt) {
      return { success: false, error: 'Invalid verification session.' };
    }

    if (user.otpCode !== otp.trim() || new Date() > user.otpExpiresAt) {
      return { success: false, error: 'Incorrect or expired OTP code.' };
    }

    const updateData = channel === 'EMAIL'
      ? { isEmailVerified: true }
      : { isPhoneVerified: true };

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...updateData,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    // Determine correct role-based redirect path
    const SUPER_ADMIN_EMAIL = 'nexjunction@gmail.com';
    const isSuperAdmin = updatedUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    let redirectPath = '/dashboard/doctor'; // default fallback
    if (updatedUser.role === 'ADMIN') {
      redirectPath = isSuperAdmin ? '/dashboard/admin' : '/dashboard/assigned-admin';
    } else if (updatedUser.role === 'DOCTOR') {
      redirectPath = '/dashboard/doctor';
    } else if (updatedUser.role === 'RECEPTIONIST') {
      redirectPath = '/dashboard/receptionist';
    }

    return {
      success: true,
      message: `${channel === 'EMAIL' ? 'Email' : 'Phone number'} verified successfully!`,
      redirectPath
    };
  } catch (error: any) {
    console.error('Verify signup OTP error:', error);
    return { success: false, error: 'Verification failed.' };
  }
}

// 5. Direct Login Action (No OTP verification during login)
export async function loginAction(identifier: string, password: string) {
  try {
    const trimmedIdentifier = identifier.toLowerCase().trim();

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedIdentifier },
          { phone: identifier.trim() }
        ]
      }
    });

    if (!user || !user.password) {
      return { success: false, error: 'Invalid email/phone or password.' };
    }

    // Verify password securely
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid email/phone or password.' };
    }

    // Determine correct role-based redirect path
    const SUPER_ADMIN_EMAIL = 'nexjunction@gmail.com';
    const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    let redirectPath = '/dashboard/doctor'; // default fallback
    if (user.role === 'ADMIN') {
      redirectPath = isSuperAdmin ? '/dashboard/admin' : '/dashboard/assigned-admin';
    } else if (user.role === 'DOCTOR') {
      redirectPath = '/dashboard/doctor';
    } else if (user.role === 'RECEPTIONIST') {
      redirectPath = '/dashboard/receptionist';
    }

    return {
      success: true,
      message: 'Logged in successfully!',
      redirectPath
    };
  } catch (error: any) {
    console.error('Login action error:', error);
    return { success: false, error: 'Something went wrong during login.' };
  }
}