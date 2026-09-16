'server-only';

import { prisma } from '@/lib/prisma';
// @ts-expect-error sslcommerz-lts has no type definitions out of the box
import SSLCommerzPayment from 'sslcommerz-lts';

export async function initiatePayment(userId: string, planType: string) {
  try {
    // 1. Fetch user and platform pricing settings
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const settings = await prisma.platformSetting.findFirst();
    const paymentSetting = await prisma.paymentSetting.findFirst();

    if (!user) throw new Error('User not found');
    if (!settings) throw new Error('Platform pricing settings not configured');

    // Fallback store credentials if not yet set in database
    const store_id = paymentSetting?.storeId || process.env.SSLCOMMERZ_STORE_ID || 'testbox';
    const store_passwd = paymentSetting?.storePassword || process.env.SSLCOMMERZ_STORE_PASSWORD || 'qwerty';
    const is_live = paymentSetting?.isLive || false;

    // 2. Determine price based on plan type and user-specific offers
    let baseAmount = settings.monthlyPrice;
    if (planType === 'HALF_YEARLY') baseAmount = settings.halfYearlyPrice;
    if (planType === 'ANNUALLY') baseAmount = settings.annualPrice;
    if (planType === 'LIFETIME') baseAmount = settings.lifetimePrice;
    if (user.customPrice) baseAmount = user.customPrice;

    // Apply any user-specific or global discount percentage
    const discountPct = user.userSpecificDiscountPct ?? settings.offerDiscountPct ?? 0;
    const finalAmount = baseAmount - (baseAmount * discountPct) / 100;

    // 3. Generate a unique Transaction ID
    const tranId = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Calculate start and end dates
    const startDate = new Date();
    let durationMonths = 1;
    if (planType === 'HALF_YEARLY') durationMonths = 6;
    if (planType === 'ANNUALLY') durationMonths = 12;

    const endDate = planType === 'LIFETIME'
      ? null
      : new Date(new Date().setMonth(startDate.getMonth() + durationMonths));

    // 4. Create a PENDING transaction entry in your database
    await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: finalAmount,
        planType,
        discountPct,
        paymentMethod: 'BKASH', // Default starting gateway choice
        trxId: tranId,
        status: 'PENDING',
        startDate,
        endDate,
      },
    });

    // 5. Setup SSLCommerz Session Parameters
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const data = {
      total_amount: finalAmount,
      currency: 'BDT',
      tran_id: tranId,
      success_url: `${baseUrl}/api/payment/success?tran_id=${tranId}`,
      fail_url: `${baseUrl}/api/payment/fail?tran_id=${tranId}`,
      cancel_url: `${baseUrl}/api/payment/cancel?tran_id=${tranId}`,
      ipn_url: `${baseUrl}/api/payment/webhook`,
      shipping_method: 'NO',
      product_name: `Subscription Plan - ${planType}`,
      product_category: 'Digital Service',
      product_profile: 'non-physical-goods',
      cus_name: user.name || 'Platform User',
      cus_email: user.email,
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_postcode: '1200',
      cus_country: 'Bangladesh',
      cus_phone: user.phone || '01700000000',
    };

    // 6. Request SSLCommerz Gateway Session URL
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(data);

    if (apiResponse?.GatewayPageURL) {
      return { url: apiResponse.GatewayPageURL };
    } else {
      throw new Error('Failed to connect to SSLCommerz payment gateway session.');
    }
  } catch (error: any) {
    console.error('Payment Initiation Error:', error);
    throw new Error(error.message || 'Could not initiate payment');
  }
}