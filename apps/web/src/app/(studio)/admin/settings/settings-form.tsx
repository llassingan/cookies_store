'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ApiClientError, api } from '@/lib/api';
import type { ShopSettings, UpdateShopSettingsRequest } from '@cookies/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const Schema = z.object({
  isOpen: z.boolean(),
  dailyCapacity: z.coerce.number().int().positive().max(1000),
  orderCutoffHour: z.coerce.number().int().min(0).max(23),
  maxQueueDays: z.coerce.number().int().positive().max(30),
  deliveryFee: z.coerce.number().int().nonnegative(),
  closedDates: z.string(),
});
type FormValues = z.infer<typeof Schema>;

export function SettingsForm({ initial }: { initial: ShopSettings }) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      isOpen: initial.isOpen,
      dailyCapacity: initial.dailyCapacity,
      orderCutoffHour: initial.orderCutoffHour,
      maxQueueDays: initial.maxQueueDays,
      deliveryFee: initial.deliveryFee,
      closedDates: initial.closedDates.join(', '),
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const closedDates = values.closedDates
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const body: UpdateShopSettingsRequest = {
        isOpen: values.isOpen,
        dailyCapacity: values.dailyCapacity,
        orderCutoffHour: values.orderCutoffHour,
        maxQueueDays: values.maxQueueDays,
        deliveryFee: values.deliveryFee,
        closedDates,
      };
      await api.patch<ShopSettings>('/admin/settings', body);
      toast.success('Settings saved');
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message);
      else toast.error('Could not save');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="isOpen" {...form.register('isOpen')} defaultChecked={initial.isOpen} />
            <Label htmlFor="isOpen">Shop is open for new orders</Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Daily cookie capacity"
              error={form.formState.errors.dailyCapacity?.message}
            >
              <Input type="number" min={1} {...form.register('dailyCapacity')} />
            </Field>
            <Field
              label="Order cutoff hour (0-23, shop timezone)"
              error={form.formState.errors.orderCutoffHour?.message}
            >
              <Input type="number" min={0} max={23} {...form.register('orderCutoffHour')} />
            </Field>
            <Field label="Max queue days" error={form.formState.errors.maxQueueDays?.message}>
              <Input type="number" min={1} max={30} {...form.register('maxQueueDays')} />
            </Field>
            <Field label="Delivery fee (IDR)" error={form.formState.errors.deliveryFee?.message}>
              <Input type="number" min={0} {...form.register('deliveryFee')} />
            </Field>
          </div>
          <Field
            label="Closed dates (comma-separated YYYY-MM-DD)"
            error={form.formState.errors.closedDates?.message}
          >
            <Input placeholder="2026-12-25, 2026-12-26" {...form.register('closedDates')} />
          </Field>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
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
