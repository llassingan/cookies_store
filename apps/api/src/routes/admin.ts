import {
  AdminLoginRequest,
  CreateMenuItemRequest,
  ListOrdersQuery,
  UpdateMenuItemRequest,
  UpdateOrderStatusRequest,
  UpdateShopSettingsRequest,
} from '@cookies/shared';
import { zValidator } from '@hono/zod-validator';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../app';
import { db, schema } from '../db/client';
import { clearSession, issueSession, requireAdmin, verifyAdminPassword } from '../services/auth';
import { createMenuItem, deleteMenuItem, listAllMenu, updateMenuItem } from '../services/menu';
import { getOrderById, listOrders, updateOrderStatus } from '../services/order';
import { getShopSettings, updateShopSettings } from '../services/settings';

const idParam = z.object({ id: z.string().uuid() });

export const adminRoutes = new Hono<AppEnv>()
  .post('/auth/login', zValidator('json', AdminLoginRequest), async (c) => {
    const body = c.req.valid('json');
    const ok = await verifyAdminPassword(body.username, body.password);
    if (!ok)
      return c.json(
        { error: { code: 'invalid_credentials', message: 'Invalid username or password' } },
        401,
      );
    await issueSession(c, body.username);
    return c.json({ ok: true as const });
  })
  .post('/auth/logout', async (c) => {
    await clearSession(c);
    return c.json({ ok: true as const });
  })
  .get('/auth/me', async (c) => {
    const result = await requireAdmin(c);
    if (!result.ok) return result.response;
    return c.json({ username: result.username });
  })

  .get('/menu', async (c) => {
    const result = await requireAdmin(c);
    if (!result.ok) return result.response;
    const items = await listAllMenu();
    return c.json({ items });
  })
  .post('/menu', zValidator('json', CreateMenuItemRequest), async (c) => {
    const result = await requireAdmin(c);
    if (!result.ok) return result.response;
    const body = c.req.valid('json');
    const item = await createMenuItem(body);
    return c.json(item, 201);
  })
  .patch(
    '/menu/:id',
    zValidator('param', idParam),
    zValidator('json', UpdateMenuItemRequest),
    async (c) => {
      const result = await requireAdmin(c);
      if (!result.ok) return result.response;
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const updated = await updateMenuItem(id, body);
      if (!updated)
        return c.json({ error: { code: 'not_found', message: 'Menu item not found' } }, 404);
      return c.json(updated);
    },
  )
  .delete('/menu/:id', zValidator('param', idParam), async (c) => {
    const result = await requireAdmin(c);
    if (!result.ok) return result.response;
    const { id } = c.req.valid('param');
    const ok = await deleteMenuItem(id);
    if (!ok) return c.json({ error: { code: 'not_found', message: 'Menu item not found' } }, 404);
    return c.json({ ok: true as const });
  })

  .get('/orders', zValidator('query', ListOrdersQuery), async (c) => {
    const result = await requireAdmin(c);
    if (!result.ok) return result.response;
    const q = c.req.valid('query');
    const { items, total } = await listOrders({
      status: q.status,
      fromDate: q.fromDate,
      toDate: q.toDate,
      page: q.page,
      pageSize: q.pageSize,
    });
    return c.json({ items, page: q.page, pageSize: q.pageSize, total });
  })
  .get('/orders/:id', zValidator('param', idParam), async (c) => {
    const result = await requireAdmin(c);
    if (!result.ok) return result.response;
    const { id } = c.req.valid('param');
    const order = await getOrderById(id);
    if (!order) return c.json({ error: { code: 'not_found', message: 'Order not found' } }, 404);
    return c.json(order);
  })
  .patch(
    '/orders/:id/status',
    zValidator('param', idParam),
    zValidator('json', UpdateOrderStatusRequest),
    async (c) => {
      const result = await requireAdmin(c);
      if (!result.ok) return result.response;
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const updated = await updateOrderStatus({
        id,
        toStatus: body.status,
        changedBy: result.username,
        note: body.note,
      });
      if (!updated.ok)
        return c.json({ error: { code: 'invalid_transition', message: updated.reason } }, 409);
      return c.json(updated.order);
    },
  )

  .get('/dashboard/sales', async (c) => {
    const result = await requireAdmin(c);
    if (!result.ok) return result.response;
    const days = 7;
    const daily: Array<{ date: string; cookiesSold: number; revenue: number; orderCount: number }> =
      [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i -= 1) {
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() - i);
      const next = new Date(day);
      next.setUTCDate(next.getUTCDate() + 1);
      const ordersToday = await db.query.orders.findMany({
        where: and(
          eq(schema.orders.paymentStatus, 'paid'),
          gte(schema.orders.paymentPaidAt, day),
          lte(schema.orders.paymentPaidAt, next),
        ),
      });
      let cookies = 0;
      let revenue = 0;
      for (const o of ordersToday) {
        for (const it of o.items) cookies += it.quantity;
        revenue += o.total;
      }
      daily.push({
        date: day.toISOString().slice(0, 10),
        cookiesSold: cookies,
        revenue,
        orderCount: ordersToday.length,
      });
    }
    const cookiesSold = daily.reduce((s, d) => s + d.cookiesSold, 0);
    const revenue = daily.reduce((s, d) => s + d.revenue, 0);
    const orderCount = daily.reduce((s, d) => s + d.orderCount, 0);
    return c.json({ cookiesSold, revenue, orderCount, daily });
  })
  .get('/dashboard/bake-nights', async (c) => {
    const result = await requireAdmin(c);
    if (!result.ok) return result.response;
    const settings = await getShopSettings();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setUTCDate(horizon.getUTCDate() + settings.maxQueueDays + 1);
    const rows = await db.query.orders.findMany({
      where: and(
        gte(schema.orders.bakeDate, today.toISOString().slice(0, 10)),
        lte(schema.orders.bakeDate, horizon.toISOString().slice(0, 10)),
        eq(schema.orders.paymentStatus, 'paid'),
      ),
      orderBy: [asc(schema.orders.bakeDate), asc(schema.orders.createdAt)],
    });
    const byDate = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = byDate.get(r.bakeDate) ?? [];
      arr.push(r);
      byDate.set(r.bakeDate, arr);
    }
    const nights: Array<{
      date: string;
      cookiesScheduled: number;
      capacity: number;
      orders: typeof rows;
    }> = [];
    for (let i = 0; i <= settings.maxQueueDays; i += 1) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const orders = byDate.get(iso) ?? [];
      let cookies = 0;
      for (const o of orders) for (const it of o.items) cookies += it.quantity;
      nights.push({
        date: iso,
        cookiesScheduled: cookies,
        capacity: settings.dailyCapacity,
        orders,
      });
    }
    return c.json({ nights });
  })

  .get('/settings', async (c) => {
    const result = await requireAdmin(c);
    if (!result.ok) return result.response;
    const settings = await getShopSettings();
    return c.json(settings);
  })
  .patch('/settings', zValidator('json', UpdateShopSettingsRequest), async (c) => {
    const result = await requireAdmin(c);
    if (!result.ok) return result.response;
    const body = c.req.valid('json');
    const settings = await updateShopSettings(body);
    return c.json(settings);
  });
