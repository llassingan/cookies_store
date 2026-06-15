import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env.WEB_API_URL ?? 'http://localhost:14045';
const COOKIE_NAME = 'cookies_admin_session';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    try {
      await fetch(`${API_URL}/admin/auth/logout`, {
        method: 'POST',
        headers: { cookie: `${COOKIE_NAME}=${token}` },
      });
    } catch (err) {
      console.warn('[auth/logout] failed to notify API, proceeding with local clear', err);
    }
  }

  cookieStore.delete(COOKIE_NAME);
  return NextResponse.redirect(new URL('/admin/login', request.url));
}
