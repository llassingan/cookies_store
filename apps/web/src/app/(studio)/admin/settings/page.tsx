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
