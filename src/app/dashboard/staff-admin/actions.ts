// src/app/dashboard/staff-admin/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function searchAdmins(query: string) {
  if (!query || query.trim() === '') return [];

  const searchTerm = query.trim();
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        OR: [
          { name: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { phone: { contains: searchTerm } },
          { position: { contains: searchTerm } },
        ],
      },
      take: 5,
    });
    return admins;
  } catch (err) {
    console.error('Search admins error:', err);
    return [];
  }
}

// Accepts direct arguments via .bind() and clears stale 1:1 targetId records first
export async function requestAdminConnection(adminId: string, staffId: string) {
  if (!adminId || !staffId) {
    return { success: false, error: 'Missing identifiers.' };
  }

  try {
    // Safely remove any existing/stale connection for this staff member to respect the 1:1 unique constraint
    await prisma.adminStaffConnection.deleteMany({
      where: { targetId: staffId },
    });

    await prisma.adminStaffConnection.create({
      data: {
        adminId,
        targetId: staffId,
        status: 'PENDING',
        initiatedBy: 'STAFF',
      },
    });

    revalidatePath('/dashboard/staff-admin');
    return { success: true };
  } catch (err) {
    console.error('Request admin connection error:', err);
    return { success: false, error: 'Failed to send connection request.' };
  }
}

export async function removeAdminConnection(connectionId: string) {
  try {
    await prisma.adminStaffConnection.delete({
      where: { id: connectionId },
    });
    revalidatePath('/dashboard/staff-admin');
    return { success: true };
  } catch (err) {
    console.error('Remove connection error:', err);
    return { success: false, error: 'Failed to disconnect from admin.' };
  }
}

// Step 1: Action to allow the doctor/staff to accept an incoming request from an admin
export async function acceptAdminConnection(connectionId: string) {
  try {
    await prisma.adminStaffConnection.update({
      where: { id: connectionId },
      data: { status: 'APPROVED' },
    });
    revalidatePath('/dashboard/staff-admin');
    return { success: true };
  } catch (err) {
    console.error('Accept connection error:', err);
    return { success: false, error: 'Failed to accept connection.' };
  }
}