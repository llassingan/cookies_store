'use client';
/**
 * Maison Croûte — Menu Section
 *
 * Client component (`"use client"`) that renders the cookie menu as a responsive grid of cards.
 * Must be a client component because each card contains interactive cart controls
 * (add, increment, decrement) powered by the Zustand cart store.
 *
 * Each {@link MenuCard} displays:
 * - A **CSS-only cookie illustration** (coloured by cookie type — see {@link CookieIllustration})
 * - Cookie name and description (line-clamped to 3 lines)
 * - Unit price (IDR, formatted), with a "per piece" label
 * - Cart interaction: either an "Add to basket" button (when not in cart) or a +/- quantity
 *   control with the current cart count (when already added)
 *
 * Empty state: when `items` is an empty array (menu still being prepared), a single centred
 * message card is rendered instead of the grid.
 */
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { useCart } from '@/store/cart';
import type { PublicMenuItem } from '@cookies/shared';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export function MenuSection({ items }: { items: PublicMenuItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-border/60 bg-card p-8 text-center text-muted-foreground">
        The menu is being prepared. Please come back in a few minutes.
      </p>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <MenuCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function MenuCard({ item }: { item: PublicMenuItem }) {
  const { lines, add, setQuantity } = useCart();
  // If this item is already in the cart, show +/- controls; otherwise show the "Add" button.
  const inCart = lines.find((l) => l.menuItemId === item.id)?.quantity ?? 0;
  return (
    <Card className="flex flex-col">
      <CardHeader>
        {/* Cream gradient background behind the cookie illustration echoes the site's warm tones. */}
        <div className="mb-3 flex aspect-[4/3] items-center justify-center rounded-md bg-gradient-to-br from-cream-200 via-cream-100 to-cream-50">
          <CookieIllustration name={item.name} />
        </div>
        <CardTitle>{item.name}</CardTitle>
        <CardDescription className="line-clamp-3">{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="font-display text-2xl text-foreground">{formatRupiah(item.price)}</p>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">per piece</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        {inCart > 0 ? (
          // When the item is already in the cart, show quantity controls instead of the add button.
          // setQuantity(item.id, 0) removes the item from the cart via the store's reducer.
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(item.id, inCart - 1)}
              aria-label="Remove one"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-display text-2xl tabular-nums">{inCart}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(item.id, inCart + 1)}
              aria-label="Add one more"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => {
              add({
                menuItemId: item.id,
                name: item.name,
                unitPrice: item.price,
                imageUrl: item.imageUrl,
              });
              // Toast feedback confirms the action without a full page transition.
              toast.success(`${item.name} added to your basket`);
            }}
            className="w-full"
          >
            <ShoppingBag className="h-4 w-4" /> Add to basket
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

/**
 * Pure CSS cookie illustration: a circular gradient with accent dots.
 *
 * Instead of loading images (which would require hosting, alt-text, and lazy-loading),
 * each cookie is represented by a coloured circle with a lighter inset ring and three
 * small accent dots. The colour is chosen based on the cookie name:
 *
 * - **Pistachio / Saffron** -> sage green (botanical / nutty)
 * - **Rose / Madeleines** -> rose pink (floral / French pastry)
 * - **Tahini / Cardamom** -> cream-to-cocoa gradient (warm / Middle Eastern)
 * - **Default** (e.g. classic chocolate chip) -> solid cocoa brown
 *
 * This keeps the POC self-contained and visually consistent without external assets.
 */
function CookieIllustration({ name }: { name: string }) {
  const lower = name.toLowerCase();
  // Default: cocoa brown — works for chocolate chip, double chocolate, etc.
  let color = 'from-cocoa-400 to-cocoa-700';
  let accent = 'bg-cream-100/40';
  // Match cookie name keywords to flavour -> colour associations.
  if (lower.includes('pistachio') || lower.includes('saffron')) {
    color = 'from-sage-300 to-sage-600';
    accent = 'bg-cream-50/30';
  } else if (lower.includes('rose') || lower.includes('madeleines')) {
    color = 'from-rose-300 to-rose-600';
    accent = 'bg-cream-50/30';
  } else if (lower.includes('tahini') || lower.includes('cardamom')) {
    color = 'from-cream-300 to-cocoa-500';
    accent = 'bg-rose-200/40';
  }
  return (
    // The base circle with the flavour gradient.
    <div className={`relative h-32 w-32 rounded-full bg-gradient-to-br ${color} shadow-lg`}>
      {/* Inner ring: lighter accent colour creates a "frosted" or "filled" look. */}
      <div className={`absolute inset-2 rounded-full ${accent}`} />
      {/* Three small scattered dots simulate chocolate chips / nut pieces / dried fruit. */}
      <div className={`absolute left-4 top-6 h-3 w-3 rounded-full ${accent}`} />
      <div className={`absolute right-6 top-10 h-2 w-2 rounded-full ${accent}`} />
      <div className={`absolute bottom-6 left-8 h-2.5 w-2.5 rounded-full ${accent}`} />
    </div>
  );
}
