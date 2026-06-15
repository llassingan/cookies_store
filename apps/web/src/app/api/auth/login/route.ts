import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env.WEB_API_URL ?? 'http://localhost:14045';
const COOKIE_NAME = 'cookies_admin_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_body', message: 'Invalid JSON body' } },
      { status: 400 },
    );
  }

  const apiRes = await fetch(`${API_URL}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!apiRes.ok) {
    const data = (await apiRes.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    return NextResponse.json(
      {
        error: {
          code: data?.error?.code ?? 'login_failed',
          message: data?.error?.message ?? 'Login failed',
        },
      },
      { status: apiRes.status },
    );
  }

  const setCookie = apiRes.headers.get('set-cookie');
  const match = setCookie?.match(new RegExp(`^${COOKIE_NAME}=([^;]+)`));
  const jwt = match?.[1];
  if (!jwt) {
    return NextResponse.json(
      { error: { code: 'no_cookie', message: 'Auth backend did not issue a session' } },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === 'production';
  cookieStore.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ ok: true });
}
