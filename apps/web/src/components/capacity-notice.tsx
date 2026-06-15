import { CalendarDays, Clock, Truck } from 'lucide-react';

export function CapacityNotice() {
  return (
    <section className="container pt-12">
      <div className="grid gap-4 rounded-2xl border border-border/60 bg-card p-6 md:grid-cols-3">
        <Notice
          icon={<CalendarDays className="h-5 w-5" />}
          title="Twenty cookies a day"
          body="We bake small. Once a date is full, your order moves to the next available day — no exceptions."
        />
        <Notice
          icon={<Clock className="h-5 w-5" />}
          title="Orders close at 17:00"
          body="Place your order before 5pm for tomorrow's batch. After 5pm, ready the day after."
        />
        <Notice
          icon={<Truck className="h-5 w-5" />}
          title="Pickup or delivery"
          body="Pickup at the studio, or we arrange a courier via WhatsApp on the bake date."
        />
      </div>
    </section>
  );
}

function Notice({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-accent-foreground">
        {icon}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
