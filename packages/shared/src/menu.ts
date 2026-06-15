import { z } from 'zod';
import { Money } from './common';

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

export const PublicMenuItem = MenuItem.omit({ createdAt: true, updatedAt: true });
export type PublicMenuItem = z.infer<typeof PublicMenuItem>;

export const ListMenuItemsResponse = z
  .object({
    items: z.array(PublicMenuItem),
  })
  .strict();
export type ListMenuItemsResponse = z.infer<typeof ListMenuItemsResponse>;

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
