'use client';
import { useCart } from '@/store/cart';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function CartIndicator() {
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
