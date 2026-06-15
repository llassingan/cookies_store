import { z } from 'zod';
import { Order } from './order';

export const AdminLoginRequest = z
  .object({
    username: z.string().min(1).max(120),
    password: z.string().min(1).max(200),
  })
  .strict();
export type AdminLoginRequest = z.infer<typeof AdminLoginRequest>;

export const AdminLoginResponse = z
  .object({
    ok: z.literal(true),
  })
  .strict();
export type AdminLoginResponse = z.infer<typeof AdminLoginResponse>;

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

export const BakeNight = z
  .object({
    date: z.string().date(),
    cookiesScheduled: z.number().int().nonnegative(),
    capacity: z.number().int().positive(),
    orders: z.array(Order),
  })
  .strict();
export type BakeNight = z.infer<typeof BakeNight>;

export const BakeNightsResponse = z
  .object({
    nights: z.array(BakeNight),
  })
  .strict();
export type BakeNightsResponse = z.infer<typeof BakeNightsResponse>;
