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
