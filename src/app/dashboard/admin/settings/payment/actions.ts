'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const SUPER_ADMIN_EMAIL = 'nexjunction@gmail.com';

export async function getPaymentConfigAction() {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get('userEmail')?.value;

    if (!email) return null;

    // Verify super admin
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      return null;
    }

    const config = await prisma.paymentConfig.findUnique({
      where: { gatewayName: 'SSLCOMMERZ' },
    });

    if (!config) return null;

    // Mask password sent to client to prevent exposure in network/browser state
    return {
      storeId: config.storeId,
      storePassword: config.storePassword ? '••••••••••••••••' : '',
      isLive: config.isLive,
    };
  } catch (error) {
    return null;
  }
}

export async function savePaymentConfigAction(storeId: string, storePassword: string, isLive: boolean) {
  const cookieStore = await cookies();
  const email = cookieStore.get('userEmail')?.value;

  if (!email) return { success: false, error: 'Unauthorized' };

  // Verify super admin
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    return { success: false, error: 'Forbidden' };
  }

  // Check if password is left masked, and preserve the existing secure password if so
  const existing = await prisma.paymentConfig.findUnique({
    where: { gatewayName: 'SSLCOMMERZ' },
  });

  let finalPassword = storePassword;
  if (storePassword.includes('••••') && existing) {
    finalPassword = existing.storePassword;
  }

  await prisma.paymentConfig.upsert({
    where: { gatewayName: 'SSLCOMMERZ' },
    update: { storeId, storePassword: finalPassword, isLive },
    create: { gatewayName: 'SSLCOMMERZ', storeId, storePassword: finalPassword, isLive },
  });

  revalidatePath('/subscription');
  revalidatePath('/dashboard/admin/settings/payment');
  return { success: true };
}