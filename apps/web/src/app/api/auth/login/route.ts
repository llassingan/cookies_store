/**
 * Maison Croûte — Admin Login Route Handler
 *
 * A Next.js Route Handler that proxies login requests from the browser to
 * the Hono API backend. This proxy exists because of cross-origin cookie
 * restrictions between the dev servers.
 *
 * WHY THIS IS NEEDED:
 * The Hono API runs on port 14045 and the Next.js web frontend runs on port
 * 14022. When the API responds to `/admin/auth/login` with a `Set-Cookie`
 * header containing an httpOnly JWT, the browser cannot receive an httpOnly
 * cookie from a different origin (CORS doesn't help here — httpOnly cookies
 * are not accessible to JavaScript even if CORS allows the request).
 *
 * So instead of calling the API directly from a client component, the login
 * form POSTs to this Next.js route handler (same origin as the page). This
 * handler forwards the request to the API, extracts the JWT from the API's
 * Set-Cookie header, and then sets the same cookie in the browser's cookie
 * jar using Next.js's `cookies()` API. Since the response comes from the
 * same origin, the browser accepts the cookie.
 *
 * In production, if both services are behind the same domain (e.g. via a
 * reverse proxy), this proxy may not be necessary — but it works correctly
 * in both dev and production configurations.
 */

import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

// The Hono API's base URL. Same as in lib/api.ts, but duplicated here
// because route handlers run on the server side independently.
const API_URL = process.env.WEB_API_URL ?? 'http://localhost:14045';

// The name of the httpOnly cookie that stores the admin's JWT session token.
// Must match the value used by the Hono API's auth service.
const COOKIE_NAME = 'cookies_admin_session';

// 7 days in seconds. The admin stays logged in for a week before the
// session expires and they need to log in again.
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  // Step 1: Parse the JSON body from the login form (username + password).
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_body', message: 'Invalid JSON body' } },
      { status: 400 },
    );
  }

  // Step 2: Forward the credentials to the Hono API's login endpoint.
  const apiRes = await fetch(`${API_URL}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Step 3: If the API rejected the login, pass the error through to the
  // browser so the login form can show the right message.
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

  // Step 4: Extract the JWT from the API's Set-Cookie response header.
  // The header looks like: "cookies_admin_session=eyJhbG...xyz; HttpOnly; ..."
  // We use a regex to grab just the token value (everything between the
  // cookie name and the first semicolon).
  const setCookie = apiRes.headers.get('set-cookie');
  const match = setCookie?.match(new RegExp(`^${COOKIE_NAME}=([^;]+)`));
  const jwt = match?.[1];
  if (!jwt) {
    // The API returned 200 but no session cookie — something is wrong
    // on the backend (e.g. misconfigured auth service).
    return NextResponse.json(
      { error: { code: 'no_cookie', message: 'Auth backend did not issue a session' } },
      { status: 500 },
    );
  }

  // Step 5: Set the JWT as an httpOnly cookie in the browser.
  // — httpOnly: true  → JavaScript cannot read this cookie (XSS protection)
  // — sameSite: 'lax' → The cookie is sent with same-site requests and
  //   top-level navigations, but not cross-site subrequests (CSRF protection)
  // — secure: <prod>  → In production, only send the cookie over HTTPS
  // — path: '/'       → The cookie is available to all routes on the domain
  // — maxAge: 7 days  → Automatically expires after one week
  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === 'production';
  cookieStore.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  // Step 6: Tell the browser login was successful. The client-side code
  // then redirects the admin to the dashboard.
  return NextResponse.json({ ok: true });
}
