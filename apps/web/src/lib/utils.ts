/**
 * Maison Croûte — Shared UI Helpers
 *
 * A grab-bag of small utility functions used across the storefront and admin
 * pages. They don't belong to any single component or page; they're general
 * formatting and styling helpers.
 *
 * What's here:
 * — cn()          Merges Tailwind CSS classes safely, resolving conflicts.
 * — formatRupiah() Formats a number as Indonesian Rupiah (Rp) currency.
 * — formatDate()   Formats an ISO date string into a human-readable date.
 * — formatDateTime() Formats an ISO string into a full date + time.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges multiple Tailwind CSS class strings into one, resolving conflicts.
 *
 * clsx handles conditional classes (falsy values are dropped, objects are
 * evaluated). tailwind-merge then scans the result and removes duplicate
 * utility classes, keeping the last one. Without tailwind-merge, something
 * like `cn("px-4 py-2", "px-6")` would produce `"px-4 py-2 px-6"` — two
 * competing padding values. With it, the result is `"py-2 px-6"`: the
 * later `px-6` wins over `px-4`.
 *
 * This is the standard pattern in shadcn/ui projects and is used everywhere
 * we need to compose component base styles with variant overrides.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as Indonesian Rupiah.
 *
 * Uses the id-ID locale for thousands grouping (dots as separators, e.g.
 * Rp 25.000). No decimal places because Rupiah prices are whole numbers.
 * The "Rp" prefix is manually prepended because Intl.NumberFormat with
 * currency style "IDR" produces a space-separated output that doesn't
 * match the shop's design.
 *
 * Examples:
 *   formatRupiah(0)      → "Rp 0"
 *   formatRupiah(25000)  → "Rp 25.000"
 *   formatRupiah(150000) → "Rp 150.000"
 */
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Formats an ISO date string into a short human-readable date.
 *
 * The en-GB locale gives us a "day month year" order (e.g. "25 Jun 2026")
 * which matches the shop's European-style branding. The default options
 * produce a 2-digit day, abbreviated month, and 4-digit year.
 *
 * An optional `options` parameter lets callers override the formatting
 * (e.g. for order summaries that only need the month and day).
 *
 * Examples:
 *   formatDate("2026-06-25T00:00:00Z")                → "25 Jun 2026"
 *   formatDate("2026-06-25", { weekday: 'long' })     → "Thursday, 25 Jun 2026"
 */
export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

/**
 * Formats an ISO date string into a full date + time string.
 *
 * Same en-GB locale and date format as formatDate(), but adds hours and
 * minutes. Used in order tracking and admin dashboards where exact timing
 * matters (e.g. "25 Jun 2026, 17:30").
 *
 * Example:
 *   formatDateTime("2026-06-25T17:30:00+07:00") → "25 Jun 2026, 17:30"
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
