'use client';
/**
 * Maison Croûte — Cart Indicator (Floating Action Button)
 *
 * Client component (`"use client"`) rendered as a floating action button at the
 * bottom-right of the viewport. Only visible when:
 * 1. The component has mounted (to avoid hydration mismatches — the server can't know
 *    the cart count, so the button is hidden until the client takes over).
 * 2. The cart is non-empty (`count > 0`).
 *
 * The FAB links to `/cart` and shows a shopping-bag icon plus the total item count.
 * The `shadow-cocoa-900/20` shadow and `hover:scale-105` transition give it a subtle
 * tactile quality consistent with the bakery aesthetic.
 *
 * Why a client component: reads from the Zustand cart store and uses `useEffect` for
 * the `mounted` guard pattern.
 */
import { useCart } from '@/store/cart';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function CartIndicator() {
  // Hydration guard: the server has no access to localStorage (Zustand persistence),
  // so we hide the FAB until the client mounts to avoid a flash of incorrect state.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = useCart((s) => s.lines.reduce((acc, l) => acc + l.quantity, 0));
  if (!mounted) return null;
  if (count === 0) return null;
  return (
    <Link
      href="/cart"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-cocoa-900/20 transition-transform hover:scale-105"
    >
      <ShoppingBag className="h-4 w-4" />
      View basket · {count}
    </Link>
  );
}
