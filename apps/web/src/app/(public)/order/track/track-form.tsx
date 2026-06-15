'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiClientError, api } from '@/lib/api';
import { formatDateTime, formatRupiah } from '@/lib/utils';
import type { Order } from '@cookies/shared';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

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

export function TrackForm() {
  const search = useSearchParams();
  const initial = search.get('ref') ?? '';
  const [ref, setRef] = useState(initial);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ref.trim()) return;
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await api.get<Order>(`/public/orders/${encodeURIComponent(ref.trim())}`);
      setOrder(res);
    } catch (e) {
      if (e instanceof ApiClientError)
        setError(
          e.code === 'not_found'
            ? 'No order with that number was found.'
            : `${e.code}: ${e.message}`,
        );
      else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-12">
      <h1 className="font-display text-4xl tracking-tight">Track your order</h1>
      <p className="mt-2 text-muted-foreground">
        Enter the order number from your confirmation email (e.g. CK20250614-001).
      </p>
      <form onSubmit={onSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor="ref" className="sr-only">
            Order number
          </Label>
          <Input
            id="ref"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="CK20250614-001"
          />
        </div>
        <Button type="submit" disabled={loading || !ref.trim()}>
          <Search className="h-4 w-4" /> Look up
        </Button>
      </form>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      {order ? (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Order {order.orderNumber}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Placed on {formatDateTime(order.createdAt)}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[order.status]}>
              {order.status.replaceAll('_', ' ')}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Fulfillment" value={order.fulfillment} />
              <Info label="Payment" value={order.paymentStatus} />
              <Info label="Estimated ready" value={formatDateTime(order.estimatedReadyAt)} />
              <Info label="Total" value={formatRupiah(order.total)} />
            </div>
            <div>
              <p className="font-medium">Items</p>
              <ul className="mt-2 space-y-1">
                {order.items.map((it) => (
                  <li key={it.menuItemId} className="flex justify-between">
                    <span>
                      {it.quantity} × {it.name}
                    </span>
                    <span className="tabular-nums">{formatRupiah(it.subtotal)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild variant="outline">
              <Link href={`/order/${order.id}`}>View full confirmation</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium capitalize">{value}</p>
    </div>
  );
}
