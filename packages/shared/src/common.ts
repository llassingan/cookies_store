import { z } from 'zod';

/** IDR is a no-subunit currency; `amount` is the full integer rupiah value. */
export const Money = z
  .object({
    amount: z.number().int().nonnegative(),
    currency: z.literal('IDR'),
  })
  .strict();
export type Money = z.infer<typeof Money>;

export const ApiError = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.string(), z.unknown()).optional(),
    }),
  })
  .strict();
export type ApiError = z.infer<typeof ApiError>;

export const Pagination = z
  .object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive().max(100),
    total: z.number().int().nonnegative(),
  })
  .strict();
export type Pagination = z.infer<typeof Pagination>;

export const IdParam = z.object({ id: z.string().min(1) });
export type IdParam = z.infer<typeof IdParam>;
