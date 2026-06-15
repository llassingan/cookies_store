import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { ZodError } from 'zod';
import { getEnv } from './env';
import { matchOrigin } from './lib/cors';
import { adminRoutes } from './routes/admin';
import { paymentWebhookRoutes } from './routes/payment-webhook';
import { publicRoutes } from './routes/public';
import { ensureAdminUser } from './services/auth';
import { getShopSettings } from './services/settings';

export type AppEnv = {
  Variables: {
    requestId: string;
  };
};

const env = getEnv();

export async function buildApp(): Promise<Hono<AppEnv>> {
  await ensureAdminUser();
  await getShopSettings();

  const app = new Hono<AppEnv>();

  app.use('*', logger());
  app.use('*', prettyJSON());
  app.use(
    '*',
    cors({
      origin: (origin) => matchOrigin(origin ?? '', env.corsOrigins),
      credentials: true,
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposeHeaders: ['X-Request-Id'],
      maxAge: 86400,
    }),
  );

  app.use('*', async (c, next) => {
    const id = crypto.randomUUID();
    c.set('requestId', id);
    c.header('X-Request-Id', id);
    await next();
  });

  app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

  app.route('/public', publicRoutes);
  app.route('/admin', adminRoutes);
  app.route('/webhooks/payment', paymentWebhookRoutes);

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404));

  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json(
        {
          error: {
            code: 'validation_error',
            message: 'Invalid input',
            details: { issues: err.issues },
          },
        },
        400,
      );
    }
    console.error('[api] unhandled error', err);
    return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500);
  });

  return app;
}
