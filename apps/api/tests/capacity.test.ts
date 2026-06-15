import { describe, expect, it } from 'vitest';
import { getEnv } from '../src/env';
import { addDaysString, isOpenDay, planCapacity, toIsoDate } from '../src/services/capacity';

describe('capacity engine', () => {
  const tz = 'Asia/Jakarta';
  const closed: string[] = [];

  it('orders before cutoff bake next day (H+1)', () => {
    const now = new Date('2026-06-14T08:00:00Z');
    const res = planCapacity({
      quantity: 5,
      now,
      dailyCapacity: 20,
      cutoffHour: 17,
      maxQueueDays: 3,
      timezone: tz,
      closedDates: closed,
      scheduledPerDate: {},
    });
    expect(res.blocked).toBe(false);
    expect(res.bakeDate).toBe('2026-06-15');
    expect(res.crossesCutoff).toBe(false);
  });

  it('orders after cutoff bake day after tomorrow (H+2)', () => {
    const now = new Date('2026-06-14T13:00:00Z');
    const res = planCapacity({
      quantity: 5,
      now,
      dailyCapacity: 20,
      cutoffHour: 17,
      maxQueueDays: 3,
      timezone: tz,
      closedDates: closed,
      scheduledPerDate: {},
    });
    expect(res.bakeDate).toBe('2026-06-16');
    expect(res.crossesCutoff).toBe(true);
  });

  it('rolls to the next day when today is at capacity', () => {
    const now = new Date('2026-06-15T08:00:00Z');
    const res = planCapacity({
      quantity: 5,
      now,
      dailyCapacity: 20,
      cutoffHour: 17,
      maxQueueDays: 3,
      timezone: tz,
      closedDates: closed,
      scheduledPerDate: { '2026-06-16': 20 },
    });
    expect(res.bakeDate).toBe('2026-06-17');
  });

  it('skips closed dates and Sundays', () => {
    expect(isOpenDay('2026-06-15', [])).toBe(true);
    expect(isOpenDay('2026-06-15', ['2026-06-15'])).toBe(false);
    const sunday = '2026-06-21';
    expect(isOpenDay(sunday, [])).toBe(false);
  });

  it('blocks when the queue window is full', () => {
    const now = new Date('2026-06-15T08:00:00Z');
    const res = planCapacity({
      quantity: 5,
      now,
      dailyCapacity: 20,
      cutoffHour: 17,
      maxQueueDays: 2,
      timezone: tz,
      closedDates: closed,
      scheduledPerDate: { '2026-06-16': 20, '2026-06-17': 20, '2026-06-18': 20 },
    });
    expect(res.blocked).toBe(true);
    expect(res.reason).toMatch(/fully booked/i);
  });

  it('date arithmetic helpers work', () => {
    expect(addDaysString('2026-06-14', 1)).toBe('2026-06-15');
    expect(addDaysString('2026-06-30', 1)).toBe('2026-07-01');
    expect(addDaysString('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('toIsoDate returns YYYY-MM-DD', () => {
    const d = new Date('2026-06-14T12:00:00Z');
    const iso = toIsoDate(d, tz);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('environment', () => {
  it('loads valid env or throws a helpful error', () => {
    expect(() => getEnv()).not.toThrow();
  });
});
