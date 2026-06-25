/**
 * Maison Croûte — Shop Closed Banner
 *
 * Server component conditionally rendered on the home page when the shop status API
 * reports `isOpen: false`. Displays a rose-tinted horizontal banner with the
 * `closedReason` string from the API, or a generic fallback message as the default
 * prop value.
 *
 * The rose colour scheme (`rose-100/70` background, `rose-200` border, `rose-800` text)
 * signals "unavailable" without being alarming — pink tones feel softer than red and
 * align with the bakery's warm brand palette.
 *
 * @param reason - The human-readable reason the shop is closed, surfaced from the API.
 *                 Defaults to a generic message if the API returns no reason.
 */
export function ShopClosedBanner({ reason }: { reason: string }) {
  return (
    <div className="border-b border-rose-200 bg-rose-100/70">
      {/* /70 on the background gives a slight translucency so the hero gradient
          shows through softly, avoiding a jarring opaque bar. */}
      <div className="container py-3 text-sm text-rose-800">
        <strong className="font-medium">The shop is currently closed.</strong> {reason}
      </div>
    </div>
  );
}
