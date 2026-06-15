import { CapacityNotice } from '@/components/capacity-notice';
import { Hero } from '@/components/hero';
import { MenuSection } from '@/components/menu-section';
import { ShopClosedBanner } from '@/components/shop-closed-banner';
import { ApiClientError, api } from '@/lib/api';
import type { GetShopStatusResponse, ListMenuItemsResponse, PublicMenuItem } from '@cookies/shared';
import { cookies as nextCookies } from 'next/headers';

async function fetchMenu(): Promise<{
  items: PublicMenuItem[];
  status: GetShopStatusResponse | null;
  error: string | null;
}> {
  try {
    const [menuRes, statusRes] = await Promise.all([
      api.get<ListMenuItemsResponse>('/public/menu'),
      api.get<GetShopStatusResponse>('/public/shop/status'),
    ]);
    return { items: menuRes.items, status: statusRes, error: null };
  } catch (e) {
    if (e instanceof ApiClientError) {
      return { items: [], status: null, error: `${e.code}: ${e.message}` };
    }
    return { items: [], status: null, error: (e as Error).message };
  }
}

export default async function HomePage() {
  await nextCookies();
  const { items, status, error } = await fetchMenu();

  return (
    <>
      <Hero />
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
          <div className="hidden text-right text-sm text-muted-foreground md:block">
            <p>
              Order before <strong>17:00</strong>
            </p>
            <p>Ready tomorrow after 10:00</p>
          </div>
        </div>
        {error ? (
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
