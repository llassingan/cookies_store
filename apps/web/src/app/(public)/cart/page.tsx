'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiClientError, api } from '@/lib/api';
import { formatRupiah } from '@/lib/utils';
import { useCart } from '@/store/cart';
import type { CartQuote } from '@cookies/shared';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function CartPage() {
  const { lines, setQuantity, remove, clear, fulfillment, setFulfillment } = useCart();
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.post<CartQuote>(
          '/public/cart/quote',
          {
            items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
            fulfillment,
          },
          { signal: controller.signal },
        );
        setQuote(res);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof ApiClientError) setError(`${e.code}: ${e.message}`);
        else setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [lines, fulfillment]);

  if (lines.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-4xl">Your basket is empty</h1>
        <p className="mt-3 text-muted-foreground">
          Pick a few cookies from the menu to get started.
        </p>
        <Button asChild className="mt-6">
          <Link href="/#menu">Browse the menu</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container grid gap-8 py-12 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Your basket</h1>
        <p className="mt-2 text-muted-foreground">
          Adjust quantities, choose how to get your cookies, and continue to checkout.
        </p>
        <div className="mt-8 space-y-4">
          {lines.map((line) => (
            <Card key={line.menuItemId}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cream-200 to-cream-100">
                  <span className="font-display text-2xl">🍪</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{line.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatRupiah(line.unitPrice)} each
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setQuantity(line.menuItemId, line.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-display text-xl tabular-nums">
                    {line.quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setQuantity(line.menuItemId, line.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="w-28 text-right font-display text-lg tabular-nums">
                  {formatRupiah(line.unitPrice * line.quantity)}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(line.menuItemId)}
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 flex justify-between">
          <Button variant="ghost" onClick={clear}>
            Empty basket
          </Button>
        </div>
      </div>

      <div>
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Fulfillment
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['pickup', 'delivery'] as const).map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setFulfillment(f)}
                    className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                      fulfillment === f
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:bg-secondary/40'
                    }`}
                  >
                    {f === 'pickup' ? 'Pickup' : 'Delivery'}
                  </button>
                ))}
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {quote ? (
              <div className="space-y-2 border-t border-border/60 pt-4 text-sm">
                <Row label="Subtotal" value={formatRupiah(quote.subtotal)} />
                {quote.deliveryFee > 0 ? (
                  <Row label="Delivery fee" value={formatRupiah(quote.deliveryFee)} />
                ) : null}
                <Row label="Total" value={formatRupiah(quote.total)} bold />
                <div className="ornate-divider mt-4" />
                <p className="text-sm text-foreground/80">
                  Ready on <strong>{quote.estimatedReadyDate}</strong>{' '}
                  {quote.crossesCutoff ? (
                    <span className="text-muted-foreground">(after today’s cutoff)</span>
                  ) : null}
                </p>
                {quote.blockedReason ? (
                  <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                    {quote.blockedReason}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {loading ? 'Calculating…' : 'Select a fulfillment option to see your total.'}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              asChild
              className="w-full"
              size="lg"
              disabled={!quote || Boolean(quote.blockedReason)}
            >
              <Link href="/checkout">
                {quote?.blockedReason ? 'Basket is full' : 'Continue to checkout'}
              </Link>
            </Button>
          </CardFooter>
        </Card>
        {quote && !quote.blockedReason ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Estimated ready:{' '}
            {new Date(quote.estimatedReadyAt).toLocaleString('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
      <span className={`tabular-nums ${bold ? 'font-display text-xl' : ''}`}>{value}</span>
    </div>
  );
}
