// src/app/subscription/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function submitPlanPaymentAction(
  planType: 'MONTHLY' | 'HALF_YEARLY' | 'ANNUAL' | 'LIFETIME' | 'CUSTOM',
  paymentMethod: string,
  trxId: string
) {
  const cookieStore = await cookies();
  const email = cookieStore.get('userEmail')?.value;

  if (!email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    redirect('/login');
  }

  // Fetch global platform settings for standard pricing fallbacks
  const settings = await prisma.platformSetting.findFirst();

  let baseAmount = 500;
  let durationMonths = 0;
  let isLifetime = false;

  // Determine base price depending on plan type, checking user custom overrides first, then global settings
  switch (planType) {
    case 'MONTHLY':
      baseAmount = user.customMonthlyPrice ?? settings?.monthlyPrice ?? 500;
      durationMonths = 1;
      break;
    case 'HALF_YEARLY':
      baseAmount = user.customHalfYearlyPrice ?? settings?.halfYearlyPrice ?? 2500;
      durationMonths = 6;
      break;
    case 'ANNUAL':
      baseAmount = user.customAnnualPrice ?? settings?.annualPrice ?? 5000;
      durationMonths = 12;
      break;
    case 'LIFETIME':
      baseAmount = user.customLifetimePrice ?? settings?.lifetimePrice ?? 120000;
      isLifetime = true;
      break;
    case 'CUSTOM':
      baseAmount = user.customMonthlyPrice ?? 0;
      durationMonths = 1;
      break;
  }

  // Apply user-specific promotional discount percentage if present
  let finalAmount = baseAmount;
  if (user.userSpecificDiscountPct && user.userSpecificDiscountPct > 0) {
    const discountFactor = (100 - user.userSpecificDiscountPct) / 100;
    finalAmount = Math.round(baseAmount * discountFactor);
  } else if (settings?.offerDiscountPct && settings.offerDiscountPct > 0 && !user.customMonthlyPrice && !user.customHalfYearlyPrice && !user.customAnnualPrice && !user.customLifetimePrice) {
    // Fall back to global discount only if no custom prices override it
    const discountFactor = (100 - settings.offerDiscountPct) / 100;
    finalAmount = Math.round(baseAmount * discountFactor);
  }

  const startDate = new Date();
  let endDate: Date | null = null;

  if (!isLifetime) {
    endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);
  }

  // 1. Record the financial transaction with PENDING status (DO NOT activate user yet!)
  await prisma.transaction.create({
    data: {
      userId: user.id,
      amount: finalAmount,
      planType,
      paymentMethod,
      trxId,
      status: 'PENDING',
      startDate,
      endDate,
    },
  });

  // Note: We intentionally do NOT update user.subStatus to 'ACTIVE' here.
  // The user remains locked out until an admin verifies this specific transaction.

  revalidatePath('/subscription');
  return { success: true };
}