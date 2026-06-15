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
