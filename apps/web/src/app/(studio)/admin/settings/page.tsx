/**
 * Shop Settings Page (Server Component)
 *
 * Allows the baker to configure core operational parameters that
 * control how Maison Croûte's order system behaves.
 *
 * The settings fetched from the API and passed to `SettingsForm` include:
 *
 * - **Daily capacity** — maximum cookies per bake day (default 20)
 * - **Cutoff hour** — orders placed after this hour (in the shop's
 *   timezone) are scheduled for H+2 instead of H+1 (default 17 = 5pm)
 * - **Max queue days** — how far into the future customers can book
 *   orders (default 3, giving ~60 cookies of total pipeline capacity)
 * - **Delivery fee** — flat fee in IDR for delivery orders
 * - **Closed dates** — specific dates (e.g., holidays) when the shop is
 *   unavailable. Sundays are auto-closed separately by the backend.
 * - **Master open/close toggle** — when `isOpen` is false, the storefront
 *   shows a "closed" banner and rejects new orders.
 *
 * These settings drive the capacity planning engine and the storefront
 * banner message. Changing them takes effect immediately.
 *
 * Authentication enforced by `getAdminHeaders()`.
 */
import { ApiClientError, api } from '@/lib/api';
import type { ShopSettings } from '@cookies/shared';
import { redirect } from 'next/navigation';
import { getAdminHeaders } from '../layout';
import { SettingsForm } from './settings-form';

export const metadata = { title: 'Settings · Studio' };

export default async function SettingsPage() {
  const headers = await getAdminHeaders();
  let settings: ShopSettings;
  try {
    settings = await api.get<ShopSettings>('/admin/settings', { headers });
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 401) redirect('/admin/login');
    throw e;
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Capacity, cutoff, and closed dates drive the queue and the storefront banner.
        </p>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
