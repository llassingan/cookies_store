/**
 * Maison Croûte — Order Tracking Page
 *
 * Step 5 (optional) of the customer flow: / -> /cart -> /checkout -> /order/[id] -> /order/track.
 *
 * This is a **server component** (RSC) that wraps the client-side {@link TrackForm} in a
 * `<Suspense>` boundary. The wrapper exists because `TrackForm` uses `useSearchParams()`
 * (to pre-fill the input from the `?ref=` query param), which requires a client boundary.
 *
 * The tracking page allows customers to look up their order by order number (e.g. CK20250614-001)
 * and see the current status, items, and estimated ready time.
 */
import { Suspense } from 'react';
import { TrackForm } from './track-form';

export default function TrackPage() {
  return (
    <Suspense
      fallback={<div className="container py-20 text-center text-muted-foreground">Loading…</div>}
    >
      <TrackForm />
    </Suspense>
  );
}
