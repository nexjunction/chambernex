// src/app/dashboard/account/page.tsx
import { prisma } from '@/lib/prisma';
import AccountClient from './AccountClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AccountPage() {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get('userEmail')?.value;

  let user = null;

  if (userEmail) {
    user = await prisma.user.findUnique({
      where: { email: userEmail },
    });
  }

  if (!user) {
    redirect('/login');
  }

  // Fetch all doctor <-> receptionist connections involving this user
  const connections = await prisma.staffConnection.findMany({
    where: {
      OR: [
        { doctorId: user.id },
        { receptionistId: user.id },
      ],
    },
    include: {
      doctor: {
        select: { id: true, name: true, email: true, position: true, degrees: true },
      },
      receptionist: {
        select: { id: true, name: true, email: true, position: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Fetch all admin <-> staff connections involving this user
  const adminConnections = await prisma.adminStaffConnection.findMany({
    where: {
      OR: [
        { adminId: user.id },
        { targetId: user.id },
      ],
    },
    include: {
      admin: {
        select: { id: true, name: true, email: true, position: true },
      },
      target: {
        select: { id: true, name: true, email: true, position: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <AccountClient
      user={user}
      initialConnections={connections}
      initialAdminConnections={adminConnections}
    />
  );
}