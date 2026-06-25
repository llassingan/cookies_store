/**
 * Maison Croûte — Storefront Home Page
 *
 * The main landing page and the first step of the customer flow: / -> /cart -> /checkout.
 *
 * This is an **async server component** (RSC). It runs on the server at request time so the
 * menu and shop status are fetched *before* any HTML hits the browser — no client-side loading
 * spinner for the critical above-the-fold content.
 *
 * Renders in order:
 * 1. `<Hero>` — full-width banner with tagline and CTA.
 * 2. `<ShopClosedBanner>` — conditionally shown when the shop is not accepting orders.
 * 3. `<CapacityNotice>` — three-icon summary of the bakery's constraints.
 * 4. Menu grid (`<MenuSection>`) — only the items returned by the API, wrapped in a
 *    "Today's offerings" heading group and the 17:00 cutoff callout.
 * 5. "How it works" — a three-step explainer rendered from a static `STEPS` array.
 */
import { CapacityNotice } from '@/components/capacity-notice';
import { Hero } from '@/components/hero';
import { MenuSection } from '@/components/menu-section';
import { ShopClosedBanner } from '@/components/shop-closed-banner';
import { ApiClientError, api } from '@/lib/api';
import type { GetShopStatusResponse, ListMenuItemsResponse, PublicMenuItem } from '@cookies/shared';
import { cookies as nextCookies } from 'next/headers';

/**
 * Fetches both the menu and the shop-status API endpoints **in parallel**.
 *
 * Using {@link Promise.all} cuts the network waterfall in half: the two GET requests
 * are dispatched simultaneously, and we await both before computing the page.
 * If either call fails, the error is caught and surfaced as an inline warning banner
 * instead of crashing the entire page.
 */
async function fetchMenu(): Promise<{
  items: PublicMenuItem[];
  status: GetShopStatusResponse | null;
  error: string | null;
}> {
  try {
    // Parallel fetch: menu items + shop open/closed status.
    // Both endpoints are public and share no dependency, so waiting sequentially is wasteful.
    const [menuRes, statusRes] = await Promise.all([
      api.get<ListMenuItemsResponse>('/public/menu'),
      api.get<GetShopStatusResponse>('/public/shop/status'),
    ]);
    return { items: menuRes.items, status: statusRes, error: null };
  } catch (e) {
    // ApiClientError carries a structured code + message from the API.
    // Falling back to a generic Error message handles unexpected runtime failures.
    if (e instanceof ApiClientError) {
      return { items: [], status: null, error: `${e.code}: ${e.message}` };
    }
    return { items: [], status: null, error: (e as Error).message };
  }
}

export default async function HomePage() {
  // `await nextCookies()` is Next.js 15's signal to opt this route into dynamic rendering.
  // Without it the page would be statically generated at build time and never re-fetch.
  await nextCookies();
  const { items, status, error } = await fetchMenu();

  return (
    <>
      <Hero />
      {/* When the shop is closed (master toggle or outside hours), a rose-tinted banner explains why. */}
      {!status?.isOpen && (
        <ShopClosedBanner
          reason={status?.closedReason ?? 'The shop is temporarily closed for new orders.'}
        />
      )}
      <CapacityNotice />
      <section id="menu" className="container py-16">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="font-display text-sm uppercase tracking-[0.3em] text-accent-foreground/70">
              Today’s offerings
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
              From the oven, with care
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Each batch is hand-mixed the morning of baking. We never re-freeze, never over-stock.
              Order at least one of anything you love.
            </p>
          </div>
          {/* The cutoff callout is hidden on mobile to keep the heading prominent. */}
          <div className="hidden text-right text-sm text-muted-foreground md:block">
            <p>
              Order before <strong>17:00</strong>
            </p>
            <p>Ready tomorrow after 10:00</p>
          </div>
        </div>
        {error ? (
          // Destructive-coloured error banner preserves the page skeleton so the hero + how-it-works
          // section still render, giving the user a graceful (not blank) experience.
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            We could not load the menu: {error}
          </p>
        ) : (
          <MenuSection items={items} />
        )}
      </section>
      <section id="how-it-works" className="border-y border-border/60 bg-secondary/20 py-16">
        <div className="container">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-accent-foreground/70">
            How it works
          </p>
          <h2 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">Slow by design</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-lg border border-border/60 bg-card p-6">
                {/* Zero-padded step number (01, 02, 03) gives a "numbered recipe" feel. */}
                <p className="font-display text-5xl text-accent-foreground/60">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-3 font-display text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// Static steps live outside the component so they are not re-allocated on every render.
const STEPS = [
  {
    title: 'Pick your batch',
    body: 'Browse the menu, choose how many of each cookie you would like, then add them to your basket.',
  },
  {
    title: 'Tell us how to deliver',
    body: 'Pickup at the studio, or we will arrange a courier for you. Either way you get a confirmation and a tracking number.',
  },
  {
    title: 'Baked fresh the night before',
    body: 'We mix the morning of the bake date, cool overnight, and pack your order for the next day.',
  },
];
