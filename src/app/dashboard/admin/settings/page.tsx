// src/app/dashboard/admin/settings/page.tsx
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminSettingsClient from './AdminSettingsClient';

export default async function AdminSettingsPage() {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get('userEmail')?.value;

  if (!userEmail) {
    redirect('/login');
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!currentUser || currentUser.role !== 'ADMIN') {
    redirect('/dashboard/admin');
  }

  return <AdminSettingsClient currentUser={{ name: currentUser.name, email: currentUser.email }} />;
}