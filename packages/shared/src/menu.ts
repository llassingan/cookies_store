/**
 * @cookies/shared ― Menu Schemas
 *
 * These schemas define the cookie menu CRUD contract. The shop has a fixed
 * menu of cookie varieties (each with a name, description, price, and photo).
 * The admin can add, edit, or toggle availability; customers only see items
 * where `available` is `true`.
 *
 * There are two "views" of a menu item:
 *
 * - `MenuItem`        The full admin record, including `createdAt` and
 *                     `updatedAt` timestamps.
 * - `PublicMenuItem`  The customer-facing version. It omits the timestamps
 *                     because the storefront doesn't need them.
 */
import { z } from 'zod';
import { Money } from './common';

/**
 * MenuItem ― Full admin representation of a cookie on the menu.
 *
 * Every field lives here: the UUID primary key, the human-readable name and
 * description, the price (in whole rupiah — see `Money` in common.ts), an
 * optional image URL, a boolean toggle for storefront visibility, a sort
 * order for manual ranking, and the audit timestamps.
 */
export const MenuItem = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(120),
    description: z.string().min(1).max(2000),
    price: z.number().int().positive(),
    imageUrl: z.string().url().nullable(),
    available: z.boolean(),
    sortOrder: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type MenuItem = z.infer<typeof MenuItem>;

/**
 * PublicMenuItem ― The customer-facing menu item.
 *
 * Derived from `MenuItem` by omitting the internal `createdAt` and
 * `updatedAt` fields. Customers only see what matters for browsing
 * and ordering.
 */
export const PublicMenuItem = MenuItem.omit({ createdAt: true, updatedAt: true });
export type PublicMenuItem = z.infer<typeof PublicMenuItem>;

/** ListMenuItemsResponse ― Wrapper for the public menu list endpoint. */
export const ListMenuItemsResponse = z
  .object({
    items: z.array(PublicMenuItem),
  })
  .strict();
export type ListMenuItemsResponse = z.infer<typeof ListMenuItemsResponse>;

/**
 * CreateMenuItemRequest ― Payload for adding a new cookie to the menu.
 *
 * `available` defaults to `true` so the new item appears immediately on the
 * storefront unless the admin explicitly sets it to `false`. `sortOrder`
 * defaults to `0` (top of the list). `imageUrl` is optional and nullable —
 * cookies without a photo simply show a placeholder.
 */
export const CreateMenuItemRequest = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().min(1).max(2000),
    price: z.number().int().positive(),
    imageUrl: z.string().url().nullable().optional(),
    available: z.boolean().default(true),
    sortOrder: z.number().int().nonnegative().default(0),
  })
  .strict();
export type CreateMenuItemRequest = z.infer<typeof CreateMenuItemRequest>;

/**
 * UpdateMenuItemRequest ― Partial update payload for a menu item.
 *
 * Every field is optional so the admin can send only the fields they want
 * to change. The `.refine()` guard at the bottom prevents accidentally
 * sending an empty object with no fields to update, which would be a
 * no-op on the server.
 */
export const UpdateMenuItemRequest = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().min(1).max(2000).optional(),
    price: z.number().int().positive().optional(),
    imageUrl: z.string().url().nullable().optional(),
    available: z.boolean().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });
export type UpdateMenuItemRequest = z.infer<typeof UpdateMenuItemRequest>;

export { Money };
