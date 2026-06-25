/**
 * Maison Croûte — Root Layout (App Shell)
 *
 * This is the outermost layout for every route in the Next.js app.
 * It is a **server component** (no "use client" directive) and runs at build/request time.
 *
 * Responsibilities:
 * - Loads Google Fonts via next/font/google:
 *   - **Cormorant Garamond** (--font-display): a refined serif for headings and display text.
 *     Chosen for its bakery/editorial warmth — it reads like a patisserie window sign.
 *   - **Inter** (--font-body): a modern, highly legible sans-serif for body copy and UI labels.
 *     Keeps forms and cart interactions crisp and readable.
 * - Sets `<html lang="en">` and attaches both CSS custom property variables so Tailwind's
 *   `font-display` / `font-body` utilities resolve throughout the tree.
 * - Exports static `metadata` for SEO (title + description used by search engines and link previews).
 * - Mounts the `<Toaster>` from Sonner (position: top-center, richColors) so any page or client
 *   component can show toast notifications without additional setup.
 */
import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import '../styles/globals.css';

// Cormorant Garamond — the bakery serif. 400–700 weight range covers body, medium emphasis, and bold headings.
// display: 'swap' prevents FOIT (Flash of Invisible Text) by showing the fallback font immediately.
const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

// Inter — the workhorse sans-serif for body text, inputs, labels, and cart quantities.
// Light weight (300) is available for subtle secondary text; 400–600 covers the bulk of UI.
const body = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

// Static metadata is inlined at build time and never needs to be dynamic.
// Google uses the title as the search result headline and the description as the snippet.
export const metadata: Metadata = {
  title: 'Maison Croûte — Hand-baked cookies, made for tomorrow',
  description:
    'A small home bakery crafting European-style cookies with slow ingredients and same-day attention. Order before 5pm for tomorrow’s bake.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The font variables are consumed by Tailwind's font-display / font-body utility classes.
    // Attaching them on <html> makes them available to every descendant without prop drilling.
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen font-body">
        {children}
        {/* Sonner's Toaster is leaner than alternatives; richColors uses the Tailwind theme tokens. */}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
