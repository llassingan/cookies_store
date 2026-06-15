import { PaymentWebhookPayload } from '@cookies/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { handlePaymentWebhook } from '../services/payment';

export const paymentWebhookRoutes = new Hono<AppEnv>()
  .post('/mayar', zValidator('json', PaymentWebhookPayload), async (c) => {
    const body = c.req.valid('json');
    const result = await handlePaymentWebhook(body);
    if (!result.ok)
      return c.json({ error: { code: 'invalid_payload', message: result.reason } }, 400);
    return c.json({ ok: true });
  })
  .post('/mock', zValidator('json', PaymentWebhookPayload), async (c) => {
    const body = c.req.valid('json');
    const result = await handlePaymentWebhook(body);
    if (!result.ok)
      return c.json({ error: { code: 'invalid_payload', message: result.reason } }, 400);
    return c.json({ ok: true });
  });
