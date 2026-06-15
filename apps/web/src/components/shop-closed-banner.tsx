export function ShopClosedBanner({ reason }: { reason: string }) {
  return (
    <div className="border-b border-rose-200 bg-rose-100/70">
      <div className="container py-3 text-sm text-rose-800">
        <strong className="font-medium">The shop is currently closed.</strong> {reason}
      </div>
    </div>
  );
}
