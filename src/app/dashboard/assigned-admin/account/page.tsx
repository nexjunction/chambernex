// src/app/dashboard/assigned-admin/account/page.tsx
import { prisma } from '@/lib/prisma';
import AccountClient from '../../account/AccountClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AssignedAdminAccountPage() {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get('userEmail')?.value;

  if (!userEmail) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  // Ensure user exists and has admin privileges
  if (!user || user.role !== 'ADMIN') {
    redirect('/login');
  }

  // Fetch all admin <-> staff connections involving this assigned admin
  const adminConnections = await prisma.adminStaffConnection.findMany({
    where: {
      adminId: user.id,
    },
    include: {
      admin: {
        select: { id: true, name: true, email: true, position: true, phone: true, avatarUrl: true },
      },
      target: {
        select: { id: true, name: true, email: true, position: true, role: true, phone: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <AccountClient
      user={user}
      initialConnections={[]}
      initialAdminConnections={adminConnections}
    />
  );
}