/**
 * Maison Croûte — Hero Section
 *
 * Server component that renders the main hero banner at the top of the storefront (`/`).
 *
 * Visual composition:
 * - A gradient background (`from-cream-100 via-background to-background`) that softly
 *   transitions the warm cream tone into the page body.
 * - Two **radial gradients** overlaid at low opacity (`0.18`) positioned at the top-left
 *   and top-right corners. These create a subtle sunburst/glow effect without an image asset,
 *   keeping the POC zero-dependency on external resources.
 * - Left side: tagline (Maison Croûte label), main heading with italic "made for tomorrow",
 *   descriptive paragraph, and two CTA buttons ("See today's menu" + "Track an order").
 * - Right side: a **CSS-only cookie illustration** built from concentric rounded circles
 *   with gradient fills. The layers simulate a cookie cross-section: a cream outer ring,
 *   cocoa middle layers, and "small batch / est. today" text in the centre.
 *
 * Why CSS-only illustrations: there are no real product photos yet, and CSS gradients give
 * a consistent, brand-aligned look that doesn't require image hosting or lazy-loading.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-cream-100 via-background to-background">
      {/* Radial gradients: positioned at 20%/20% (top-left) and 80%/0% (top-right).
          The rgba values (217, 168, 113) are the warm accent/cream tones from the design tokens.
          pointer-events-none prevents the overlay from blocking text selection and clicks. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(217, 168, 113, 0.18), transparent 50%), radial-gradient(circle at 80% 0%, rgba(168, 127, 86, 0.18), transparent 50%)',
        }}
      />
      <div className="container relative grid items-center gap-10 py-20 md:grid-cols-[1.1fr_1fr] md:py-28">
        <div>
          <p className="font-display text-sm uppercase tracking-[0.4em] text-accent-foreground/80">
            Maison Croûte
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
            Hand-baked cookies,
            <br />
            <span className="italic text-accent-foreground/90">made for tomorrow.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            A small home bakery mixing European-style cookies in single batches, the morning of
            every bake. Order before 5pm and they will be in your hands the next day.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#menu"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
            >
              See today’s menu
            </a>
            <a
              href="/order/track"
              className="inline-flex items-center justify-center rounded-md border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40"
            >
              Track an order
            </a>
          </div>
        </div>
        {/* CSS-only cookie illustration: concentric rounded circles create depth.
            Layer 1 (outer): cream gradient, acts as the "dough" base.
            Layer 2 (middle): darker cocoa gradient, the cookie edge.
            Layer 3 (inner): darkest cocoa, the centre.
            Text: "small batch / est. today" sits in the middle with semi-transparent cream text. */}
        <div className="relative">
          <div className="relative mx-auto aspect-square w-full max-w-md rounded-full bg-gradient-to-br from-cream-200 via-cream-100 to-cream-50 shadow-inner">
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-cocoa-300 to-cocoa-600 shadow-2xl" />
            <div className="absolute inset-16 rounded-full bg-gradient-to-br from-cocoa-500 to-cocoa-800" />
            {/* Centred text: `inset-1/2` + `-translate-x-1/2 -translate-y-1/2` is the classic
                CSS centering trick for absolutely positioned elements. */}
            <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-display text-3xl italic text-cream-50/90">
              small batch
              <br />
              <span className="text-base uppercase tracking-[0.3em] not-italic">est. today</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
