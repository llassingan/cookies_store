import { ApiClientError, api } from '@/lib/api';
import type { ListOrdersResponse } from '@cookies/shared';
import { redirect } from 'next/navigation';
import { getAdminHeaders } from '../layout';
import { OrdersTable } from './orders-table';

export const metadata = { title: 'Orders · Studio' };

export default async function OrdersPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; focus?: string }> }) {
  const params = await searchParams;
  const headers = await getAdminHeaders();
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  qs.set('pageSize', '100');

  let res: ListOrdersResponse;
  try {
    res = await api.get<ListOrdersResponse>(`/admin/orders?${qs.toString()}`, { headers });
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 401) redirect('/admin/login');
    throw e;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Orders</h1>
        <p className="text-muted-foreground">Click an order to update its bake-night status.</p>
      </div>
      <OrdersTable orders={res.items} initialFocusId={params.focus ?? null} />
    </div>
  );
}
