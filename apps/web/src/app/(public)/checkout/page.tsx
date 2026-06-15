'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiClientError, api } from '@/lib/api';
import { formatRupiah } from '@/lib/utils';
import { useCart } from '@/store/cart';
import type { CartQuote, CreateOrderResponse } from '@cookies/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const Schema = z.object({
  name: z.string().min(1, 'Please tell us your name').max(120),
  email: z.string().email('Please use a valid email'),
  phone: z.string().min(6, 'Please add a phone we can reach on WhatsApp'),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});
type FormValues = z.infer<typeof Schema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, fulfillment, clear } = useCart();
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lines.length === 0) {
      router.replace('/cart');
      return;
    }
    const controller = new AbortController();
    api
      .post<CartQuote>(
        '/public/cart/quote',
        {
          items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
          fulfillment,
        },
        { signal: controller.signal },
      )
      .then(setQuote)
      .catch((e) => {
        if (e instanceof ApiClientError) setError(`${e.code}: ${e.message}`);
        else setError((e as Error).message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [lines, fulfillment, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { name: '', email: '', phone: '', address: '', notes: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    const idempotencyKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `ck_${crypto.randomUUID()}`
        : `ck_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      const res = await api.post<CreateOrderResponse>('/public/orders', {
        items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        fulfillment,
        customer: values,
        idempotencyKey,
      });
      clear();
      router.push(`/order/${res.orderId}?ref=${res.paymentReference}`);
    } catch (e) {
      if (e instanceof ApiClientError) {
        setError(`${e.code}: ${e.message}`);
        toast.error(e.message);
      } else {
        setError((e as Error).message);
        toast.error('Could not place the order');
      }
    } finally {
      setSubmitting(false);
    }
  });

  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">Preparing checkout…</div>
    );
  }

  return (
    <div className="container grid gap-8 py-12 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Almost there</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us where to send the cookies. We will email a copy of the order.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" error={form.formState.errors.name?.message}>
              <Input {...form.register('name')} placeholder="Sasha Anwar" />
            </Field>
            <Field label="Phone (WhatsApp)" error={form.formState.errors.phone?.message}>
              <Input {...form.register('phone')} placeholder="0812 3456 7890" />
            </Field>
          </div>
          <Field label="Email" error={form.formState.errors.email?.message}>
            <Input type="email" {...form.register('email')} placeholder="you@email.com" />
          </Field>
          {fulfillment === 'delivery' ? (
            <Field label="Delivery address" error={form.formState.errors.address?.message}>
              <Textarea
                rows={3}
                {...form.register('address')}
                placeholder="Street, building, notes for the courier"
              />
            </Field>
          ) : null}
          <Field label="Notes (optional)" error={form.formState.errors.notes?.message}>
            <Textarea
              rows={2}
              {...form.register('notes')}
              placeholder="Allergies, gift message, etc."
            />
          </Field>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || !quote || Boolean(quote.blockedReason)}
          >
            {submitting
              ? 'Placing order…'
              : quote
                ? `Place order · ${formatRupiah(quote.total)}`
                : 'Place order'}
          </Button>
        </form>
      </div>
      <div>
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>You’re ordering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((l) => (
              <div key={l.menuItemId} className="flex items-center justify-between text-sm">
                <span>
                  {l.quantity} × <span className="text-muted-foreground">{l.name}</span>
                </span>
                <span className="tabular-nums">{formatRupiah(l.unitPrice * l.quantity)}</span>
              </div>
            ))}
            {quote ? (
              <div className="space-y-2 border-t border-border/60 pt-3 text-sm">
                <Row label="Subtotal" value={formatRupiah(quote.subtotal)} />
                {quote.deliveryFee > 0 ? (
                  <Row label="Delivery fee" value={formatRupiah(quote.deliveryFee)} />
                ) : null}
                <Row label="Total" value={formatRupiah(quote.total)} bold />
                <p className="text-xs text-muted-foreground">
                  Ready on {quote.estimatedReadyDate} after 10:00.
                </p>
              </div>
            ) : null}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Payment is processed by our gateway. We never store your card details.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block">{label}</Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
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
