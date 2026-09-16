// src/app/api/user/subscription/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const SUPER_ADMIN_EMAIL = 'nexjunction@gmail.com';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get('userEmail')?.value;

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch the logged-in user's details including trial and creation dates
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        subStatus: true,
        planType: true,
        subEndsAt: true,
        trialEndsAt: true,
        createdAt: true,
        customMonthlyPrice: true,
        customHalfYearlyPrice: true,
        customAnnualPrice: true,
        customLifetimePrice: true,
        userSpecificOfferTitle: true,
        userSpecificDiscountPct: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch global platform settings
    let settings = await prisma.platformSetting.findFirst();

    // 3. Compute if subscription or 30-day trial is truly active
    const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    let isSubscriptionActive = true;

    if (!isSuperAdmin && user.role !== 'ADMIN') {
      const now = new Date();

      if (user.subStatus === 'ACTIVE') {
        isSubscriptionActive = user.subEndsAt ? new Date(user.subEndsAt) > now : true;
      } else if (user.subStatus === 'EXPIRED') {
        isSubscriptionActive = false;
      } else {
        // Fallback trial check: 30 days from trialEndsAt or createdAt
        let trialEnd: Date;
        if (user.trialEndsAt) {
          trialEnd = new Date(user.trialEndsAt);
        } else if (user.createdAt) {
          trialEnd = new Date(new Date(user.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
        } else {
          trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
        isSubscriptionActive = trialEnd > now;
      }
    }

    return NextResponse.json({
      user,
      settings,
      isSubscriptionActive, // Passed to frontend
    });
  } catch (error: any) {
    console.error('Error fetching user subscription data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}