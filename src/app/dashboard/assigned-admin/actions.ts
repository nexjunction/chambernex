// src/app/dashboard/assigned-admin/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function searchStaff(query: string) {
  if (!query || query.trim() === '') return [];

  const searchTerm = query.trim();
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: { in: ['DOCTOR', 'RECEPTIONIST'] },
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm } },
        ],
      },
      include: {
        targetConnections: {
          include: {
            admin: { select: { name: true } } // Include the assigned admin's name for search checks
          }
        },
      },
      take: 5,
    });
    return staff;
  } catch (err) {
    console.error('Search staff error:', err);
    return [];
  }
}

export async function sendConnectionRequest(adminId: string, targetId: string) {
  try {
    // Check if staff is already connected to any admin and fetch their name
    const existing = await prisma.adminStaffConnection.findUnique({
      where: { targetId },
      include: {
        admin: { select: { name: true } },
      },
    });

    if (existing) {
      const currentAdminName = existing.admin?.name || 'another administrator';
      return {
        success: false,
        error: `⚠️ This staff member is already assigned to ${currentAdminName}. They must leave their current admin before you can connect with them.`
      };
    }

    await prisma.adminStaffConnection.create({
      data: {
        adminId,
        targetId,
        status: 'PENDING',
        initiatedBy: 'ADMIN',
      },
    });
    revalidatePath('/dashboard/assigned-admin');
    return { success: true };
  } catch (err) {
    console.error('Connection request error:', err);
    return { success: false, error: 'Failed to send connection request.' };
  }
}

export async function updateConnectionStatus(connectionId: string, status: 'APPROVED' | 'REJECTED') {
  try {
    if (status === 'REJECTED') {
      await prisma.adminStaffConnection.delete({ where: { id: connectionId } });
    } else {
      await prisma.adminStaffConnection.update({
        where: { id: connectionId },
        data: { status },
      });
    }
    revalidatePath('/dashboard/assigned-admin');
    return { success: true };
  } catch (err) {
    console.error('Update status error:', err);
    return { success: false, error: 'Failed to update connection status.' };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.set('userEmail', '', { maxAge: 0, path: '/' });
  redirect('/login');
}