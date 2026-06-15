import { z } from 'zod';

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

export const GetShopStatusResponse = z
  .object({
    isOpen: z.boolean(),
    closedReason: z.string().nullable(),
  })
  .strict();
export type GetShopStatusResponse = z.infer<typeof GetShopStatusResponse>;
