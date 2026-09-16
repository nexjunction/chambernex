'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// 1. Send connection request (by target email or ID)
export async function sendConnectionRequest(senderId: string, senderRole: string, targetIdentifier: string) {
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: targetIdentifier },
        { id: targetIdentifier }
      ]
    }
  });

  if (!targetUser) {
    return { success: false, error: 'User not found with this email or code.' };
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

// 2. Accept or Reject a Request
export async function updateConnectionStatus(connectionId: string, status: 'APPROVED' | 'REJECTED') {
  try {
    await prisma.staffConnection.update({
      where: { id: connectionId },
      data: { status },
    });

    revalidatePath('/dashboard/account');
    return { success: true, message: `Request ${status.toLowerCase()}!` };
  } catch (err) {
    return { success: false, error: 'Failed to update request status.' };
  }
}