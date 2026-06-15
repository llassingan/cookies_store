import { z } from 'zod';
import { loadDotEnv } from './lib/dotenv';

const Env = z
  .object({
    DATABASE_URL: z.string().min(1),
    API_PORT: z.coerce.number().int().positive().default(14045),
    HOSTNAME: z.string().default('0.0.0.0'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    AUTH_SECRET: z.string().min(16),
    ADMIN_USERNAME: z.string().min(1).default('admin'),
    ADMIN_PASSWORD: z.string().min(4).default('admin1234'),
    PAYMENT_PROVIDER: z.enum(['mock', 'mayar']).default('mock'),
    PAYMENT_API_KEY: z.string().default(''),
    PAYMENT_WEBHOOK_SECRET: z.string().default('mock-webhook-secret'),
    EMAIL_PROVIDER: z.enum(['mock', 'smtp', 'resend']).default('mock'),
    EMAIL_FROM: z.string().email().default('orders@cookies-shop.local'),
    PUBLIC_BASE_URL: z.string().url().default('http://localhost:14022'),
    WEB_API_URL: z.string().url().optional(),
    CORS_ORIGINS: z.string().default('http://localhost:14022'),
    SHOP_TIMEZONE: z.string().default('Asia/Jakarta'),
    SHOP_DAILY_CAPACITY: z.coerce.number().int().positive().default(20),
    SHOP_ORDER_CUTOFF_HOUR: z.coerce.number().int().min(0).max(23).default(17),
    SHOP_MAX_QUEUE_DAYS: z.coerce.number().int().positive().max(30).default(3),
    SHOP_MAX_ORDERS_PER_CUSTOMER_PER_DAY: z.coerce.number().int().positive().default(5),
  })
  .transform((raw) => ({
    ...raw,
    corsOrigins: raw.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  }));

export type Env = z.infer<typeof Env>;

let cached: Env | null = null;
export function getEnv(): Env {
  if (cached) return cached;
  loadDotEnv();
  const parsed = Env.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
