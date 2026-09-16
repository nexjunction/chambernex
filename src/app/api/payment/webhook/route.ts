// src/app/api/payment/webhook/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    // SSLCommerz sends IPN/Webhook data as application/x-www-form-urlencoded
    const formData = await req.formData();
    const tran_id = formData.get('tran_id')?.toString();
    const status = formData.get('status')?.toString();
    const val_id = formData.get('val_id')?.toString();

    if (!tran_id) {
      return NextResponse.json({ error: 'Transaction ID missing' }, { status: 400 });
    }

    // 1. Verify that the transaction exists in your database
    const transaction = await prisma.transaction.findUnique({
      where: { trxId: tran_id },
      include: { user: true },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Prevent re-processing already completed transactions
    if (transaction.status === 'COMPLETED') {
      return NextResponse.json({ success: true, message: 'Transaction already processed' });
    }

    // 2. Check if payment was successful
    if (status === 'VALID' || status === 'COMPLETED' || status === 'SUCCESS') {
      let durationMonths = 1;
      if (transaction.planType === 'HALF_YEARLY') durationMonths = 6;
      if (transaction.planType === 'ANNUALLY') durationMonths = 12;

      const now = new Date();
      const subEndsAt =
        transaction.planType === 'LIFETIME'
          ? null
          : new Date(new Date().setMonth(now.getMonth() + durationMonths));

      // 3. Atomically update the transaction status and user subscription
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            trxId: val_id || tranId,
          },
        }),
        prisma.user.update({
          where: { id: transaction.userId },
          data: {
            subStatus: 'ACTIVE',
            planType: transaction.planType,
            subEndsAt: subEndsAt,
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Subscription activated successfully' });
    } else {
      // Handle failed or cancelled transactions
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });

      return NextResponse.json({ success: false, message: 'Transaction failed or invalid' });
    }
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}