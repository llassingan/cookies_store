'use client';
/**
 * Maison Croûte — Cart Button
 *
 * Client component (`"use client"`) displayed in the site header.
 * Subscribes to the Zustand cart store via a selector to compute the total item count
 * (sum of all line quantities). Renders a compact pill with a croissant emoji,
 * the item count in tabular-nums, and the "in basket" label (hidden on mobile).
 *
 * Why a client component: needs to reactively update the count whenever the cart
 * store changes (add, remove, setQuantity, clear), which requires reading from
 * a client-side state manager.
 */
import { useCart } from '@/store/cart';

export function CartButton() {
  // Selector: reduces over all cart lines to get a single total count integer.
  // Zustand only re-renders when the selector's return value changes.
  const count = useCart((s) => s.lines.reduce((acc, l) => acc + l.quantity, 0));
  return (
    <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-4 py-1.5 text-sm">
      {/* 🥐: croissant emoji as a playful bakery icon — familiar and warm. */}
      <span aria-hidden className="text-base">
        🥐
      </span>
      <span className="font-medium tabular-nums">{count}</span>
      {/* "in basket" hidden on small screens to save horizontal space in the header. */}
      <span className="hidden text-muted-foreground sm:inline">in basket</span>
    </div>
  );
}
