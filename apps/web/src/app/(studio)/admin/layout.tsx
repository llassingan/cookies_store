/**
 * Admin Dashboard Shell (Server Component)
 *
 * Shared layout for the Maison Croûte Studio admin dashboard. This is the
 * authentication boundary for the admin area:
 *
 * - Reads the `cookies_admin_session` cookie to check if the baker is
 *   currently signed in.
 * - Exports `getMe()`, `requireAdminOrRedirect()`, and `getAdminHeaders()`
 *   so individual admin pages can verify auth and forward the session cookie
 *   to the API on every request.
 * - Renders the admin sidebar/navigation (Studio branding, nav links, sign
 *   out form) alongside the child page content.
 *
 * All child routes inside `/admin` are gated: any page that calls
 * `requireAdminOrRedirect()` or `getAdminHeaders()` will automatically
 * redirect unauthenticated visitors to `/admin/login`.
 */
import { ApiClientError, api } from '@/lib/api';
import { cookies as nextCookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export const metadata = { title: 'Studio · Maison Croûte' };

// Name of the HTTP-only cookie that holds the admin JWT session token.
const COOKIE_NAME = 'cookies_admin_session';

/**
 * Retrieve the currently signed-in admin user from the API.
 *
 * Uses React `cache()` so the server component tree only calls the
 * `/admin/auth/me` endpoint once per request, even when multiple
 * components or child pages call `getMe()`.
 *
 * @returns The admin's username, or `null` if the session cookie is
 *          missing, expired, or invalid.
 */
export const getMe = cache(async (): Promise<{ username: string } | null> => {
  const cookieStore = await nextCookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    // Forward the session cookie to the API so it can validate the JWT.
    return await api.get<{ username: string }>('/admin/auth/me', {
      headers: { cookie: `${COOKIE_NAME}=${token}` },
    });
  } catch (e) {
    // Treat any auth failure (or general error) as "not logged in".
    if (e instanceof ApiClientError && e.code === 'unauthorized') return null;
    return null;
  }
});

/**
 * Require an authenticated admin session, redirecting to the login
 * page if the session is missing or invalid.
 *
 * @returns The authenticated admin user object (never null).
 */
export async function requireAdminOrRedirect() {
  const me = await getMe();
  if (!me) redirect('/admin/login');
  return me;
}

/**
 * Build the HTTP headers needed to call the Admin API. Used by every
 * admin page to forward the session cookie to the backend.
 *
 * Automatically redirects to `/admin/login` if the cookie is missing.
 */
export async function getAdminHeaders(): Promise<Record<string, string>> {
  const cookieStore = await nextCookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  // Missing cookie means the user is not signed in at all.
  if (!token) redirect('/admin/login');
  return { cookie: `${COOKIE_NAME}=${token}` };
}

/**
 * Admin layout component.
 *
 * Checks auth state (getMe) and renders the admin chrome:
 * - Studio header with the "M" logo and app name
 * - Navigation links (Overview, Orders, Menu, Settings, Storefront)
 * - The authenticated admin's username and a sign-out form
 *
 * The actual page content is rendered via `{children}` inside a
 * `<main>` container. If the session is missing, the nav link area
 * shows a "Sign in" link instead.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return (
    <div className="min-h-screen bg-secondary/20">
      <header className="border-b border-border/60 bg-card">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-display text-xl">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
              M
            </span>
            Studio
          </Link>
          {me ? (
            <nav className="flex gap-6 text-sm">
              <Link href="/admin" className="text-muted-foreground hover:text-foreground">
                Overview
              </Link>
              <Link href="/admin/orders" className="text-muted-foreground hover:text-foreground">
                Orders
              </Link>
              <Link href="/admin/menu" className="text-muted-foreground hover:text-foreground">
                Menu
              </Link>
              <Link href="/admin/settings" className="text-muted-foreground hover:text-foreground">
                Settings
              </Link>
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                Storefront ↗
              </Link>
            </nav>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3 text-sm">
            {me ? (
              <>
                <span className="text-muted-foreground">{me.username}</span>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="rounded-md border border-border bg-card px-3 py-1 hover:bg-secondary/40"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/admin/login"
                className="rounded-md border border-border bg-card px-3 py-1 hover:bg-secondary/40"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
