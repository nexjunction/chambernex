// src/app/dashboard/assigned-admin/page.tsx
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AssignedAdminPortalContent from './AssignedAdminPortalContent';

export default async function AssignedAdminDashboardPage() {
  // Role & Session Verification
  const cookieStore = await cookies();
  const userEmail = cookieStore.get('userEmail')?.value;

  if (!userEmail) {
    redirect('/login');
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      adminConnections: {
        include: { target: true },
      },
    },
  });

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center text-red-400">
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-xs text-slate-400 mt-2">You do not have administrative privileges to view this portal.</p>
      </div>
    );
  }

  return <AssignedAdminPortalContent currentUser={currentUser} />;
}