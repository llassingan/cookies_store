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
