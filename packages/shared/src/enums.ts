/**
 * @cookies/shared ― Domain Enums
 *
 * These Zod-backed enums define the core domain vocabulary shared between
 * the Hono backend and the Next.js frontend. Every string constant that
 * represents a business state (fulfillment method, order lifecycle, payment
 * status, ordering channel) lives here so the two apps never drift apart.
 *
 * Zod's `z.enum()` gives us both runtime validation and TypeScript type
 * inference from a single source of truth.
 */
import { z } from 'zod';

/** How the customer wants to receive their cookies. */
export const FulfillmentMethod = z.enum(['pickup', 'delivery']);
export type FulfillmentMethod = z.infer<typeof FulfillmentMethod>;

/**
 * Order Status ― The Bake-Night State Machine
 *
 * An order moves through these states in a fixed sequence:
 *
 *   awaiting_payment → paid → queued → baking → ready → completed
 *
 * At any point before `completed` the order can jump directly to
 * `cancelled` (e.g. customer cancels, payment expires, or admin
 * forcefully cancels).
 *
 * What each state means in the real world:
 *
 * - `awaiting_payment`  Customer has submitted the order but hasn't paid
 *                       yet. The order is held but no cookies are reserved.
 *
 * - `paid`              Payment confirmed (by mayar.id webhook or mock).
 *                       The order is now eligible to be queued for a bake
 *                       night.
 *
 * - `queued`            The order has been assigned to a specific bake date
 *                       by the capacity engine. The cookies are counted
 *                       against that night's capacity.
 *
 * - `baking`            The baker has started working on this order's
 *                       cookies. Visible to the customer as "in the oven."
 *
 * - `ready`             Cookies are baked and ready for pickup or delivery.
 *                       The customer should be notified.
 *
 * - `completed`         The order has been handed off to the customer.
 *                       Terminal state.
 *
 * - `cancelled`         The order will not be fulfilled. Terminal state.
 *                       Reachable from any non-terminal status.
 */
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

/**
 * Payment Status ― Tracks the payment gateway lifecycle independently of
 * the order status. `pending` means the payment hasn't been confirmed yet;
 * `paid` / `failed` / `expired` come from the mayar.id (or mock) webhook;
 * `refunded` is set manually by the admin when issuing a refund.
 */
export const PaymentStatus = z.enum(['pending', 'paid', 'failed', 'expired', 'refunded']);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

/**
 * Order Channel ― Which surface the order came from. Currently only `web`
 * is supported (the Next.js storefront). Future channels (e.g. WhatsApp,
 * direct POS) would be added here.
 */
export const OrderChannel = z.enum(['web']);
export type OrderChannel = z.infer<typeof OrderChannel>;
