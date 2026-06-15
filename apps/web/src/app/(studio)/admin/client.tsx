'use client';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/utils';
import type { Order } from '@cookies/shared';
import Link from 'next/link';

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
