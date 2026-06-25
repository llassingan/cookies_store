/**
 * Admin Dashboard Home (Server Component)
 *
 * The landing page of the Maison Croûte admin Studio. Displays:
 *
 * 1. **Sales KPIs** — cookies sold, revenue, and order count over the
 *    past 7 days, plus tonight's queue (capacity used vs. available).
 * 2. **Upcoming bake nights** — each night's scheduled cookie count,
 *    capacity bar, and number of orders, for all future bake dates.
 * 3. **Recent orders** — the 8 most recent orders with status, rendered
 *    by the client component `AdminOverviewClient`.
 * 4. **Daily sales breakdown** — a 7-column grid showing cookies sold
 *    and revenue for each of the last 7 days.
 *
 * All data is fetched server-side from the admin API. Authentication is
 * enforced by `getAdminHeaders()`, which redirects to `/admin/login` on
 * 401.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiClientError, api } from '@/lib/api';
import { formatRupiah } from '@/lib/utils';
import type { BakeNightsResponse, ListOrdersResponse, SalesSummary } from '@cookies/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminHeaders } from './layout';
import { AdminOverviewClient } from './client';

export const metadata = { title: 'Overview · Studio' };

/**
 * Fetch all data the dashboard overview needs in a single parallel request.
 * Returns sales KPIs, upcoming bake nights, and the 8 most recent orders.
 */
async function fetchAdminData() {
  const headers = await getAdminHeaders();
  const [sales, nights, orders] = await Promise.all([
    api.get<SalesSummary>('/admin/dashboard/sales', { headers }),
    api.get<BakeNightsResponse>('/admin/dashboard/bake-nights', { headers }),
    api.get<ListOrdersResponse>('/admin/orders?pageSize=8', { headers }),
  ]);
  return { sales, nights, orders };
}

/**
 * Renders the full admin overview dashboard with KPIs, bake nights,
 * recent orders, and daily sales breakdown.
 */
export default async function AdminOverviewPage() {
  let data: Awaited<ReturnType<typeof fetchAdminData>> | null = null;
  try {
    data = await fetchAdminData();
  } catch (e) {
    // On 401, redirect to login; otherwise re-throw for the error boundary.
    if (e instanceof ApiClientError && e.status === 401) redirect('/admin/login');
    throw e;
  }
  if (!data) return null;
  const { sales, nights, orders } = data;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Studio overview</h1>
        <p className="text-muted-foreground">The next seven days, in numbers and orders.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Cookies sold (7d)" value={sales.cookiesSold.toString()} />
        <Kpi label="Revenue (7d)" value={formatRupiah(sales.revenue)} />
        <Kpi label="Orders (7d)" value={sales.orderCount.toString()} />
        <Kpi
          label="Tonight's queue"
          value={String(nights.nights[0]?.cookiesScheduled ?? 0)}
          sub={`of ${nights.nights[0]?.capacity ?? 20} cookies`}
        />
      </div>

      {/* Bake nights grid: one card per date with capacity bar */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming bake nights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {nights.nights.map((n) => {
              // Calculate fill percentage, capped at 100%.
              const pct = Math.min(100, Math.round((n.cookiesScheduled / n.capacity) * 100));
              return (
                <div key={n.date} className="rounded-md border border-border/60 bg-card p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{n.date}</p>
                  <p className="mt-1 font-display text-2xl tabular-nums">
                    {n.cookiesScheduled}/{n.capacity}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {n.orders.length} order{n.orders.length === 1 ? '' : 's'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent orders panel: linked to full orders view */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent orders</CardTitle>
          <Link
            href="/admin/orders"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {orders.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No orders yet. Once customers start ordering, they will appear here.
            </p>
          ) : (
            <AdminOverviewClient orders={orders.items} />
          )}
        </CardContent>
      </Card>

      {/* Daily sales breakdown: one card per day (7-day grid) */}
      <div className="grid gap-4 sm:grid-cols-7">
        {sales.daily.map((d) => (
          <div key={d.date} className="rounded-md border border-border/60 bg-card p-3 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {d.date.slice(5)}
            </p>
            <p className="mt-1 font-display text-2xl tabular-nums">{d.cookiesSold}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatRupiah(d.revenue)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Key Performance Indicator card.
 * Displays a labeled value with optional subtitle (e.g., capacity context).
 * Used in the admin dashboard overview for sales KPIs and queue stats.
 */
function Kpi({ label, value, sub }: { label: string; sub?: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-3xl tabular-nums">{value}</p>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}
