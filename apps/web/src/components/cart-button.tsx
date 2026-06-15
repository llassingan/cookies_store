'use client';
import { useCart } from '@/store/cart';

export function CartButton() {
  const count = useCart((s) => s.lines.reduce((acc, l) => acc + l.quantity, 0));
  return (
    <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-4 py-1.5 text-sm">
      <span aria-hidden className="text-base">
        🥐
      </span>
      <span className="font-medium tabular-nums">{count}</span>
      <span className="hidden text-muted-foreground sm:inline">in basket</span>
    </div>
  );
}
