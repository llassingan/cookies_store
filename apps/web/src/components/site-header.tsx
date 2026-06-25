/**
 * Maison Croûte — Site Header
 *
 * Sticky header used by the public layout (`(public)/layout.tsx`).
 * This is a **server component**: it renders statically and does not need client-side hydration.
 * The only interactive element inside is the {@link CartButton}, which is itself a client component.
 *
 * UI elements:
 * - **"M" monogram**: a circular primary-coloured badge with the letter "M" in the display serif
 *   font. Acts as a visual anchor linking back to `/`. The circle shape echoes the cookie
 *   illustration motif used throughout the site.
 * - **"Maison Croûte" wordmark**: the full brand name with "Croûte" italicised for contrast.
 * - **Desktop nav**: Menu, How it works, Track order — hidden on mobile (md:flex breakpoint).
 * - **Blur backdrop**: the header uses `bg-background/80 backdrop-blur` so page content is
 *   softly visible through the sticky bar as the user scrolls, giving a premium glass-like feel.
 */
import Link from 'next/link';
import { CartButton } from './cart-button';

export function SiteHeader() {
  return (
    // sticky + z-30 keeps the header above all page content.
    // The backdrop-blur effect requires `supports-[backdrop-filter]:bg-background/60` as a
    // progressive enhancement: browsers that don't support backdrop-filter fall back to the
    // opaque bg-background/80.
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo area: "M" monogram circle + wordmark. */}
        <Link href="/" className="flex items-center gap-3">
          {/* The monogram circle uses the primary colour to stand out against the soft cream/white
              background. font-display ensures the "M" matches the rest of the bakery typography. */}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg">
            M
          </span>
          <span className="font-display text-2xl leading-none tracking-tight">
            Maison <span className="italic">Croûte</span>
          </span>
        </Link>
        {/* Desktop-only nav: hidden on mobile, flex from md breakpoint up. */}
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <Link href="/#menu" className="transition-colors hover:text-foreground">
            Menu
          </Link>
          <Link href="/#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="/order/track" className="transition-colors hover:text-foreground">
            Track order
          </Link>
        </nav>
        <CartButton />
      </div>
    </header>
  );
}
