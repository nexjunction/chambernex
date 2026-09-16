import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function assertUserIsFullyVerified(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isEmailVerified: true, isPhoneVerified: true, role: true }
  });

  if (!user) {
    redirect('/auth/login');
  }

  // If either email or phone is unverified, redirect to a dedicated verification screen or flow
  if (!user.isEmailVerified || !user.isPhoneVerified) {
    redirect('/auth/verify-pending');
  }

  return user;
}
