/**
 * @cookies/shared ― Admin Schemas
 *
 * These schemas define the admin dashboard contract: login, sales KPIs,
 * and the bake-night planning view. They are only consumed by the admin
 * section of the Next.js frontend and the `/admin/*` Hono routes.
 *
 * The admin dashboard is the baker's operational cockpit: it shows how
 * many cookies were sold today, which bake nights are coming up, and how
 * full each night's queue is. Every schema here is read-only from the
 * customer's perspective — only authenticated admins can access these
 * endpoints.
 */
import { z } from 'zod';
import { Order } from './order';

/** AdminLoginRequest ― Username/password pair for admin authentication. */
export const AdminLoginRequest = z
  .object({
    username: z.string().min(1).max(120),
    password: z.string().min(1).max(200),
  })
  .strict();
export type AdminLoginRequest = z.infer<typeof AdminLoginRequest>;

/**
 * AdminLoginResponse ― Successful login returns `{ ok: true }`.
 * The actual session is set via an HTTP-only cookie, so the response
 * body is intentionally minimal.
 */
export const AdminLoginResponse = z
  .object({
    ok: z.literal(true),
  })
  .strict();
export type AdminLoginResponse = z.infer<typeof AdminLoginResponse>;

/**
 * SalesSummary ― The KPI dashboard at the top of the admin page.
 *
 * Aggregated sales data across a configurable date range. The top-level
 * fields (`cookiesSold`, `revenue`, `orderCount`) are the totals for the
 * entire range. The `daily` array breaks the same metrics down per day so
 * the admin can see trends.
 *
 * All amounts are in whole rupiah (no subunits — see `Money` in common.ts).
 */
export const SalesSummary = z
  .object({
    cookiesSold: z.number().int().nonnegative(),
    revenue: z.number().int().nonnegative(),
    orderCount: z.number().int().nonnegative(),
    daily: z.array(
      z
        .object({
          date: z.string().date(),
          cookiesSold: z.number().int().nonnegative(),
          revenue: z.number().int().nonnegative(),
          orderCount: z.number().int().nonnegative(),
        })
        .strict(),
    ),
  })
  .strict();
export type SalesSummary = z.infer<typeof SalesSummary>;

/**
 * BakeNight ― A single bake date in the planning view.
 *
 * The admin dashboard shows upcoming bake nights so the baker can see,
 * at a glance, how busy each night is going to be.
 *
 * - `date`             The bake date in YYYY-MM-DD format.
 * - `cookiesScheduled` How many cookies are already queued for this night.
 * - `capacity`         The daily capacity from shop settings (this is the
 *                      same value for every night, but included per-night
 *                      for the frontend to render progress bars).
 * - `orders`           The full `Order` objects queued for this night,
 *                      so the admin can drill into individual orders.
 */
export const BakeNight = z
  .object({
    date: z.string().date(),
    cookiesScheduled: z.number().int().nonnegative(),
    capacity: z.number().int().positive(),
    orders: z.array(Order),
  })
  .strict();
export type BakeNight = z.infer<typeof BakeNight>;

/** BakeNightsResponse ― Wrapper for the bake nights list endpoint. */
export const BakeNightsResponse = z
  .object({
    nights: z.array(BakeNight),
  })
  .strict();
export type BakeNightsResponse = z.infer<typeof BakeNightsResponse>;
