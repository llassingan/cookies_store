import type { ShopSettings, UpdateShopSettingsRequest } from '@cookies/shared';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client';
import { getEnv } from '../env';

export async function getShopSettings(): Promise<ShopSettings> {
  let row = await db.query.shopSettings.findFirst({ where: eq(schema.shopSettings.id, 'default') });
  if (!row) {
    const env = getEnv();
    const inserted = await db
      .insert(schema.shopSettings)
      .values({
        id: 'default',
        isOpen: true,
        dailyCapacity: env.SHOP_DAILY_CAPACITY,
        orderCutoffHour: env.SHOP_ORDER_CUTOFF_HOUR,
        maxQueueDays: env.SHOP_MAX_QUEUE_DAYS,
        deliveryFee: 0,
        timezone: env.SHOP_TIMEZONE,
        closedDates: [],
      })
      .onConflictDoNothing()
      .returning();
    row =
      inserted[0] ??
      (await db.query.shopSettings.findFirst({ where: eq(schema.shopSettings.id, 'default') }));
  }
  if (!row) throw new Error('shop_settings row missing after upsert');
  return toDto(row);
}

export async function updateShopSettings(patch: UpdateShopSettingsRequest): Promise<ShopSettings> {
  const existing = await getShopSettings();
  const next = {
    isOpen: patch.isOpen ?? existing.isOpen,
    dailyCapacity: patch.dailyCapacity ?? existing.dailyCapacity,
    orderCutoffHour: patch.orderCutoffHour ?? existing.orderCutoffHour,
    maxQueueDays: patch.maxQueueDays ?? existing.maxQueueDays,
    deliveryFee: patch.deliveryFee ?? existing.deliveryFee,
    closedDates: patch.closedDates ?? existing.closedDates,
    timezone: existing.timezone,
  };
  await db
    .update(schema.shopSettings)
    .set({ ...next, updatedAt: new Date() })
    .where(eq(schema.shopSettings.id, 'default'));
  return getShopSettings();
}

export async function getShopStatus(): Promise<{ isOpen: boolean; closedReason: string | null }> {
  const settings = await getShopSettings();
  if (!settings.isOpen) return { isOpen: false, closedReason: 'The shop is currently closed' };
  return { isOpen: true, closedReason: null };
}

function toDto(row: typeof schema.shopSettings.$inferSelect): ShopSettings {
  return {
    id: 'default',
    isOpen: row.isOpen,
    dailyCapacity: row.dailyCapacity,
    orderCutoffHour: row.orderCutoffHour,
    maxQueueDays: row.maxQueueDays,
    deliveryFee: row.deliveryFee,
    timezone: row.timezone,
    closedDates: row.closedDates,
    updatedAt: row.updatedAt.toISOString(),
  };
}
