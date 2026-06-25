/**
 * Maison Croûte — Order Confirmation (Thank-You) Page
 *
 * Step 4 of the customer flow: / -> /cart -> /checkout -> /order/[id] -> /order/track.
 *
 * This is a **server component** (RSC) that wraps the client-side {@link OrderConfirmation}
 * in a `<Suspense>` boundary. The Suspense pattern is necessary because:
 * - `OrderConfirmation` uses `useParams()` and `useSearchParams()`, which are only available
 *   in the browser and require the client bundle to be hydrated.
 * - During SSR, `<Suspense>` provides a graceful loading fallback while the client component
 *   mounts and fetches the order from the API.
 *
 * The `[id]` dynamic segment captures the order ID from the URL (e.g. `/order/abc123`).
 */
import { Suspense } from 'react';
import { OrderConfirmation } from './confirmation';

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-20 text-center text-muted-foreground">Loading your order…</div>
      }
    >
      <OrderConfirmation />
    </Suspense>
  );
}
