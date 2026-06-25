/**
 * @cookies/shared ― Shop Configuration Schemas
 *
 * These schemas define the shop-level settings that control how the bakery
 * operates: daily capacity, ordering cutoff time, delivery fees, closed
 * dates, and the master open/close toggle.
 *
 * The shop has exactly one settings row (keyed as `'default'`), which the
 * admin can update through the settings page. These values feed directly
 * into the capacity engine and the storefront's availability logic.
 */
import { z } from 'zod';

/**
 * ShopSettings ― The canonical shop configuration record.
 *
 * - `dailyCapacity`    Maximum cookies the baker can produce in a single
 *                      day. The capacity engine uses this to determine
 *                      when a bake night is full and orders need to roll
 *                      forward to the next open day.
 *
 * - `orderCutoffHour`  The hour (0-23, in the shop's timezone) after which
 *                      new orders are scheduled for H+2 instead of H+1.
 *                      Default is 17 (5 PM).
 *
 * - `maxQueueDays`     How many days into the future customers can book.
 *                      Default is 3 (~60 cookies at 20/day capacity).
 *                      Beyond this, orders are rejected as `fully_booked`.
 *
 * - `deliveryFee`      Flat delivery fee in whole rupiah. Only applied
 *                      when `fulfillment` is `'delivery'`.
 *
 * - `closedDates`      An array of `YYYY-MM-DD` date strings. The capacity
 *                      engine skips these days (and every Sunday) when
 *                      assigning bake dates.
 *
 * - `isOpen`           The master open/close toggle. When `false`, the
 *                      storefront shows a "closed" banner and no orders
 *                      can be placed, regardless of capacity.
 *
 * - `timezone`         An IANA timezone string (e.g. `Asia/Jakarta`).
 *                      Used by the capacity engine to determine "today"
 *                      for cutoff and bake-date math.
 */
export const ShopSettings = z
  .object({
    id: z.literal('default'),
    isOpen: z.boolean(),
    dailyCapacity: z.number().int().positive().max(1000),
    orderCutoffHour: z.number().int().min(0).max(23),
    maxQueueDays: z.number().int().positive().max(30),
    deliveryFee: z.number().int().nonnegative(),
    timezone: z.string().min(1),
    closedDates: z.array(z.string().date()),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type ShopSettings = z.infer<typeof ShopSettings>;

/**
 * UpdateShopSettingsRequest ― Partial update payload for shop settings.
 *
 * Every field is optional. The `.refine()` guard prevents sending an empty
 * object with no actual changes. The admin sends only the fields they want
 * to modify — the server merges them into the existing settings row.
 */
export const UpdateShopSettingsRequest = z
  .object({
    isOpen: z.boolean().optional(),
    dailyCapacity: z.number().int().positive().max(1000).optional(),
    orderCutoffHour: z.number().int().min(0).max(23).optional(),
    maxQueueDays: z.number().int().positive().max(30).optional(),
    deliveryFee: z.number().int().nonnegative().optional(),
    closedDates: z.array(z.string().date()).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });
export type UpdateShopSettingsRequest = z.infer<typeof UpdateShopSettingsRequest>;

/**
 * GetShopStatusResponse ― Lightweight response for the storefront hero.
 *
 * The storefront calls this to decide whether to show the "shop open" or
 * "shop closed" state. `closedReason` is `null` when the shop is open;
 * otherwise it carries a human-readable reason like "Shop is closed on
 * Sundays" or "Closed for holiday."
 */
export const GetShopStatusResponse = z
  .object({
    isOpen: z.boolean(),
    closedReason: z.string().nullable(),
  })
  .strict();
export type GetShopStatusResponse = z.infer<typeof GetShopStatusResponse>;
