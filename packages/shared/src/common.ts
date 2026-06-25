/**
 * @cookies/shared ― Common / Reusable Schemas
 *
 * Small utility schemas used across multiple modules. They don't belong to
 * any single domain (menu, order, shop) but appear as building blocks in
 * several places. Keeping them here avoids circular imports and lets every
 * module pull from a single shared vocabulary.
 */
import { z } from 'zod';

/**
 * Money ― Represents a monetary value in Indonesian Rupiah (IDR).
 *
 * IDR is a *no-subunit* currency: there are no cents or sen in practice
 * for e-commerce transactions. The `amount` field is always a whole integer
 * representing the total rupiah value (e.g. `25000` means Rp 25.000).
 * The `currency` field is hard-coded to `'IDR'` because Maison Croûte
 * only operates in Indonesia.
 */
export const Money = z
  .object({
    amount: z.number().int().nonnegative(),
    currency: z.literal('IDR'),
  })
  .strict();
export type Money = z.infer<typeof Money>;

/**
 * ApiError ― The standard error envelope returned by every Hono endpoint.
 *
 * When the API encounters a problem (validation failure, not found, payment
 * error, etc.) it responds with this shape. The `code` is a machine-readable
 * string like `'VALIDATION_ERROR'` or `'FULLY_BOOKED'`; `message` is a
 * human-readable explanation; `details` is an optional map that can carry
 * field-level validation errors or extra context.
 */
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

/**
 * Pagination ― A simple page/size pagination model (no cursor).
 *
 * This is a classic offset-based pagination: `page` is 1-indexed,
 * `pageSize` is capped at 100 to prevent accidentally fetching the entire
 * database, and `total` tells the client how many records exist in total
 * so it can render page controls.
 */
export const Pagination = z
  .object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive().max(100),
    total: z.number().int().nonnegative(),
  })
  .strict();
export type Pagination = z.infer<typeof Pagination>;

/** IdParam ― A route parameter validator for `/{id}` paths. */
export const IdParam = z.object({ id: z.string().min(1) });
export type IdParam = z.infer<typeof IdParam>;
