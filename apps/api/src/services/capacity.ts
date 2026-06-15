import { addDays, format, parseISO } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export type CapacityResult = {
  /** Date in the shop timezone (YYYY-MM-DD) when the cookies will be baked. */
  bakeDate: string;
  /** Estimated ready timestamp in UTC. */
  estimatedReadyAt: string;
  /** True if the order crosses the daily cutoff and is pushed to the next day. */
  crossesCutoff: boolean;
  /** True if the order cannot be placed within the queue window. */
  blocked: boolean;
  reason: string | null;
};

export type CapacityInput = {
  /** Quantity of cookies in the order. */
  quantity: number;
  /** Time the order is placed (UTC). */
  now: Date;
  /** Daily cookie capacity (the order has a `quantity` <= `dailyCapacity` invariant). */
  dailyCapacity: number;
  /** Order cutoff hour in shop timezone (e.g. 17 for 5pm). Orders after this roll to next day. */
  cutoffHour: number;
  /** Maximum number of days ahead an order can be queued. */
  maxQueueDays: number;
  /** IANA timezone string (e.g. 'Asia/Jakarta'). */
  timezone: string;
  /** ISO dates (YYYY-MM-DD) when the shop is closed. */
  closedDates: ReadonlyArray<string>;
  /** Sum of cookies already scheduled per bake date, keyed by YYYY-MM-DD in shop timezone. */
  scheduledPerDate: Readonly<Record<string, number>>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
void DAY_MS;

function toIsoDate(d: Date, timezone: string): string {
  return format(toZonedTime(d, timezone), 'yyyy-MM-dd');
}

function zonedDateTimeToUtc(
  yyyyMmDd: string,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  const naive = parseISO(
    `${yyyyMmDd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
  );
  return fromZonedTime(naive, timezone);
}

/**
 * Decide which bake date a new order should be assigned to.
 *
 * Rules (from the spec):
 *  - 1 day can hold at most `dailyCapacity` cookies.
 *  - Orders placed before the cutoff hour in the shop timezone are processed today
 *    and ready tomorrow (H+1).
 *  - Orders placed after the cutoff are processed the next working day and ready
 *    the day after (H+2).
 *  - Closed days do not accept new work; an order that would land on a closed day
 *    is rolled forward to the next open day.
 *  - If no open day inside the queue window has room, the order is blocked.
 */
export function planBakeDate(input: CapacityInput): CapacityResult {
  const {
    quantity,
    now,
    dailyCapacity,
    cutoffHour,
    maxQueueDays,
    timezone,
    closedDates,
    scheduledPerDate,
  } = input;

  const nowZoned = toZonedTime(now, timezone);
  const currentHour = nowZoned.getHours();
  const crossesCutoff = currentHour >= cutoffHour;

  const todayIso = toIsoDate(now, timezone);
  let candidateIso = addDaysString(todayIso, crossesCutoff ? 2 : 1);

  for (let i = 0; i <= maxQueueDays; i += 1) {
    if (isOpenDay(candidateIso, closedDates)) {
      const used = scheduledPerDate[candidateIso] ?? 0;
      if (used + quantity <= dailyCapacity) {
        return {
          bakeDate: candidateIso,
          estimatedReadyAt: zonedDateTimeToUtc(candidateIso, 10, 0, timezone).toISOString(),
          crossesCutoff,
          blocked: false,
          reason: null,
        };
      }
    }
    candidateIso = addDaysString(candidateIso, 1);
  }

  return {
    bakeDate: candidateIso,
    estimatedReadyAt: zonedDateTimeToUtc(candidateIso, 10, 0, timezone).toISOString(),
    crossesCutoff,
    blocked: true,
    reason: `We're fully booked for the next ${maxQueueDays} days. Please try again later.`,
  };
}

function addDaysString(yyyyMmDd: string, days: number): string {
  const parts = yyyyMmDd.split('-').map((n) => Number.parseInt(n, 10));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const utc = new Date(Date.UTC(y, m - 1, d));
  return format(addDays(utc, days), 'yyyy-MM-dd');
}

function isOpenDay(yyyyMmDd: string, closedDates: ReadonlyArray<string>): boolean {
  if (closedDates.includes(yyyyMmDd)) return false;
  const parts = yyyyMmDd.split('-').map((n) => Number.parseInt(n, 10));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day !== 0;
}

export { toIsoDate, zonedDateTimeToUtc, isOpenDay, addDaysString };
export { planBakeDate as planCapacity };
