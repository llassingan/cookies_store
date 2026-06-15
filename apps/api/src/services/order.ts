import type { CreateOrderRequest, Order, OrderItem } from '@cookies/shared';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db, schema } from '../db/client';
import type { CustomerRow, OrderItemRow } from '../db/schema';
import { type CapacityResult, planBakeDate } from './capacity';
import { getMenuItemsByIds } from './menu';
import { getShopSettings } from './settings';

export type CreateOrderParams = {
  request: CreateOrderRequest;
  now: Date;
};

export type CreateOrderResult =
  | {
      ok: true;
      order: Order;
      capacity: CapacityResult;
      paymentReference: string;
      paymentUrl: string;
    }
  | {
      ok: false;
      reason: string;
      code: 'invalid_menu_items' | 'shop_closed' | 'fully_booked' | 'idempotency_mismatch';
    };

export class OrderServiceError extends Error {
  constructor(
    public readonly code:
      | 'invalid_menu_items'
      | 'shop_closed'
      | 'fully_booked'
      | 'idempotency_mismatch',
    message: string,
  ) {
    super(message);
    this.name = 'OrderServiceError';
  }
}

export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const { request, now } = params;
  const settings = await getShopSettings();
  if (!settings.isOpen) {
    return { ok: false, reason: 'Shop is currently closed', code: 'shop_closed' };
  }

  if (request.idempotencyKey) {
    const existing = await db.query.orders.findFirst({
      where: eq(schema.orders.idempotencyKey, request.idempotencyKey),
    });
    if (existing) {
      const order = toOrderDto(existing);
      return {
        ok: true,
        order,
        capacity: {
          bakeDate: existing.bakeDate,
          estimatedReadyAt: existing.estimatedReadyAt.toISOString(),
          crossesCutoff: false,
          blocked: false,
          reason: null,
        },
        paymentReference: existing.paymentReference ?? '',
        paymentUrl: existing.paymentReference ? `/mock-pay/${existing.paymentReference}` : '',
      };
    }
  }

  const menuIds = request.items.map((i) => i.menuItemId);
  const menu = await getMenuItemsByIds(menuIds);
  if (menu.length !== menuIds.length) {
    return {
      ok: false,
      reason: 'One or more menu items are not available',
      code: 'invalid_menu_items',
    };
  }

  const orderItems: OrderItemRow[] = request.items.map((req) => {
    const m = menu.find((mm) => mm.id === req.menuItemId);
    if (!m)
      throw new OrderServiceError('invalid_menu_items', `Menu item ${req.menuItemId} not found`);
    if (!m.available)
      throw new OrderServiceError('invalid_menu_items', `Menu item ${m.name} is not available`);
    return {
      menuItemId: m.id,
      name: m.name,
      unitPrice: m.price,
      quantity: req.quantity,
      subtotal: m.price * req.quantity,
    };
  });

  const totalQuantity = orderItems.reduce((s, i) => s + i.quantity, 0);
  const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
  const deliveryFee = request.fulfillment === 'delivery' ? settings.deliveryFee : 0;
  const total = subtotal + deliveryFee;

  const scheduled = await getScheduledPerDate(now, settings.timezone, settings.maxQueueDays);
  const capacity = planBakeDate({
    quantity: totalQuantity,
    now,
    dailyCapacity: settings.dailyCapacity,
    cutoffHour: settings.orderCutoffHour,
    maxQueueDays: settings.maxQueueDays,
    timezone: settings.timezone,
    closedDates: settings.closedDates,
    scheduledPerDate: scheduled,
  });

  if (capacity.blocked) {
    return { ok: false, reason: capacity.reason ?? 'Fully booked', code: 'fully_booked' };
  }

  const orderNumber = await nextOrderNumber();
  const paymentReference = `pay_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

  const [row] = await db
    .insert(schema.orders)
    .values({
      orderNumber,
      status: 'awaiting_payment',
      paymentStatus: 'pending',
      fulfillment: request.fulfillment,
      items: orderItems,
      subtotal,
      deliveryFee,
      total,
      customer: request.customer as CustomerRow,
      bakeDate: capacity.bakeDate,
      estimatedReadyAt: new Date(capacity.estimatedReadyAt),
      paymentReference,
      idempotencyKey: request.idempotencyKey ?? null,
    })
    .returning();

  if (!row) throw new Error('Order insert returned no row');

  const order = toOrderDto(row);
  return {
    ok: true,
    order,
    capacity,
    paymentReference,
    paymentUrl: `/mock-pay/${paymentReference}`,
  };
}

export async function quoteCart(args: {
  items: { menuItemId: string; quantity: number }[];
  fulfillment: 'pickup' | 'delivery';
  now: Date;
}): Promise<
  | {
      ok: true;
      quote: {
        items: OrderItem[];
        subtotal: number;
        deliveryFee: number;
        total: number;
        bakeDate: string;
        estimatedReadyAt: string;
        crossesCutoff: boolean;
        blocked: boolean;
        reason: string | null;
      };
    }
  | { ok: false; reason: string; code: 'invalid_menu_items' | 'fully_booked' }
> {
  const settings = await getShopSettings();
  const menuIds = args.items.map((i) => i.menuItemId);
  const menu = await getMenuItemsByIds(menuIds);
  if (menu.length !== menuIds.length) {
    return {
      ok: false,
      reason: 'One or more menu items are not available',
      code: 'invalid_menu_items',
    };
  }

  const orderItems: OrderItemRow[] = args.items.map((req) => {
    const m = menu.find((mm) => mm.id === req.menuItemId);
    if (!m) throw new Error('unreachable');
    return {
      menuItemId: m.id,
      name: m.name,
      unitPrice: m.price,
      quantity: req.quantity,
      subtotal: m.price * req.quantity,
    };
  });

  const totalQuantity = orderItems.reduce((s, i) => s + i.quantity, 0);
  const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
  const deliveryFee = args.fulfillment === 'delivery' ? settings.deliveryFee : 0;

  const scheduled = await getScheduledPerDate(args.now, settings.timezone, settings.maxQueueDays);
  const capacity = planBakeDate({
    quantity: totalQuantity,
    now: args.now,
    dailyCapacity: settings.dailyCapacity,
    cutoffHour: settings.orderCutoffHour,
    maxQueueDays: settings.maxQueueDays,
    timezone: settings.timezone,
    closedDates: settings.closedDates,
    scheduledPerDate: scheduled,
  });

  const items: OrderItem[] = orderItems.map((i) => ({
    menuItemId: i.menuItemId,
    name: i.name,
    unitPrice: i.unitPrice,
    quantity: i.quantity,
    subtotal: i.subtotal,
  }));

  return {
    ok: true,
    quote: {
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      bakeDate: capacity.bakeDate,
      estimatedReadyAt: capacity.estimatedReadyAt,
      crossesCutoff: capacity.crossesCutoff,
      blocked: capacity.blocked,
      reason: capacity.reason,
    },
  };
}

async function getScheduledPerDate(
  now: Date,
  timezone: string,
  maxQueueDays: number,
): Promise<Record<string, number>> {
  const { addDaysString, toIsoDate } = await import('./capacity');
  const today = toIsoDate(now, timezone);
  const horizon = addDaysString(today, maxQueueDays + 1);
  const rows = await db.query.orders.findMany({
    where: and(
      inArray(schema.orders.status, ['paid', 'queued', 'baking', 'ready']),
      gte(schema.orders.bakeDate, today),
      lte(schema.orders.bakeDate, horizon),
    ),
  });
  const out: Record<string, number> = {};
  for (const r of rows) {
    const arr = r.items;
    const total = arr.reduce((s, i) => s + i.quantity, 0);
    out[r.bakeDate] = (out[r.bakeDate] ?? 0) + total;
  }
  return out;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const row = await db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
  return row ? toOrderDto(row) : null;
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const row = await db.query.orders.findFirst({
    where: eq(schema.orders.orderNumber, orderNumber),
  });
  return row ? toOrderDto(row) : null;
}

export async function getOrderByPaymentReference(reference: string): Promise<Order | null> {
  const row = await db.query.orders.findFirst({
    where: eq(schema.orders.paymentReference, reference),
  });
  return row ? toOrderDto(row) : null;
}

export async function listOrders(args: {
  status?: Order['status'];
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: Order[]; total: number }> {
  const conditions = [];
  if (args.status) conditions.push(eq(schema.orders.status, args.status));
  if (args.fromDate) conditions.push(gte(schema.orders.bakeDate, args.fromDate));
  if (args.toDate) conditions.push(lte(schema.orders.bakeDate, args.toDate));

  const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countRow] = await Promise.all([
    db.query.orders.findMany({
      where: whereExpr,
      orderBy: [desc(schema.orders.createdAt)],
      limit: args.pageSize,
      offset: (args.page - 1) * args.pageSize,
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.orders).where(whereExpr),
  ]);

  return {
    items: rows.map(toOrderDto),
    total: countRow[0]?.count ?? 0,
  };
}

export async function markOrderPaid(paymentReference: string, paidAt: Date): Promise<Order | null> {
  const existing = await getOrderByPaymentReference(paymentReference);
  if (!existing) return null;
  if (existing.paymentStatus === 'paid') return existing;

  const [row] = await db
    .update(schema.orders)
    .set({
      paymentStatus: 'paid',
      status: 'queued',
      paymentPaidAt: paidAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.orders.id, existing.id))
    .returning();

  await db.insert(schema.orderStatusHistory).values({
    orderId: existing.id,
    fromStatus: existing.status,
    toStatus: 'queued',
    changedBy: 'payment-webhook',
  });

  return row ? toOrderDto(row) : null;
}

export async function markOrderPaymentFailed(paymentReference: string): Promise<void> {
  const existing = await getOrderByPaymentReference(paymentReference);
  if (!existing) return;
  await db
    .update(schema.orders)
    .set({ paymentStatus: 'failed', status: 'cancelled', updatedAt: new Date() })
    .where(eq(schema.orders.id, existing.id));
  await db.insert(schema.orderStatusHistory).values({
    orderId: existing.id,
    fromStatus: existing.status,
    toStatus: 'cancelled',
    changedBy: 'payment-webhook',
  });
}

const ALLOWED_TRANSITIONS: Record<Order['status'], ReadonlyArray<Order['status']>> = {
  awaiting_payment: ['cancelled'],
  paid: ['queued', 'baking', 'cancelled'],
  queued: ['baking', 'cancelled'],
  baking: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export async function updateOrderStatus(args: {
  id: string;
  toStatus: Order['status'];
  changedBy: string;
  note?: string;
}): Promise<{ ok: true; order: Order } | { ok: false; reason: string }> {
  const existing = await getOrderById(args.id);
  if (!existing) return { ok: false, reason: 'Order not found' };
  if (existing.status === args.toStatus) return { ok: true, order: existing };

  const allowed = ALLOWED_TRANSITIONS[existing.status];
  if (!allowed.includes(args.toStatus)) {
    return { ok: false, reason: `Cannot transition from ${existing.status} to ${args.toStatus}` };
  }

  const [row] = await db
    .update(schema.orders)
    .set({ status: args.toStatus, updatedAt: new Date() })
    .where(eq(schema.orders.id, args.id))
    .returning();
  if (!row) return { ok: false, reason: 'Update failed' };

  await db.insert(schema.orderStatusHistory).values({
    orderId: args.id,
    fromStatus: existing.status,
    toStatus: args.toStatus,
    changedBy: args.changedBy,
    note: args.note ?? null,
  });

  return { ok: true, order: toOrderDto(row) };
}

async function nextOrderNumber(): Promise<string> {
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(today.getUTCDate()).padStart(2, '0');
  const prefix = `CK${yyyy}${mm}${dd}`;
  const rows = await db
    .select({ orderNumber: schema.orders.orderNumber })
    .from(schema.orders)
    .where(sql`${schema.orders.orderNumber} like ${`${prefix}-%`}`)
    .orderBy(desc(schema.orders.orderNumber))
    .limit(1);
  let next = 1;
  if (rows[0]) {
    const last = rows[0].orderNumber;
    const tail = last.split('-')[1];
    if (tail) next = Number.parseInt(tail, 10) + 1;
  }
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

function toOrderDto(row: typeof schema.orders.$inferSelect): Order {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    paymentStatus: row.paymentStatus,
    fulfillment: row.fulfillment,
    items: row.items,
    subtotal: row.subtotal,
    deliveryFee: row.deliveryFee,
    total: row.total,
    customer: row.customer,
    estimatedReadyAt: row.estimatedReadyAt.toISOString(),
    paymentReference: row.paymentReference,
    paymentPaidAt: row.paymentPaidAt ? row.paymentPaidAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
