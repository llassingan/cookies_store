/**
 * @cookies/shared ― Order Schemas
 *
 * This is the heart of the Maison Croûte API contract. Every schema here
 * encodes a piece of the customer ordering journey — from building a cart
 * and getting a quote, through checkout with idempotency protection, to
 * the full order record that tracks the order through the bake-night state
 * machine.
 *
 * Key design decisions baked into these schemas:
 *
 * - Prices are **snapshotted at order time**. `OrderItem.unitPrice` is
 *   captured when the order is created, so future menu price changes never
 *   retroactively rewrite old orders.
 *
 * - **Idempotency keys** prevent duplicate orders. If a customer's network
 *   drops during checkout and they resubmit with the same idempotency key,
 *   the server returns the original order instead of creating a duplicate.
 *
 * - **Delivery address validation** uses Zod's `.superRefine()` to enforce
 *   that `address` is required when `fulfillment` is `'delivery'`, but
 *   optional for `'pickup'`. This is a cross-field constraint that can't be
 *   expressed with per-field `.optional()` alone.
 *
 * - The **capacity engine** runs server-side and is not represented in these
 *   schemas, but its output surfaces in `CartQuote.earliestBakeDate` and
 *   `CartQuote.blockedReason`.
 *
 * - **Payment** is handled by mayar.id (or a mock provider in dev). The
 *   `PaymentWebhookPayload` schema defines the contract the payment gateway
 *   must follow when notifying the API of payment status changes.
 */
import { z } from 'zod';
import { FulfillmentMethod, OrderStatus, PaymentStatus } from './enums';

/**
 * OrderItem ― A single line item on an order.
 *
 * Represents one cookie variety and how many the customer is buying.
 * `unitPrice` is the price *at the time the order was placed* — it is
 * snapshotted and never looked up from the menu again. This means the
 * baker can raise prices tomorrow without changing what past customers paid.
 * `subtotal` is `unitPrice × quantity` for convenience.
 */
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

/**
 * CartQuote ― A pricing and readiness estimate returned *before* the order
 * is created. The customer sees this on the cart page and during checkout.
 *
 * This is not an order yet — it's a preview. The capacity engine runs to
 * figure out which bake night the order would land on, whether the cutoff
 * has been crossed, and what the delivery fee (if any) would be.
 *
 * `blockedReason` is `null` when the order can proceed; otherwise it
 * contains a machine-readable reason like `'fully_booked'` or `'shop_closed'`
 * explaining why the order can't be placed right now.
 */
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

/** CartItemInput ― What the client sends to identify one cookie + quantity. */
export const CartItemInput = z
  .object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })
  .strict();
export type CartItemInput = z.infer<typeof CartItemInput>;

/** QuoteCartRequest ― Payload for the `POST /public/quote` endpoint. */
export const QuoteCartRequest = z
  .object({
    items: z.array(CartItemInput).min(1).max(50),
    fulfillment: FulfillmentMethod,
  })
  .strict();
export type QuoteCartRequest = z.infer<typeof QuoteCartRequest>;

/**
 * CustomerInfo ― What we need to know about the person placing the order.
 *
 * `address` is validated at the request level by `CreateOrderRequest`'s
 * `.superRefine()`: it is required for `delivery` and optional for
 * `pickup`. The field itself is typed as optional so the same schema
 * can represent both fulfillment methods.
 */
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

/**
 * CreateOrderRequest ― The full checkout payload.
 *
 * This is the single most important request schema in the application.
 * It carries the cart items, the fulfillment method, the customer's contact
 * info, and an optional `idempotencyKey`.
 *
 * **Idempotency key** — A unique string (8-120 chars) the client generates
 * before checkout. If the same key is submitted twice (e.g. the customer
 * double-clicks or refreshes after a network hiccup), the server returns
 * the original order instead of creating a duplicate. This protects both
 * the customer (no double charges) and the shop (no phantom capacity usage).
 *
 * **Delivery address validation** — The `.superRefine()` at the bottom
 * enforces a cross-field rule: if `fulfillment` is `'delivery'`, the
 * `customer.address` field must be present. A standard per-field
 * `.optional()` can't express this conditional requirement, so we use
 * Zod's `.superRefine()` to add a custom issue when the address is missing.
 */
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

/**
 * CreateOrderResponse ― What the customer sees after placing an order.
 *
 * The `paymentUrl` is where the customer should be redirected to complete
 * payment (mayar.id checkout page in production, a mock page in dev).
 * `paymentReference` is the mayar.id transaction reference used internally
 * to reconcile webhook notifications.
 */
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

/**
 * Order ― The full order record returned by admin endpoints and the
 * order tracking page.
 *
 * This is the complete picture of a single order: what was ordered, who
 * ordered it, where the order stands in the bake-night state machine
 * (`status` and `paymentStatus`), and when it was created. The `customer`
 * field is an embedded `CustomerInfo` object — it's not normalized into a
 * separate customers table because this is a small-batch bakery, not a
 * CRM platform.
 */
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

/** ListOrdersQuery ― Query-string parameters for `GET /admin/orders`. */
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

/** ListOrdersResponse ― Paginated admin order list. */
export const ListOrdersResponse = z
  .object({
    items: z.array(Order),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  })
  .strict();
export type ListOrdersResponse = z.infer<typeof ListOrdersResponse>;

/**
 * UpdateOrderStatusRequest ― Admin action to move an order through the
 * bake-night state machine.
 *
 * The allowed statuses are a subset of `OrderStatus`: the admin can
 * transition an order to `queued`, `baking`, `ready`, `completed`, or
 * `cancelled`. `awaiting_payment` and `paid` are set automatically by
 * the system (at order creation and payment webhook, respectively) and
 * can't be set by the admin.
 *
 * The `note` field lets the baker attach a short comment (e.g. "burnt the
 * first batch, re-baking").
 */
export const UpdateOrderStatusRequest = z
  .object({
    status: z.enum(['queued', 'baking', 'ready', 'completed', 'cancelled']),
    note: z.string().max(500).optional(),
  })
  .strict();
export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusRequest>;

/**
 * PaymentWebhookPayload ― The contract that the payment gateway (mayar.id)
 * must follow when notifying the API of a payment status change.
 *
 * The `reference` field ties back to `Order.paymentReference` set at order
 * creation. The API looks up the order by this reference and updates its
 * `paymentStatus`. In the mock dev setup, the mock payment page sends this
 * exact payload to the same webhook endpoint.
 */
export const PaymentWebhookPayload = z
  .object({
    reference: z.string(),
    status: z.enum(['paid', 'failed', 'expired']),
    paidAt: z.string().datetime().optional(),
    amount: z.number().int().nonnegative().optional(),
  })
  .strict();
export type PaymentWebhookPayload = z.infer<typeof PaymentWebhookPayload>;
