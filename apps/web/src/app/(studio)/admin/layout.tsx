import { ApiClientError, api } from '@/lib/api';
import { cookies as nextCookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export const metadata = { title: 'Studio · Maison Croûte' };

const COOKIE_NAME = 'cookies_admin_session';

export const getMe = cache(async (): Promise<{ username: string } | null> => {
  const cookieStore = await nextCookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await api.get<{ username: string }>('/admin/auth/me', {
      headers: { cookie: `${COOKIE_NAME}=${token}` },
    });
  } catch (e) {
    if (e instanceof ApiClientError && e.code === 'unauthorized') return null;
    return null;
  }
});

export async function requireAdminOrRedirect() {
  const me = await getMe();
  if (!me) redirect('/admin/login');
  return me;
}

export async function getAdminHeaders(): Promise<Record<string, string>> {
  const cookieStore = await nextCookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect('/admin/login');
  return { cookie: `${COOKIE_NAME}=${token}` };
}

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
