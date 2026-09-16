import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const tranId = formData.get('tran_id')?.toString();

    // Mark the transaction as CANCELLED in the database if transaction ID exists
    if (tranId) {
      await prisma.transaction.updateMany({
        where: { trxId: tranId },
        data: { status: 'CANCELLED' },
      }).catch(() => {
        // Graceful fallback if transaction wasn't found
      });
    }

    return NextResponse.redirect(new URL('/subscription?error=PaymentCancelled', req.url), {
      status: 303,
    });
  } catch (error) {
    console.error('Payment cancellation processing error:', error);
    return NextResponse.redirect(new URL('/subscription?error=ServerError', req.url), {
      status: 303,
    });
  }
}