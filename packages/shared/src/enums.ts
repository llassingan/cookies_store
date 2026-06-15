import { z } from 'zod';

export const FulfillmentMethod = z.enum(['pickup', 'delivery']);
export type FulfillmentMethod = z.infer<typeof FulfillmentMethod>;

export const OrderStatus = z.enum([
  'awaiting_payment',
  'paid',
  'queued',
  'baking',
  'ready',
  'completed',
  'cancelled',
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const PaymentStatus = z.enum(['pending', 'paid', 'failed', 'expired', 'refunded']);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const OrderChannel = z.enum(['web']);
export type OrderChannel = z.infer<typeof OrderChannel>;
