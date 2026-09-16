// src/app/api/payment/success/route.ts (or your equivalent route path)
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activateSubscriptionAutomatically } from '@/app/dashboard/admin/actions';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const tranId = formData.get('tran_id')?.toString();
    const valId = formData.get('val_id')?.toString();
    const status = formData.get('status')?.toString();

    if (!tranId || status !== 'VALID') {
      return NextResponse.redirect(new URL('/subscription?error=InvalidPayment', req.url));
    }

    // 1. Find the pending transaction created during initiation
    const existingTransaction = await prisma.transaction.findUnique({
      where: { trxId: tranId },
      include: { user: true },
    });

    if (!existingTransaction) {
      return NextResponse.redirect(new URL('/subscription?error=TransactionNotFound', req.url));
    }

    // 2. Trigger the centralized automated activation helper
    const activationResult = await activateSubscriptionAutomatically(
      existingTransaction.userId,
      existingTransaction.planType,
      existingTransaction.amount,
      valId || tranId,
      existingTransaction.paymentMethod || 'SSLCOMMERZ'
    );

    if (!activationResult.success) {
      console.error('Failed to trigger automatic subscription activation:', activationResult.error);
      return NextResponse.redirect(new URL('/subscription?error=ActivationFailed', req.url), { status: 303 });
    }

    return NextResponse.redirect(new URL('/dashboard/doctor', req.url), { status: 303 });
  } catch (error) {
    console.error('Payment success processing error:', error);
    return NextResponse.redirect(new URL('/subscription?error=ServerError', req.url), { status: 303 });
  }
}