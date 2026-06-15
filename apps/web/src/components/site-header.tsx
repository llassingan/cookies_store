import Link from 'next/link';
import { CartButton } from './cart-button';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg">
            M
          </span>
          <span className="font-display text-2xl leading-none tracking-tight">
            Maison <span className="italic">Croûte</span>
          </span>
        </Link>
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
