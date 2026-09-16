// src/app/dashboard/admin/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

// --- BULLETPROOF SUPER ADMIN SHIELD ---
const PROTECTED_SUPER_ADMIN_EMAILS = [
  'nexjunction@gmail.com',
  process.env.SUPER_ADMIN_EMAIL || '',
].filter(Boolean);

// 1. Fetch all staff members (Admins, Doctors, and Receptionists) for the clinic
export async function getClinicStaffAction() {
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subStatus: true,
        subEndsAt: true,
        trialEndsAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, staff };
  } catch (error) {
    console.error('Failed to fetch clinic staff:', error);
    return { success: false, staff: [], error: 'Failed to load staff list.' };
  }
}

// 2. Add a new staff member (Admin, Doctor, or Receptionist)
export async function createStaffAction(formData: FormData) {
  try {
    const name = (formData.get('name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';

    if (!name || !email || !password || !role) {
      return { success: false, error: 'All fields are required.' };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: 'A user with this email already exists.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Fetch global trial duration from platform settings, default to 30 days
    const platformSetting = await prisma.platformSetting.findFirst();
    const trialDays = platformSetting?.defaultTrialDays ?? 30;
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        position: role,
        subStatus: role === 'DOCTOR' ? 'TRIAL' : 'ACTIVE',
        trialEndsAt: role === 'DOCTOR' ? trialEndDate : null,
      },
    });

    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (error) {
    console.error('Failed to create staff member:', error);
    return { success: false, error: 'Failed to create staff account.' };
  }
}

// 3. Permanently Delete a User (Protected by Super Admin & Self-Deletion Shield)
export async function deleteUserAction(userId: string) {
  try {
    const cookieStore = await cookies();
    const adminEmail = cookieStore.get('userEmail')?.value;

    if (!adminEmail) {
      return { success: false, error: 'Unauthorized request.' };
    }

    const currentAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!currentAdmin || currentAdmin.role !== 'ADMIN') {
      return { success: false, error: 'Access denied. Administrator privileges required.' };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, error: 'User not found.' };
    }

    const targetEmailLower = targetUser.email.toLowerCase();
    const adminEmailLower = adminEmail.toLowerCase();

    // --- PERMANENT DELETION BLOCKER FOR SUPER ADMIN & SELF ---
    if (PROTECTED_SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(targetEmailLower)) {
      return {
        success: false,
        error: 'Security Error: The Super Admin master profile cannot be deleted under any circumstances.'
      };
    }

    if (targetEmailLower === adminEmailLower || targetUser.id === currentAdmin.id) {
      return {
        success: false,
        error: 'Security Error: You cannot delete your own active administrator account.'
      };
    }

    // Perform permanent deletion for allowed users only
    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete user permanently:', error);
    return { success: false, error: error.message || 'Failed to delete user from database.' };
  }
}

// 4. Update Super Admin Profile Settings (With Bcrypt Verification & Hashing)
export async function updateAdminProfileAction(formData: FormData) {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get('userEmail')?.value;

  if (!userEmail) {
    return { success: false, error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const oldPassword = formData.get('oldPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!name || !email) {
    return { success: false, error: 'Name and email are required.' };
  }

  try {
    const currentUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!currentUser) {
      return { success: false, error: 'User not found.' };
    }

    if (email !== userEmail) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return { success: false, error: 'This email address is already in use by another account.' };
      }
    }

    const updateData: { name: string; email: string; password?: string } = {
      name,
      email,
    };

    if (newPassword && newPassword.trim() !== '') {
      if (!oldPassword) {
        return { success: false, error: 'Please enter your current password to set a new one.' };
      }

      if (currentUser.password) {
        const isPasswordValid = await bcrypt.compare(oldPassword, currentUser.password);
        if (!isPasswordValid) {
          return { success: false, error: 'Incorrect current password.' };
        }
      }

      if (newPassword !== confirmPassword) {
        return { success: false, error: 'New passwords do not match.' };
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
    });

    if (email !== userEmail) {
      cookieStore.set('userEmail', email);
    }

    revalidatePath('/dashboard/admin/settings');
    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update admin profile:', error);
    return { success: false, error: error.message || 'Failed to update profile.' };
  }
}

// 5. Automatic Subscription Activation Handler (for Payment Gateways / Success Callbacks)
export async function activateSubscriptionAutomatically(
  userId: string,
  planType: string,
  amountPaid: number,
  trxId: string,
  paymentMethod: string = 'SSLCOMMERZ'
) {
  try {
    const now = new Date();
    let subEndsAt: Date | null = null;
    const normalizedPlan = planType.toUpperCase();

    switch (normalizedPlan) {
      case 'MONTHLY':
        subEndsAt = new Date(now.setMonth(now.getMonth() + 1));
        break;
      case 'HALF_YEARLY':
        subEndsAt = new Date(now.setMonth(now.getMonth() + 6));
        break;
      case 'ANNUAL':
      case 'ANNUALLY':
        subEndsAt = new Date(now.setFullYear(now.getFullYear() + 1));
        break;
      case 'LIFETIME':
        subEndsAt = null;
        break;
      default:
        subEndsAt = new Date(now.setMonth(now.getMonth() + 1));
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        subStatus: 'ACTIVE',
        planType: normalizedPlan,
        subEndsAt: subEndsAt,
      },
    });

    await prisma.transaction.create({
      data: {
        userId: userId,
        amount: amountPaid,
        planType: normalizedPlan,
        paymentMethod: paymentMethod,
        trxId: trxId,
        status: 'COMPLETED',
        startDate: new Date(),
        endDate: subEndsAt,
      },
    });

    return { success: true, user: updatedUser };
  } catch (error: any) {
    console.error('Failed to automatically activate subscription:', error);
    return { success: false, error: error.message || 'Database update failed.' };
  }
}