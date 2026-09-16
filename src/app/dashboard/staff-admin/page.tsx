// src/app/dashboard/staff-admin/page.tsx
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { searchAdmins, requestAdminConnection, removeAdminConnection, acceptAdminConnection } from './actions';
import StaffAdminClient from './StaffAdminClient';

export default async function StaffAdminConnectionPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get('userEmail')?.value;

  if (!userEmail) {
    redirect('/login');
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      targetConnections: {
        include: { admin: true },
      },
    },
  });

  if (!currentUser || (currentUser.role !== 'DOCTOR' && currentUser.role !== 'RECEPTIONIST')) {
    redirect('/dashboard');
  }

  const resolvedSearchParams = await searchParams;
  const searchQuery = resolvedSearchParams?.query || '';
  const adminSearchResults = searchQuery ? await searchAdmins(searchQuery) : [];
  const currentConnection = currentUser.targetConnections[0] || null;

  return (
    <StaffAdminClient
      currentUser={{
        id: currentUser.id,
        role: currentUser.role,
      }}
      currentConnection={currentConnection}
      adminSearchResults={adminSearchResults}
      searchQuery={searchQuery}
      onRequestConnection={requestAdminConnection}
      onRemoveConnection={removeAdminConnection}
      onAcceptConnection={acceptAdminConnection}
    />
  );
}