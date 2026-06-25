/**
 * Admin Overview Client Component
 *
 * This file exists as a client boundary for the admin dashboard overview.
 * The parent `/admin/page.tsx` is a server component that fetches all data
 * (sales KPIs, bake nights, recent orders), then passes the recent orders
 * to this client component for rendering.
 *
 * The pattern keeps the heavy data-fetching on the server while allowing
 * interactive UI (like status badges) to be rendered on the client.
 *
 * @module admin/client
 */
'use client';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/utils';
import type { Order } from '@cookies/shared';
import Link from 'next/link';

// Maps each order status to a Badge variant for color-coding.
// The status values follow the Maison Croûte order state machine:
// awaiting_payment → paid → queued → baking → ready → completed
// (cancelled allowed at any point before completed)
const STATUS_VARIANT: Record<
  Order['status'],
  'default' | 'warning' | 'info' | 'success' | 'danger' | 'secondary'
> = {
  awaiting_payment: 'warning',
  paid: 'info',
  queued: 'info',
  baking: 'warning',
  ready: 'success',
  completed: 'secondary',
  cancelled: 'danger',
};

/**
 * Renders the recent orders list on the admin dashboard overview.
 * Each order shows its number (linked to the orders detail view),
 * customer name, cookie count, status badge, and total in IDR.
 *
 * @param orders - The most recent orders, fetched server-side
 */
export function AdminOverviewClient({ orders }: { orders: Order[] }) {
  return (
    <ul className="divide-y divide-border/60">
      {orders.map((o) => (
        <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <div>
            <Link
              href={`/admin/orders?focus=${o.id}`}
              className="font-mono text-foreground hover:underline"
            >
              {o.orderNumber}
            </Link>
            <p className="text-xs text-muted-foreground">
              {o.customer.name} · {o.items.reduce((s, i) => s + i.quantity, 0)} cookies
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={STATUS_VARIANT[o.status]}>{o.status.replaceAll('_', ' ')}</Badge>
            <span className="tabular-nums">{formatRupiah(o.total)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
