'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { sendEmailOtp, sendSmsOtp } from '@/lib/otpService';
import bcrypt from 'bcrypt';

export async function updateAccountAction(formData: FormData) {
  console.log('--- Incoming Form Data Entries ---');
  for (const [key, value] of formData.entries()) {
    console.log(`${key}:`, value);
  }

  const userId = (formData.get('userId') as string)?.trim();
  const name = (formData.get('name') as string)?.trim();
  const position = (formData.get('position') as string)?.trim();
  const degrees = (formData.get('degrees') as string)?.trim();
  const newEmail = (formData.get('email') as string)?.trim();
  const newPhone = (formData.get('phone') as string)?.trim();
  const avatarFile = formData.get('avatarFile') as File | null;

  if (!userId) {
    return { success: false, error: 'User session identifier is missing.' };
  }

  if (!name || !position) {
    return { success: false, error: 'Name and professional position are required.' };
  }

  // Fetch current user details to compare changes
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!currentUser) {
    return { success: false, error: 'User not found.' };
  }

  // --- DIAGNOSTIC LOG FOR COMPARISON ---
  console.log('🔍 DEBUG COMPARISON:');
  console.log('- Inputted Email:', JSON.stringify(newEmail));
  console.log('- Database Email:', JSON.stringify(currentUser.email));
  console.log('- Are Emails Different?', newEmail && newEmail !== currentUser.email);
  console.log('- Inputted Phone:', JSON.stringify(newPhone));
  console.log('- Database Phone:', JSON.stringify(currentUser.phone));
  console.log('- Are Phones Different?', newPhone && newPhone !== currentUser.phone);
  // -------------------------------------

  let avatarUrl: string | undefined;

  // Handle direct file upload if a file was provided and has content
  if (avatarFile && avatarFile.size > 0) {
    try {
      const bytes = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(avatarFile.name) || '.jpg';
      const filename = `${userId}-${Date.now()}${ext}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');

      await mkdir(uploadDir, { recursive: true });

      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);

      avatarUrl = `/uploads/${filename}`;
    } catch (uploadError) {
      console.error('Failed to save uploaded file:', uploadError);
      return { success: false, error: 'Failed to upload profile picture.' };
    }
  }

  try {
    let emailChangePending = false;
    let phoneChangePending = false;

    // 1. Handle Email Change Request
    if (newEmail && newEmail !== currentUser.email) {
      const existingEmailUser = await prisma.user.findUnique({ where: { email: newEmail } });
      if (existingEmailUser) {
        return { success: false, error: 'This email is already in use by another account.' };
      }
      emailChangePending = true;
    }

    // 2. Handle Phone Change Request
    if (newPhone && newPhone !== currentUser.phone) {
      const existingPhoneUser = await prisma.user.findUnique({ where: { phone: newPhone } });
      if (existingPhoneUser) {
        return { success: false, error: 'This phone number is already in use by another account.' };
      }
      phoneChangePending = true;
    }

    // Generate reliable 6-digit OTP and expiry if changes require verification
    let otp: string | null = null;
    let otpExpiresAt: Date | null = null;

    if (emailChangePending || phoneChangePending) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

      console.log('\n========================================');
      console.log(`🔐 GENERATED DEV OTP CODE: ${otp}`);
      console.log(`Target: ${newEmail || newPhone}`);
      console.log('========================================\n');
    }

    // Prepare update payload for standard profile fields + optional pending fields & OTP
    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        position,
        degrees,
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(emailChangePending && otp && otpExpiresAt ? { pendingEmail: newEmail, otpCode: otp, otpExpiresAt } : {}),
        ...(phoneChangePending && otp && otpExpiresAt ? { pendingPhone: newPhone, otpCode: otp, otpExpiresAt } : {}),
      },
    });

    // Trigger OTP Dispatch if changes require verification
    if (emailChangePending && newEmail && otp) {
      await sendEmailOtp(newEmail, otp);
    }
    if (phoneChangePending && newPhone && otp) {
      await sendSmsOtp(newPhone, otp);
    }

    revalidatePath('/dashboard/account');
    revalidatePath('/dashboard/doctor');
    revalidatePath('/dashboard/receptionist');
    revalidatePath('/dashboard/staff-admin');
    revalidatePath('/dashboard/admin');

    if (emailChangePending || phoneChangePending) {
      return {
        success: true,
        requiresOtp: true,
        message: 'Profile updated. A verification code has been dispatched. Check your server terminal console if running locally.'
      };
    }

    return { success: true, message: 'Profile updated successfully!' };
  } catch (error) {
    console.error('Failed to update account profile:', error);
    return { success: false, error: 'Database update failed.' };
  }
}

// ==========================================
// Contact Update Verification Actions
// ==========================================

export async function verifyEmailUpdateAction(userId: string, otpInput: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.pendingEmail || !user.otpCode || !user.otpExpiresAt) {
      return { success: false, error: 'No pending email change request found.' };
    }

    if (new Date() > user.otpExpiresAt) {
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }

    if (user.otpCode !== otpInput.trim()) {
      return { success: false, error: 'Invalid verification code.' };
    }

    // Commit pending email change
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: user.pendingEmail,
        isEmailVerified: true,
        pendingEmail: null,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    revalidatePath('/dashboard/account');
    return { success: true, message: 'Email updated successfully!' };
  } catch (error) {
    console.error('Verify email update error:', error);
    return { success: false, error: 'Failed to verify email update.' };
  }
}

export async function verifyPhoneUpdateAction(userId: string, otpInput: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.pendingPhone || !user.otpCode || !user.otpExpiresAt) {
      return { success: false, error: 'No pending phone number change request found.' };
    }

    if (new Date() > user.otpExpiresAt) {
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }

    if (user.otpCode !== otpInput.trim()) {
      return { success: false, error: 'Invalid verification code.' };
    }

    // Commit pending phone change
    await prisma.user.update({
      where: { id: userId },
      data: {
        phone: user.pendingPhone,
        isPhoneVerified: true,
        pendingPhone: null,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    revalidatePath('/dashboard/account');
    return { success: true, message: 'Phone number updated successfully!' };
  } catch (error) {
    console.error('Verify phone update error:', error);
    return { success: false, error: 'Failed to verify phone update.' };
  }
}

// ==========================================
// Password Management Actions
// ==========================================

export async function changePasswordAction(formData: FormData) {
  const userId = (formData.get('userId') as string)?.trim();
  const currentPassword = (formData.get('currentPassword') as string)?.trim();
  const newPassword = (formData.get('newPassword') as string)?.trim();
  const confirmPassword = (formData.get('confirmPassword') as string)?.trim();

  if (!userId) {
    return { success: false, error: 'User session identifier is missing.' };
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: 'All password fields are required.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'New passwords do not match.' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      return { success: false, error: 'User not found or password authentication not configured for this account.' };
    }

    // Verify current password via bcrypt
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return { success: false, error: 'Incorrect current password.' };
    }

    // Hash the new password securely
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    revalidatePath('/dashboard/account');
    return { success: true, message: 'Password updated successfully!' };
  } catch (error) {
    console.error('Failed to update password:', error);
    return { success: false, error: 'An error occurred while updating your password.' };
  }
}

// ==========================================
// Doctor <-> Receptionist Connections
// ==========================================

export async function sendConnectionRequest(senderId: string, senderRole: string, targetEmail: string) {
  const targetUser = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!targetUser) {
    return { success: false, error: 'User not found with this email address.' };
  }

  if (targetUser.role === senderRole) {
    return { success: false, error: `You cannot connect with another ${senderRole.toLowerCase()}.` };
  }

  const doctorId = senderRole === 'DOCTOR' ? senderId : targetUser.id;
  const receptionistId = senderRole === 'RECEPTIONIST' ? senderId : targetUser.id;

  try {
    await prisma.staffConnection.create({
      data: {
        doctorId,
        receptionistId,
        status: 'PENDING',
        initiatedBy: senderRole,
      },
    });

    revalidatePath('/dashboard/account');
    return { success: true, message: 'Connection request sent successfully!' };
  } catch (err) {
    return { success: false, error: 'Connection request already exists between these users.' };
  }
}

export async function updateConnectionStatus(connectionId: string, status: 'APPROVED' | 'REJECTED') {
  try {
    await prisma.staffConnection.update({
      where: { id: connectionId },
      data: { status },
    });

    revalidatePath('/dashboard/account');
    revalidatePath('/dashboard/receptionist');
    revalidatePath('/dashboard/doctor');
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to update request status.' };
  }
}

// ==========================================
// Admin <-> Medical Staff (Doctor/Receptionist) Connections
// ==========================================

export async function sendAdminConnectionRequest(senderId: string, senderRole: string, targetEmail: string) {
  const targetUser = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!targetUser) {
    return { success: false, error: 'User not found with this email address.' };
  }

  const isSenderAdmin = senderRole === 'ADMIN';
  const isTargetStaff = targetUser.role === 'DOCTOR' || targetUser.role === 'RECEPTIONIST';
  const isSenderStaff = senderRole === 'DOCTOR' || senderRole === 'RECEPTIONIST';
  const isTargetAdmin = targetUser.role === 'ADMIN';

  if (!((isSenderAdmin && isTargetStaff) || (isSenderStaff && isTargetAdmin))) {
    return { success: false, error: 'Connections can only be established between an Administrator and Medical Staff.' };
  }

  const adminId = isSenderAdmin ? senderId : targetUser.id;
  const targetId = isSenderAdmin ? targetUser.id : senderId;
  const initiatedBy = isSenderAdmin ? 'ADMIN' : 'STAFF';

  try {
    const existingConnection = await prisma.adminStaffConnection.findFirst({
      where: {
        targetId,
        status: { in: ['PENDING', 'APPROVED'] }
      },
      include: {
        admin: { select: { name: true } },
      },
    });

    if (existingConnection) {
      const currentAdminName = existingConnection.admin?.name || 'another administrator';

      if (isSenderAdmin) {
        return {
          success: false,
          error: `⚠️ This staff member is already assigned to ${currentAdminName}. They must leave their current admin before you can connect with them.`
        };
      } else {
        return {
          success: false,
          error: `⚠️ You are already assigned to ${currentAdminName}. You must be removed by your current admin before you can send a request to another.`
        };
      }
    }

    await prisma.adminStaffConnection.deleteMany({
      where: { targetId, status: 'REJECTED' },
    });

    await prisma.adminStaffConnection.create({
      data: {
        adminId,
        targetId,
        status: 'PENDING',
        initiatedBy,
      },
    });

    revalidatePath('/dashboard/account');
    revalidatePath('/dashboard/staff-admin');
    return { success: true, message: 'Administrative connection request sent successfully!' };
  } catch (err) {
    console.error('Send admin connection error:', err);
    return { success: false, error: 'Failed to send administrative connection request.' };
  }
}

export async function updateAdminConnectionStatus(connectionId: string, status: 'APPROVED' | 'REJECTED') {
  try {
    await prisma.adminStaffConnection.update({
      where: { id: connectionId },
      data: { status },
    });

    revalidatePath('/dashboard/account');
    revalidatePath('/dashboard/staff-admin');
    revalidatePath('/dashboard/assigned-admin');
    return { success: true };
  } catch (err) {
    console.error('Update admin connection status error:', err);
    return { success: false, error: 'Failed to update request status.' };
  }
}