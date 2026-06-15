import type {
  CreateMenuItemRequest,
  MenuItem,
  PublicMenuItem,
  UpdateMenuItemRequest,
} from '@cookies/shared';
import { asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '../db/client';

export async function listPublicMenu(): Promise<PublicMenuItem[]> {
  const rows = await db
    .select()
    .from(schema.menuItems)
    .where(eq(schema.menuItems.available, true))
    .orderBy(asc(schema.menuItems.sortOrder), asc(schema.menuItems.name));
  return rows.map(toPublic);
}

export async function listAllMenu(): Promise<MenuItem[]> {
  const rows = await db
    .select()
    .from(schema.menuItems)
    .orderBy(asc(schema.menuItems.sortOrder), asc(schema.menuItems.name));
  return rows.map(toFull);
}

export async function getMenuItemsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(schema.menuItems).where(inArray(schema.menuItems.id, ids));
}

export async function getMenuItemById(id: string): Promise<MenuItem | null> {
  const row = await db.query.menuItems.findFirst({ where: eq(schema.menuItems.id, id) });
  return row ? toFull(row) : null;
}

export async function createMenuItem(input: CreateMenuItemRequest): Promise<MenuItem> {
  const [row] = await db
    .insert(schema.menuItems)
    .values({
      name: input.name,
      description: input.description,
      price: input.price,
      imageUrl: input.imageUrl ?? null,
      available: input.available ?? true,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  if (!row) throw new Error('menu_items insert returned no row');
  return toFull(row);
}

export async function updateMenuItem(
  id: string,
  input: UpdateMenuItemRequest,
): Promise<MenuItem | null> {
  const existing = await getMenuItemById(id);
  if (!existing) return null;
  const patch = {
    name: input.name,
    description: input.description,
    price: input.price,
    imageUrl: input.imageUrl,
    available: input.available,
    sortOrder: input.sortOrder,
    updatedAt: new Date(),
  };
  await db.update(schema.menuItems).set(patch).where(eq(schema.menuItems.id, id));
  const updated = await getMenuItemById(id);
  if (!updated) throw new Error('menu_items row missing after update');
  return updated;
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  const result = await db.delete(schema.menuItems).where(eq(schema.menuItems.id, id)).returning();
  return result.length > 0;
}

function toPublic(row: typeof schema.menuItems.$inferSelect): PublicMenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    imageUrl: row.imageUrl,
    available: row.available,
    sortOrder: row.sortOrder,
  };
}

function toFull(row: typeof schema.menuItems.$inferSelect): MenuItem {
  return {
    ...toPublic(row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
