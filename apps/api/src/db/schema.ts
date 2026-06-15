import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const orderStatus = pgEnum('order_status', [
  'awaiting_payment',
  'paid',
  'queued',
  'baking',
  'ready',
  'completed',
  'cancelled',
]);

export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'expired',
  'refunded',
]);

export const fulfillmentMethod = pgEnum('fulfillment_method', ['pickup', 'delivery']);

export const orderChannel = pgEnum('order_channel', ['web']);

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description').notNull(),
    price: integer('price').notNull(),
    imageUrl: text('image_url'),
    available: boolean('available').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    availableIdx: index('menu_items_available_idx').on(t.available, t.sortOrder),
  }),
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: varchar('order_number', { length: 32 }).notNull(),
    status: orderStatus('status').notNull().default('awaiting_payment'),
    paymentStatus: paymentStatus('payment_status').notNull().default('pending'),
    fulfillment: fulfillmentMethod('fulfillment').notNull(),
    channel: orderChannel('channel').notNull().default('web'),

    items: jsonb('items').$type<OrderItemRow[]>().notNull(),
    subtotal: integer('subtotal').notNull(),
    deliveryFee: integer('delivery_fee').notNull().default(0),
    total: integer('total').notNull(),

    customer: jsonb('customer').$type<CustomerRow>().notNull(),

    /** The date (in shop timezone) the cookies will be baked — drives the queue. */
    bakeDate: date('bake_date').notNull(),
    /** Estimated ready timestamp (best effort) in UTC. */
    estimatedReadyAt: timestamp('estimated_ready_at', { withTimezone: true }).notNull(),

    paymentReference: varchar('payment_reference', { length: 120 }),
    paymentPaidAt: timestamp('payment_paid_at', { withTimezone: true }),

    idempotencyKey: varchar('idempotency_key', { length: 120 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderNumberIdx: uniqueIndex('orders_order_number_idx').on(t.orderNumber),
    idempotencyIdx: uniqueIndex('orders_idempotency_idx').on(t.idempotencyKey),
    bakeDateIdx: index('orders_bake_date_idx').on(t.bakeDate),
    statusIdx: index('orders_status_idx').on(t.status),
    createdAtIdx: index('orders_created_at_idx').on(t.createdAt),
  }),
);

export const shopSettings = pgTable('shop_settings', {
  id: varchar('id', { length: 32 }).primaryKey().default('default'),
  isOpen: boolean('is_open').notNull().default(true),
  dailyCapacity: integer('daily_capacity').notNull().default(20),
  orderCutoffHour: integer('order_cutoff_hour').notNull().default(17),
  maxQueueDays: integer('max_queue_days').notNull().default(3),
  deliveryFee: integer('delivery_fee').notNull().default(0),
  timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Jakarta'),
  closedDates: jsonb('closed_dates').$type<string[]>().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adminUsers = pgTable('admin_users', {
  username: varchar('username', { length: 120 }).primaryKey(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    fromStatus: orderStatus('from_status'),
    toStatus: orderStatus('to_status').notNull(),
    changedBy: varchar('changed_by', { length: 120 }).notNull(),
    note: text('note'),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.orderId, t.changedAt] }),
    changedAtIdx: index('order_status_history_changed_at_idx').on(t.changedAt),
  }),
);

export type OrderItemRow = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type CustomerRow = {
  name: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
};
