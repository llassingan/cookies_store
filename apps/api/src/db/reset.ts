import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { loadDotEnv } from '../lib/dotenv';

loadDotEnv();

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const sql = postgres(url, { max: 1, prepare: false });
const db = drizzle(sql);

console.log('[reset] dropping public schema…');
await db.execute(`
  DROP SCHEMA IF EXISTS public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres;
  GRANT ALL ON SCHEMA public TO public;
`);

await sql.end();
console.log('[reset] done. Run "bun run db:seed" to recreate tables and data.');
