'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiClientError, api } from '@/lib/api';
import { formatDateTime, formatRupiah } from '@/lib/utils';
import type { Order, PaymentWebhookPayload } from '@cookies/shared';
import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function OrderConfirmation() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const ref = search.get('ref');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    api
      .get<Order>(`/public/orders/${params.id}`)
      .then(setOrder)
      .catch((e) => {
        if (e instanceof ApiClientError) setError(`${e.code}: ${e.message}`);
        else setError((e as Error).message);
      });
  }, [params.id]);

  const handlePay = async () => {
    if (!ref) return;
    setPaying(true);
    try {
      await api.post('/webhooks/payment/mock', {
        reference: ref,
        status: 'paid',
      } satisfies PaymentWebhookPayload);
      const updated = await api.get<Order>(`/public/orders/${params.id}`);
      setOrder(updated);
      toast.success('Payment received. Your cookies are in the queue.');
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message);
      else toast.error('Could not confirm payment');
    } finally {
      setPaying(false);
    }
  };

  if (error) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-4xl">We could not load your order</h1>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!order) {
    return <div className="container py-20 text-center text-muted-foreground">Loading…</div>;
  }

  const isPaid = order.paymentStatus === 'paid';
  const isFailed = order.paymentStatus === 'failed' || order.paymentStatus === 'expired';

  return (
    <div className="container max-w-3xl py-12">
      <div className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-sage-600" />
        <h1 className="mt-4 font-display text-4xl tracking-tight">
          Thank you, {order.customer.name.split(' ')[0]}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your order number is{' '}
          <span className="font-mono font-medium text-foreground">{order.orderNumber}</span>.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Estimated ready:{' '}
          <strong className="text-foreground">{formatDateTime(order.estimatedReadyAt)}</strong>
        </p>

        <div className="ornate-divider my-8" />

        {isPaid ? (
          <div className="rounded-md border border-sage-200 bg-sage-50 p-4 text-sage-800">
            <p className="font-medium">Payment received</p>
            <p className="mt-1 text-sm">We are queuing your cookies for the next bake.</p>
          </div>
        ) : isFailed ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <p className="font-medium">Payment did not go through</p>
            <p className="mt-1 text-sm">Please try again or contact us on WhatsApp.</p>
          </div>
        ) : (
          <div className="rounded-md border border-cream-300 bg-cream-100 p-4 text-cocoa-800">
            <p className="font-medium">Awaiting payment</p>
            <p className="mt-1 text-sm">
              In production, the gateway opens in a new tab. For this demo, click below to simulate
              a successful payment.
            </p>
            <Button className="mt-4" onClick={handlePay} disabled={paying}>
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Confirming…
                </>
              ) : (
                'Simulate successful payment'
              )}
            </Button>
          </div>
        )}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Order details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {order.items.map((it) => (
            <div key={it.menuItemId} className="flex justify-between">
              <span>
                {it.quantity} × {it.name}
              </span>
              <span className="tabular-nums">{formatRupiah(it.subtotal)}</span>
            </div>
          ))}
          <div className="ornate-divider" />
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatRupiah(order.subtotal)}</span>
          </div>
          {order.deliveryFee > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery fee</span>
              <span className="tabular-nums">{formatRupiah(order.deliveryFee)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span className="tabular-nums font-display text-xl">{formatRupiah(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="space-y-3 p-6 text-sm">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-accent-foreground" />
            <p>
              A receipt has been queued to <strong>{order.customer.email}</strong>. In dev, you can
              read it in <code>tmp/emails/</code>.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-muted-foreground">
              Fulfillment: <strong className="text-foreground">{order.fulfillment}</strong>
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/order/track?ref=${order.orderNumber}`}>
                Track this order <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
