import { z } from 'zod';
import { FulfillmentMethod, OrderStatus, PaymentStatus } from './enums';

export const OrderItem = z
  .object({
    menuItemId: z.string().uuid(),
    name: z.string(),
    /** Captured at order time so menu-price changes do not retroactively rewrite history. */
    unitPrice: z.number().int().nonnegative(),
    quantity: z.number().int().positive(),
    subtotal: z.number().int().nonnegative(),
  })
  .strict();
export type OrderItem = z.infer<typeof OrderItem>;

export const CartQuote = z
  .object({
    items: z.array(OrderItem),
    subtotal: z.number().int().nonnegative(),
    deliveryFee: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    earliestBakeDate: z.string(),
    estimatedReadyDate: z.string(),
    estimatedReadyAt: z.string().datetime(),
    crossesCutoff: z.boolean(),
    blockedReason: z.string().nullable(),
  })
  .strict();
export type CartQuote = z.infer<typeof CartQuote>;

export const CartItemInput = z
  .object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })
  .strict();
export type CartItemInput = z.infer<typeof CartItemInput>;

export const QuoteCartRequest = z
  .object({
    items: z.array(CartItemInput).min(1).max(50),
    fulfillment: FulfillmentMethod,
  })
  .strict();
export type QuoteCartRequest = z.infer<typeof QuoteCartRequest>;

export const CustomerInfo = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().min(6).max(32),
    address: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();
export type CustomerInfo = z.infer<typeof CustomerInfo>;

export const CreateOrderRequest = z
  .object({
    items: z.array(CartItemInput).min(1).max(50),
    fulfillment: FulfillmentMethod,
    customer: CustomerInfo,
    /** Repeated submits with the same key return the original order. */
    idempotencyKey: z.string().min(8).max(120).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.fulfillment === 'delivery' && !data.customer.address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customer', 'address'],
        message: 'Address is required for delivery',
      });
    }
  });
export type CreateOrderRequest = z.infer<typeof CreateOrderRequest>;

export const CreateOrderResponse = z
  .object({
    orderId: z.string().uuid(),
    orderNumber: z.string(),
    total: z
      .object({ amount: z.number().int().nonnegative(), currency: z.literal('IDR') })
      .strict(),
    estimatedReadyAt: z.string().datetime(),
    paymentUrl: z.string().url(),
    paymentReference: z.string(),
  })
  .strict();
export type CreateOrderResponse = z.infer<typeof CreateOrderResponse>;

export const Order = z
  .object({
    id: z.string().uuid(),
    orderNumber: z.string(),
    status: OrderStatus,
    paymentStatus: PaymentStatus,
    fulfillment: FulfillmentMethod,
    items: z.array(OrderItem),
    subtotal: z.number().int().nonnegative(),
    deliveryFee: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    customer: CustomerInfo,
    estimatedReadyAt: z.string().datetime(),
    paymentReference: z.string().nullable(),
    paymentPaidAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type Order = z.infer<typeof Order>;

export const ListOrdersQuery = z
  .object({
    status: OrderStatus.optional(),
    fromDate: z.string().date().optional(),
    toDate: z.string().date().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();
export type ListOrdersQuery = z.infer<typeof ListOrdersQuery>;

export const ListOrdersResponse = z
  .object({
    items: z.array(Order),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  })
  .strict();
export type ListOrdersResponse = z.infer<typeof ListOrdersResponse>;

export const UpdateOrderStatusRequest = z
  .object({
    status: z.enum(['queued', 'baking', 'ready', 'completed', 'cancelled']),
    note: z.string().max(500).optional(),
  })
  .strict();
export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusRequest>;

export const PaymentWebhookPayload = z
  .object({
    reference: z.string(),
    status: z.enum(['paid', 'failed', 'expired']),
    paidAt: z.string().datetime().optional(),
    amount: z.number().int().nonnegative().optional(),
  })
  .strict();
export type PaymentWebhookPayload = z.infer<typeof PaymentWebhookPayload>;
