import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
// @ts-ignore
const SSLCommerzPayment = require('sslcommerz-lts');

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('userEmail')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const planType = body.planId || 'MONTHLY'; // e.g., MONTHLY, HALF_YEARLY, ANNUALLY, LIFETIME

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 1. Fetch dynamic platform settings for plan prices
    const settings = await prisma.platformSetting.findFirst();
    const paymentSetting = await prisma.paymentSetting.findFirst();

    if (!paymentSetting || !paymentSetting.storeId || !paymentSetting.storePassword) {
      return NextResponse.json({ error: 'Payment gateway is not configured by the admin.' }, { status: 400 });
    }

    // 2. Determine price based on admin platform settings and user custom overrides
    let basePrice = 500;
    let planName = 'Monthly Plan';

    if (planType === 'HALF_YEARLY') {
      basePrice = settings?.halfYearlyPrice ?? 2500;
      planName = 'Half-Yearly Plan';
    } else if (planType === 'ANNUALLY') {
      basePrice = settings?.annualPrice ?? 5000;
      planName = 'Annual Plan';
    } else if (planType === 'LIFETIME') {
      basePrice = settings?.lifetimePrice ?? 120000;
      planName = 'Lifetime Plan';
    } else {
      basePrice = settings?.monthlyPrice ?? 500;
    }

    // Apply custom price or discount if configured for this specific user
    const priceToUse = user.customPrice ?? basePrice;
    const discountPct = user.userSpecificDiscountPct ?? settings?.offerDiscountPct ?? 0;
    const finalAmount = priceToUse - (priceToUse * discountPct) / 100;

    // 3. Generate Unique Transaction ID
    const tranId = `SUB_${user.id}_${planType}_${Date.now()}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 4. Calculate subscription start and end dates
    const startDate = new Date();
    let durationMonths = 1;
    if (planType === 'HALF_YEARLY') durationMonths = 6;
    if (planType === 'ANNUALLY') durationMonths = 12;

    const endDate = planType === 'LIFETIME'
      ? null
      : new Date(new Date().setMonth(startDate.getMonth() + durationMonths));

    // 5. Create PENDING transaction in database so success/fail/cancel routes can track it
    await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: finalAmount,
        planType: planType,
        discountPct: discountPct,
        paymentMethod: 'SSLCOMMERZ',
        trxId: tranId,
        status: 'PENDING',
        startDate: startDate,
        endDate: endDate,
      },
    });

    // 6. Setup SSLCommerz Gateway Parameters
    const data = {
      total_amount: finalAmount,
      currency: 'BDT',
      tran_id: tranId,
      success_url: `${baseUrl}/api/payment/success`,
      fail_url: `${baseUrl}/api/payment/fail`,
      cancel_url: `${baseUrl}/api/payment/cancel`,
      ipn_url: `${baseUrl}/api/payment/ipn`,
      shipping_method: 'No',
      product_name: planName,
      product_category: 'SaaS Subscription',
      product_profile: 'general',
      cus_name: user.name || user.email.split('@')[0],
      cus_email: user.email,
      cus_add1: user.address || 'Dhaka',
      cus_city: 'Dhaka',
      cus_postcode: '1212',
      cus_country: 'Bangladesh',
      cus_phone: user.phone || '01711111111',
      ship_name: 'N/A',
      ship_add1: 'N/A',
      ship_city: 'N/A',
      ship_postcode: 'N/A',
      ship_country: 'Bangladesh',
    };

    const sslcz = new SSLCommerzPayment(
      paymentSetting.storeId,
      paymentSetting.storePassword,
      paymentSetting.isLive
    );

    const apiResponse = await sslcz.init(data);

    if (apiResponse?.GatewayPageURL) {
      return NextResponse.json({ url: apiResponse.GatewayPageURL });
    } else {
      return NextResponse.json({ error: 'Failed to generate payment gateway redirection URL.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Payment initialization error:', error);
    return NextResponse.json({ error: 'Internal server error during payment initialization.' }, { status: 500 });
  }
}