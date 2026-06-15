import { CreateOrderRequest, QuoteCartRequest } from '@cookies/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../app';
import { isUuid } from '../lib/uuid';
import { listPublicMenu } from '../services/menu';
import { createOrder, getOrderById, getOrderByNumber, quoteCart } from '../services/order';
import { createPaymentIntent } from '../services/payment';
import { getShopStatus } from '../services/settings';

export const publicRoutes = new Hono<AppEnv>()
  .get('/menu', async (c) => {
    const items = await listPublicMenu();
    return c.json({ items });
  })
  .get('/shop/status', async (c) => {
    const status = await getShopStatus();
    return c.json(status);
  })
  .post('/cart/quote', zValidator('json', QuoteCartRequest), async (c) => {
    const body = c.req.valid('json');
    const result = await quoteCart({
      items: body.items,
      fulfillment: body.fulfillment,
      now: new Date(),
    });
    if (!result.ok) {
      const code = result.code === 'invalid_menu_items' ? 'invalid_menu_items' : 'fully_booked';
      const status = code === 'invalid_menu_items' ? 400 : 409;
      return c.json({ error: { code, message: result.reason } }, status);
    }
    return c.json({
      items: result.quote.items,
      subtotal: result.quote.subtotal,
      deliveryFee: result.quote.deliveryFee,
      total: result.quote.total,
      earliestBakeDate: result.quote.bakeDate,
      estimatedReadyDate: result.quote.bakeDate,
      estimatedReadyAt: result.quote.estimatedReadyAt,
      crossesCutoff: result.quote.crossesCutoff,
      blockedReason: result.quote.blocked ? result.quote.reason : null,
    });
  })
  .post('/orders', zValidator('json', CreateOrderRequest), async (c) => {
    const body = c.req.valid('json');
    const result = await createOrder({ request: body, now: new Date() });
    if (!result.ok) {
      const statusByCode = {
        shop_closed: 409,
        invalid_menu_items: 400,
        fully_booked: 409,
        idempotency_mismatch: 409,
      } as const;
      const status = statusByCode[result.code] as 400 | 409;
      return c.json({ error: { code: result.code, message: result.reason } }, status);
    }
    const intent = await createPaymentIntent({
      orderId: result.order.id,
      amount: result.order.total,
      paymentReference: result.paymentReference,
    });
    return c.json({
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      total: { amount: result.order.total, currency: 'IDR' as const },
      estimatedReadyAt: result.order.estimatedReadyAt,
      paymentUrl: intent.paymentUrl,
      paymentReference: result.paymentReference,
    });
  })
  .get('/orders/:id', zValidator('param', z.object({ id: z.string().min(1) })), async (c) => {
    const { id } = c.req.valid('param');
    if (isUuid(id)) {
      const byId = await getOrderById(id);
      if (byId) return c.json(byId);
    }
    const byNumber = await getOrderByNumber(id);
    if (byNumber) return c.json(byNumber);
    return c.json({ error: { code: 'not_found', message: 'Order not found' } }, 404);
  });
