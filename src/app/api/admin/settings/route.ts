// src/app/api/admin/settings/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.platformSetting.findFirst();

    // Fallback if settings row doesn't exist yet
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

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch platform settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}