/**
 * Maison Croûte — Site Footer
 *
 * Server component rendered at the bottom of the public layout.
 * Provides three columns of bakery info and a copyright line:
 *
 * - **Brand**: the bakery name + a one-line description.
 * - **Hours**: order cutoff and ready-window rules (H+1 defaults).
 * - **Studio**: pickup and courier logistics.
 *
 * The footer uses a subdued background (`bg-secondary/30`) and border to visually
 * separate from the main content without competing for attention.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-secondary/30">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="font-display text-2xl">Maison Croûte</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A small home bakery baking European-style cookies in small batches, one tray at a
              time.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-medium uppercase tracking-wider text-muted-foreground">Hours</p>
            <p className="mt-2 text-foreground/80">Orders close daily at 17:00 (Asia/Jakarta).</p>
            <p className="text-foreground/80">Same-day orders ready tomorrow (H+1).</p>
          </div>
          <div className="text-sm">
            <p className="font-medium uppercase tracking-wider text-muted-foreground">Studio</p>
            <p className="mt-2 text-foreground/80">WhatsApp the courier on the day of delivery.</p>
            <p className="text-foreground/80">Pickup window: 10:00 – 18:00 on the bake date.</p>
          </div>
        </div>
        {/* Dynamic year via new Date() — stays current without a rebuild. */}
        <div className="mt-8 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Maison Croûte. Baked with patience.
        </div>
      </div>
    </footer>
  );
}
