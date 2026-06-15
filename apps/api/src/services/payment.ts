import type { Order } from '@cookies/shared';
import { getEnv } from '../env';
import { sendOrderConfirmation } from './email';
import { markOrderPaid, markOrderPaymentFailed } from './order';

export type CreatePaymentIntentArgs = {
  orderId: string;
  amount: number;
  paymentReference: string;
};

export type CreatePaymentIntentResult = {
  paymentUrl: string;
  expiresAt: string;
};

export async function createPaymentIntent(
  args: CreatePaymentIntentArgs,
): Promise<CreatePaymentIntentResult> {
  const env = getEnv();
  if (env.PAYMENT_PROVIDER === 'mock') {
    return {
      paymentUrl: `${env.PUBLIC_BASE_URL}/mock-pay/${args.paymentReference}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }
  return {
    paymentUrl: `${env.PUBLIC_BASE_URL}/mock-pay/${args.paymentReference}`,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

export async function handlePaymentWebhook(args: {
  reference: string;
  status: 'paid' | 'failed' | 'expired';
  paidAt?: string;
}): Promise<{ ok: true; order: Order | null } | { ok: false; reason: string }> {
  if (args.status === 'paid') {
    const paidAt = args.paidAt ? new Date(args.paidAt) : new Date();
    const updated = await markOrderPaid(args.reference, paidAt);
    if (updated) {
      await sendOrderConfirmation(updated).catch((e) => {
        console.error('[email] sendOrderConfirmation failed', e);
      });
    }
    return { ok: true, order: updated };
  }
  if (args.status === 'failed' || args.status === 'expired') {
    await markOrderPaymentFailed(args.reference);
    return { ok: true, order: null };
  }
  return { ok: false, reason: `Unsupported status: ${args.status}` };
}
