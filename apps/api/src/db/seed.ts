import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { loadDotEnv } from '../lib/dotenv';
import * as schema from './schema';

loadDotEnv();

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const sql = postgres(url, { max: 1, prepare: false });
const db = drizzle(sql, { schema });

console.log('[migrate] running migrations…');
await migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
console.log('[migrate] done');

const env = {
  ADMIN_USERNAME: process.env.ADMIN_USERNAME ?? 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'admin1234',
  SHOP_DAILY_CAPACITY: Number(process.env.SHOP_DAILY_CAPACITY ?? 20),
  SHOP_ORDER_CUTOFF_HOUR: Number(process.env.SHOP_ORDER_CUTOFF_HOUR ?? 17),
  SHOP_MAX_QUEUE_DAYS: Number(process.env.SHOP_MAX_QUEUE_DAYS ?? 3),
  SHOP_TIMEZONE: process.env.SHOP_TIMEZONE ?? 'Asia/Jakarta',
  SHOP_DELIVERY_FEE: Number(process.env.SHOP_DELIVERY_FEE ?? 0),
};

console.log('[seed] ensuring admin user…');
const existingAdmin = await db.query.adminUsers.findFirst({
  where: eq(schema.adminUsers.username, env.ADMIN_USERNAME),
});
if (!existingAdmin) {
  const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await db.insert(schema.adminUsers).values({ username: env.ADMIN_USERNAME, passwordHash: hash });
  console.log(`[seed] created admin user "${env.ADMIN_USERNAME}"`);
} else {
  console.log(`[seed] admin user "${env.ADMIN_USERNAME}" already exists`);
}

console.log('[seed] ensuring default shop settings…');
const existingSettings = await db.query.shopSettings.findFirst({
  where: eq(schema.shopSettings.id, 'default'),
});
if (!existingSettings) {
  await db.insert(schema.shopSettings).values({
    id: 'default',
    isOpen: true,
    dailyCapacity: env.SHOP_DAILY_CAPACITY,
    orderCutoffHour: env.SHOP_ORDER_CUTOFF_HOUR,
    maxQueueDays: env.SHOP_MAX_QUEUE_DAYS,
    deliveryFee: env.SHOP_DELIVERY_FEE,
    timezone: env.SHOP_TIMEZONE,
    closedDates: [],
  });
  console.log('[seed] created default shop settings');
} else {
  console.log('[seed] shop settings already exist');
}

console.log('[seed] seeding menu…');
const menuCount = await db.select().from(schema.menuItems);
if (menuCount.length === 0) {
  const sampleMenu = [
    {
      name: 'Classic Chocolate Chip',
      description:
        'Crisp edges, a soft chewy centre, and pools of dark Belgian chocolate. Our take on the timeless favourite.',
      price: 35000,
      imageUrl: null,
      available: true,
      sortOrder: 0,
    },
    {
      name: 'Sea Salt Tahini',
      description:
        'Toasted tahini, brown butter, and a generous pinch of Maldon sea salt. A grown-up cookie with Middle-Eastern soul.',
      price: 42000,
      imageUrl: null,
      available: true,
      sortOrder: 1,
    },
    {
      name: 'Pistachio & Rose',
      description:
        'Pistachio cream, dried rose petals, and a touch of cardamom. Fragrant, soft, and unmistakably Mediterranean.',
      price: 48000,
      imageUrl: null,
      available: true,
      sortOrder: 2,
    },
    {
      name: 'Brown Butter Madeleines (Box of 6)',
      description:
        'Light, scalloped French tea cakes with a deep nutty aroma. Best enjoyed with espresso.',
      price: 65000,
      imageUrl: null,
      available: true,
      sortOrder: 3,
    },
    {
      name: 'Saffron Cardamom Snickerdoodles',
      description:
        'An aromatic twist on the American classic — Persian saffron, green cardamom, cinnamon sugar.',
      price: 38000,
      imageUrl: null,
      available: true,
      sortOrder: 4,
    },
  ];
  await db.insert(schema.menuItems).values(sampleMenu);
  console.log(`[seed] inserted ${sampleMenu.length} menu items`);
} else {
  console.log(`[seed] menu already has ${menuCount.length} items, skipping`);
}

await sql.end();
console.log('[seed] done');
