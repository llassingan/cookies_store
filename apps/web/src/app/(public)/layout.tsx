/**
 * Maison Croûte — Public Area Layout
 *
 * Wraps every route inside the `(public)` route group.
 * This is a **server component** that composes shared site chrome:
 * - `<SiteHeader>`: sticky header with logo, nav, and cart button.
 * - `<main>`: flex-1 so content pushes the footer to the bottom even on short pages.
 * - `<SiteFooter>`: bakery info, hours, and copyright.
 * - `<CartIndicator>`: floating FAB that appears when the cart has items.
 *
 * The route group `(public)` exists so admin routes (`/admin/*`) can use a different layout
 * (admin chrome + auth gating) without inheriting this one.
 */
import { CartIndicator } from '@/components/cart-indicator';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    // min-h-screen + flex-col + flex-1 on main = sticky footer pattern without fixed heights.
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CartIndicator />
    </div>
  );
}
