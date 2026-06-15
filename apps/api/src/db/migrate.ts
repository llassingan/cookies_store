import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { loadDotEnv } from '../lib/dotenv';

loadDotEnv();

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const sql = postgres(url, { max: 1, prepare: false });
const db = drizzle(sql);

const migrationsFolder = resolve(process.cwd(), 'drizzle');
console.log(`[migrate] running migrations from ${migrationsFolder}`);
await migrate(db, { migrationsFolder });
console.log('[migrate] done');
await sql.end();
