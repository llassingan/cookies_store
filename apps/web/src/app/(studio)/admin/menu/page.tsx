/**
 * Menu Management Page (Server Component)
 *
 * The CRUD interface for the Maison Croûte cookie menu.
 *
 * **Operations:**
 * - **List** all cookies (server-fetched, passed to the client
 *   `MenuManager` component).
 * - **Add** new menu items via a dialog with name, description, price,
 *   image URL, availability toggle, and sort order.
 * - **Edit** existing items through the same form fields.
 * - **Toggle availability** inline: available items appear on the
 *   storefront; hidden items are excluded from the public menu.
 * - **Delete** items (with a confirmation prompt warning that existing
 *   carts referencing the deleted item will be rejected at checkout).
 *
 * Authentication enforced by `getAdminHeaders()`.
 */
import { ApiClientError, api } from '@/lib/api';
import type { ListMenuItemsResponse, MenuItem } from '@cookies/shared';
import { redirect } from 'next/navigation';
import { getAdminHeaders } from '../layout';
import { MenuManager } from './menu-manager';

export const metadata = { title: 'Menu · Studio' };

export default async function MenuPage() {
  const headers = await getAdminHeaders();
  let res: ListMenuItemsResponse;
  try {
    res = await api.get<ListMenuItemsResponse>('/admin/menu', { headers });
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 401) redirect('/admin/login');
    throw e;
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Menu</h1>
        <p className="text-muted-foreground">
          Add, edit, and retire cookies. The storefront only shows items that are marked available.
        </p>
      </div>
      <MenuManager initial={res.items as unknown as MenuItem[]} />
    </div>
  );
}
