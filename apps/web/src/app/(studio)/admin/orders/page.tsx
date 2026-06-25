/**
 * Orders Management Page (Server Component)
 *
 * Displays the full list of customer orders for the Maison Croûte baker.
 *
 * **Features:**
 * - Searchable via URL `?focus=<orderId>` parameter: the orders table
 *   automatically opens the detail dialog for the specified order.
 * - Filterable by status via the `?status=<status>` query parameter
 *   (e.g., `?status=queued` shows only queued orders).
 * - Paginated on the server side (up to 100 orders per page, controlled
 *   by the `pageSize` query parameter sent to the API).
 *
 * **Bake-night state machine:** clicking an order opens a dialog
 *   (`OrdersTable`) where the baker can advance the order through the
 *   status pipeline: `queued → baking → ready → completed`, or
 *   cancel it at any point before completion.
 *
 * Authentication is enforced by `getAdminHeaders()`, which redirects to
 * `/admin/login` on 401.
 */
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
  // Build the API query string, forwarding status filter if present.
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  // Request up to 100 orders at a time (server-side pagination).
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
