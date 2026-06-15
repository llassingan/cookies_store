import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { SignJWT, jwtVerify } from 'jose';
import { db, schema } from '../db/client';
import { getEnv } from '../env';

const COOKIE_NAME = 'cookies_admin_session';
const ALG = 'HS256';

export async function ensureAdminUser(): Promise<void> {
  const env = getEnv();
  const existing = await db.query.adminUsers.findFirst({
    where: eq(schema.adminUsers.username, env.ADMIN_USERNAME),
  });
  if (existing) return;
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await db
    .insert(schema.adminUsers)
    .values({ username: env.ADMIN_USERNAME, passwordHash })
    .onConflictDoNothing();
}

export async function verifyAdminPassword(username: string, password: string): Promise<boolean> {
  const env = getEnv();
  const row = await db.query.adminUsers.findFirst({
    where: eq(schema.adminUsers.username, username),
  });
  if (!row) {
    if (username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD) {
      await ensureAdminUser();
      return true;
    }
    return false;
  }
  return bcrypt.compare(password, row.passwordHash);
}

function browserIsHttps(c: Context): boolean {
  return shouldUseSecureCookie(
    { origin: c.req.header('origin') ?? null, referer: c.req.header('referer') ?? null },
    getEnv().PUBLIC_BASE_URL,
  );
}

export function shouldUseSecureCookie(
  headers: { origin: string | null; referer: string | null },
  publicBaseUrl: string,
): boolean {
  if (headers.origin) return headers.origin.startsWith('https://');
  if (headers.referer) return headers.referer.startsWith('https://');
  return publicBaseUrl.startsWith('https://');
}

export async function issueSession(c: Context, username: string): Promise<void> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.AUTH_SECRET);
  const jwt = await new SignJWT({ sub: username, role: 'admin' })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
  const isHttps = browserIsHttps(c);
  setCookie(c, COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: isHttps ? 'None' : 'Lax',
    secure: isHttps,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearSession(c: Context): Promise<void> {
  deleteCookie(c, COOKIE_NAME, { path: '/' });
}

export async function getSessionUser(c: Context): Promise<string | null> {
  const env = getEnv();
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.sub === 'string') return payload.sub;
    return null;
  } catch {
    return null;
  }
}

export async function requireAdmin(
  c: Context,
): Promise<{ ok: true; username: string } | { ok: false; response: Response }> {
  const user = await getSessionUser(c);
  if (!user) {
    return {
      ok: false,
      response: c.json({ error: { code: 'unauthorized', message: 'Admin login required' } }, 401),
    };
  }
  return { ok: true, username: user };
}
