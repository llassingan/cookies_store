/**
 * Orders Data Table & Status Dialog (Client Component)
 *
 * The primary order management interface for the Maison Croûte baker.
 *
 * **Table columns:**
 * - **Order** — order number (monospaced, linked via the dialog)
 * - **Customer** — name and phone number
 * - **Status** — color-coded badge reflecting the current bake-night state
 * - **Payment** — payment status badge (paid / pending)
 * - **Items** — total cookie quantity across line items
 * - **Total** — order total in IDR
 * - **Ready** — estimated ready time (formatted datetime)
 * - **Open** — button that opens the status transition dialog
 *
 * **Bake-night state machine:**
 *   The `NEXT_STATUS` lookup defines valid transitions for each order
 *   status. The baker selects the next status from a dropdown in the
 *   dialog. Allowed transitions:
 *
 *   ```
 *   awaiting_payment  →  cancelled
 *   paid              →  queued, baking, cancelled
 *   queued            →  baking, cancelled
 *   baking            →  ready, cancelled
 *   ready             →  completed, cancelled
 *   completed         →  (terminal)
 *   cancelled         →  (terminal)
 *   ```
 *
 *   Cancelling is always available until the order reaches `completed`.
 *   Both `completed` and `cancelled` are terminal states with no further
 *   transitions.
 *
 * **Status badge color mapping** uses the same `STATUS_VARIANT` record
 *   found in `client.tsx`: awaiting_payment/paid are warning/info,
 *   queued is info, baking is warning, ready is success, completed is
 *   secondary, cancelled is danger.
 *
 * @module admin/orders-table
 */
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiClientError, api } from '@/lib/api';
import { formatDateTime, formatRupiah } from '@/lib/utils';
import type { Order, OrderStatus } from '@cookies/shared';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Color-codes each order status for the Badge component.
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

// Defines the allowed status transitions for the bake-night state machine.
// An empty array means the status is terminal (no further moves possible).
const NEXT_STATUS: Record<Order['status'], OrderStatus[]> = {
  awaiting_payment: ['cancelled'],
  paid: ['queued', 'baking', 'cancelled'],
  queued: ['baking', 'cancelled'],
  baking: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/**
 * Orders data table with inline status transition dialog.
 *
 * @param orders - Pre-fetched list of orders from the server
 * @param initialFocusId - If provided, auto-opens the detail dialog for
 *   this order (used when navigating from the dashboard overview via the
 *   `?focus=` query parameter)
 */
export function OrdersTable({
  orders: initial,
  initialFocusId,
}: { orders: Order[]; initialFocusId: string | null }) {
  const [orders, setOrders] = useState(initial);
  // The order currently open in the status transition dialog.
  const [active, setActive] = useState<Order | null>(null);
  // The next status the baker has selected from the dropdown.
  const [nextStatus, setNextStatus] = useState<OrderStatus | null>(null);
  const [saving, setSaving] = useState(false);

  // When navigating from another page with ?focus=<id>, find the matching
  // order and open its dialog automatically.
  useEffect(() => {
    if (!initialFocusId) return;
    const found = orders.find((o) => o.id === initialFocusId);
    if (found) setActive(found);
  }, [initialFocusId, orders]);

  // PATCH the order status to the API and update local state optimistically.
  const apply = async () => {
    if (!active || !nextStatus) return;
    setSaving(true);
    try {
      const updated = await api.patch<Order>(`/admin/orders/${active.id}/status`, {
        status: nextStatus,
      });
      // Synchronize local state with the API response to show the
      // updated status immediately without a full page reload.
      setOrders((cur) => cur.map((o) => (o.id === updated.id ? updated : o)));
      setActive(updated);
      toast.success(`Order ${updated.orderNumber} is now ${updated.status.replaceAll('_', ' ')}.`);
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message);
      else toast.error('Could not update order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Ready</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                  <TableCell>
                    <p className="font-medium">{o.customer.name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer.phone}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[o.status]}>
                      {o.status.replaceAll('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.paymentStatus === 'paid' ? 'success' : 'warning'}>
                      {o.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {o.items.reduce((s, i) => s + i.quantity, 0)}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatRupiah(o.total)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(o.estimatedReadyAt)}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setActive(o)}>
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!active}
        onOpenChange={(o) => {
          if (!o) {
            setActive(null);
            setNextStatus(null);
          }
        }}
      >
        <DialogContent>
          {active ? (
            <>
              <DialogHeader>
                <DialogTitle>Order {active.orderNumber}</DialogTitle>
                <DialogDescription>
                  {active.items.reduce((s, i) => s + i.quantity, 0)} cookies · {active.fulfillment}{' '}
                  · placed {formatDateTime(active.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Customer</p>
                  <p>{active.customer.name}</p>
                  <p className="text-muted-foreground">
                    {active.customer.email} · {active.customer.phone}
                  </p>
                  {active.customer.address ? (
                    <p className="text-muted-foreground">{active.customer.address}</p>
                  ) : null}
                  {active.customer.notes ? (
                    <p className="text-muted-foreground italic">“{active.customer.notes}”</p>
                  ) : null}
                </div>
                <div>
                  <p className="font-medium">Items</p>
                  <ul className="mt-1 space-y-1">
                    {active.items.map((it) => (
                      <li key={it.menuItemId} className="flex justify-between">
                        <span>
                          {it.quantity} × {it.name}
                        </span>
                        <span className="tabular-nums">{formatRupiah(it.subtotal)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Move to</p>
                  <Select onValueChange={(v) => setNextStatus(v as OrderStatus)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose next status" />
                    </SelectTrigger>
                    <SelectContent>
                      {NEXT_STATUS[active.status].length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No further transitions
                        </SelectItem>
                      ) : (
                        NEXT_STATUS[active.status].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replaceAll('_', ' ')}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setActive(null);
                    setNextStatus(null);
                  }}
                >
                  Close
                </Button>
                <Button onClick={apply} disabled={!nextStatus || saving}>
                  {saving ? 'Saving…' : 'Update status'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
