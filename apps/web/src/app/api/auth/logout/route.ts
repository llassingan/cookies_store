/**
 * Maison Croûte — Admin Logout Route Handler
 *
 * A Next.js Route Handler that clears the admin's session cookie and
 * optionally notifies the Hono API backend of the logout.
 *
 * The flow:
 * 1. Read the existing session cookie from the browser.
 * 2. If a session exists, tell the API to invalidate it (best-effort).
 * 3. Delete the cookie from the browser.
 * 4. Redirect the admin back to the login page.
 *
 * The API call in step 2 is fire-and-forget: if the API is unreachable,
 * we log a warning but still clear the local cookie and redirect. This
 * ensures the admin can always log out, even if the API is down.
 */

import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

// The Hono API's base URL. Same as in the login route handler.
const API_URL = process.env.WEB_API_URL ?? 'http://localhost:14045';

// Must match the cookie name used by both the login handler and the API.
const COOKIE_NAME = 'cookies_admin_session';

export async function POST(request: NextRequest) {
  // Read the current session token (if any) from the browser's cookies.
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  // Notify the Hono API to invalidate this session server-side.
  // We forward the cookie so the API can identify which session to revoke.
  // This is a best-effort call — if the API is down, we still proceed
  // with the local cleanup.
  if (token) {
    try {
      await fetch(`${API_URL}/admin/auth/logout`, {
        method: 'POST',
        headers: { cookie: `${COOKIE_NAME}=${token}` },
      });
    } catch (err) {
      // The API might be unreachable or already shut down. That's fine —
      // the important thing is that the browser cookie is cleared so the
      // admin can't reuse the session on subsequent page loads.
      console.warn('[auth/logout] failed to notify API, proceeding with local clear', err);
    }
  }

  // Remove the session cookie from the browser regardless of the API result.
  cookieStore.delete(COOKIE_NAME);

  // Redirect to the login page. We use a redirect (303) rather than a JSON
  // response so the browser navigates away from the admin area entirely.
  // The login page lives at /admin/login relative to the app root.
  return NextResponse.redirect(new URL('/admin/login', request.url));
}
