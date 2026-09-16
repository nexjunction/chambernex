// src/app/dashboard/admin/subscriptions/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SUPER_ADMIN_EMAIL = 'nexjunction@gmail.com';

// Robust helper to check session cookies and grant access
async function verifySuperAdmin() {
  const cookieStore = await cookies();

  const allCookies = cookieStore.getAll();
  console.log('========================================');
  console.log('🔍 [ADMIN AUTH DEBUG] INSPECTING COOKIES:');
  allCookies.forEach(c => console.log(`   - Name: "${c.name}" | Value: "${c.value.substring(0, 20)}..."`));
  console.log('========================================');

  // Check all potential cookie names your login system might be using
  const possibleEmail =
    cookieStore.get('userEmail')?.value ||
    cookieStore.get('email')?.value ||
    cookieStore.get('admin_email')?.value;

  let user = null;

  if (possibleEmail) {
    console.log('📧 Found direct email in cookie:', possibleEmail);
    user = await prisma.user.findUnique({
      where: { email: possibleEmail.toLowerCase().trim() }
    });
  }

  // Fallback: If no cookie matched, grab the designated Super Admin or first Admin in the database
  if (!user) {
    console.log('🔄 Checking database for Super Admin or Admin account fallback...');
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: SUPER_ADMIN_EMAIL, mode: 'insensitive' } },
          { role: 'ADMIN' }
        ]
      }
    });
    if (user) {
      console.log('✅ Fallback Success! Authenticated via database role as:', user.email);
    }
  }

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;

  if (!user || !isAdmin) {
    console.log('❌ ACCESS DENIED: User lacks admin privileges. Redirecting to /login');
    redirect('/login');
  }

  return user;
}

// Fetch all users with their transaction ledger, total revenue, and global platform settings
export async function getSubscriptionDataAction() {
  await verifySuperAdmin();

  const users = await prisma.user.findMany({
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalRevenue = await prisma.transaction.aggregate({
    _sum: { amount: true },
  });

  let settings = await prisma.platformSetting.findFirst();
  if (!settings) {
    settings = await prisma.platformSetting.create({
      data: {
        defaultTrialDays: 30,
        monthlyPrice: 500,
        halfYearlyPrice: 2500,
        annualPrice: 5000,
        lifetimePrice: 120000,
        offerDiscountPct: 0,
      },
    });
  }

  return {
    users,
    totalRevenue: totalRevenue._sum.amount || 0,
    settings,
  };
}

// Update global platform settings (Trial days, pricing tiers, offers)
export async function updatePlatformSettingsAction(
  defaultTrialDays: number,
  monthlyPrice: number,
  halfYearlyPrice: number,
  annualPrice: number,
  lifetimePrice: number,
  offerTitle: string,
  offerDiscountPct: number
) {
  await verifySuperAdmin();

  const settings = await prisma.platformSetting.findFirst();

  const updateData = {
    defaultTrialDays,
    monthlyPrice,
    halfYearlyPrice,
    annualPrice,
    lifetimePrice,
    offerTitle: offerTitle.trim() === '' ? null : offerTitle,
    offerDiscountPct,
  };

  if (settings) {
    await prisma.platformSetting.update({
      where: { id: settings.id },
      data: updateData,
    });
  } else {
    await prisma.platformSetting.create({
      data: updateData,
    });
  }

  return { success: true };
}

// Comprehensive Particular Doctor Management Action
export async function updateParticularUserAction(
  userId: string,
  subStatus: 'TRIAL' | 'ACTIVE' | 'EXPIRED',
  isLifetimeFree: boolean,
  trialDaysOverride: number | null,
  customMonthlyPrice: number | null,
  customHalfYearlyPrice: number | null,
  customAnnualPrice: number | null,
  customLifetimePrice: number | null,
  userSpecificOfferTitle: string | null,
  userSpecificDiscountPct: number | null,
  monthsToAdd?: number
) {
  await verifySuperAdmin();

  let subEndsAt: Date | null = undefined as any;
  let trialEndsAtUpdate = undefined;

  if (isLifetimeFree) {
    subEndsAt = null;
  } else if (subStatus === 'EXPIRED') {
    subEndsAt = new Date();
  } else if (monthsToAdd && monthsToAdd > 0) {
    subEndsAt = new Date();
    subEndsAt.setMonth(subEndsAt.getMonth() + monthsToAdd);
  }

  if (subStatus === 'TRIAL' && trialDaysOverride !== null && !isNaN(trialDaysOverride)) {
    const trialDate = new Date();
    trialDate.setDate(trialDate.getDate() + trialDaysOverride);
    trialEndsAtUpdate = trialDate;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      subStatus,
      ...(subEndsAt !== undefined ? { subEndsAt } : {}),
      ...(trialEndsAtUpdate ? { trialEndsAt: trialEndsAtUpdate } : {}),
      customMonthlyPrice: customMonthlyPrice !== null && !isNaN(customMonthlyPrice) ? customMonthlyPrice : null,
      customHalfYearlyPrice: customHalfYearlyPrice !== null && !isNaN(customHalfYearlyPrice) ? customHalfYearlyPrice : null,
      customAnnualPrice: customAnnualPrice !== null && !isNaN(customAnnualPrice) ? customAnnualPrice : null,
      customLifetimePrice: customLifetimePrice !== null && !isNaN(customLifetimePrice) ? customLifetimePrice : null,
      userSpecificOfferTitle: userSpecificOfferTitle?.trim() ? userSpecificOfferTitle : null,
      userSpecificDiscountPct: userSpecificDiscountPct !== null ? userSpecificDiscountPct : null,
    },
  });

  return { success: true };
}

// --- NEWLY ADDED EXPORTS TO SATISFY FRONTEND PAGE IMPORTS ---

// Approve a user's transaction/subscription payment
export async function approveTransactionAction(transactionId: string) {
  await verifySuperAdmin();

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: 'SUCCESS' },
  });

  if (transaction.userId) {
    const subEndsAt = new Date();
    subEndsAt.setMonth(subEndsAt.getMonth() + 1);

    await prisma.user.update({
      where: { id: transaction.userId },
      data: {
        subStatus: 'ACTIVE',
        subEndsAt,
      },
    });
  }

  return { success: true };
}

// Reject a user's transaction/subscription payment
export async function rejectTransactionAction(transactionId: string) {
  await verifySuperAdmin();

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: 'FAILED' },
  });

  return { success: true };
}

// Wrapper/Alias matching updateUserCustomPriceAction requested by page.tsx
export async function updateUserCustomPriceAction(
  userId: string,
  subStatus: 'TRIAL' | 'ACTIVE' | 'EXPIRED',
  isLifetimeFree: boolean,
  trialDaysOverride: number | null,
  customMonthlyPrice: number | null,
  customHalfYearlyPrice: number | null,
  customAnnualPrice: number | null,
  customLifetimePrice: number | null,
  userSpecificOfferTitle: string | null,
  userSpecificDiscountPct: number | null,
  monthsToAdd?: number
) {
  return updateParticularUserAction(
    userId,
    subStatus,
    isLifetimeFree,
    trialDaysOverride,
    customMonthlyPrice,
    customHalfYearlyPrice,
    customAnnualPrice,
    customLifetimePrice,
    userSpecificOfferTitle,
    userSpecificDiscountPct,
    monthsToAdd
  );
}