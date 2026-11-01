import { describe, it, expect } from 'vitest';
import { computeNextTrigger } from '../../src/modules/schedules/recurrence';

describe('computeNextTrigger', () => {
  it('returns null for a one-time reminder (no recurrence rule)', () => {
    const result = computeNextTrigger(new Date(), 'UTC', new Date(), undefined);
    expect(result).toBeNull();
  });

  it('returns null when recurrence type is "none"', () => {
    const result = computeNextTrigger(new Date(), 'UTC', new Date(), { type: 'none', interval: 1 });
    expect(result).toBeNull();
  });

  it('advances a daily reminder by one day', () => {
    const scheduledAt = new Date('2025-01-01T19:00:00.000Z');
    const after = new Date('2025-01-01T19:00:00.000Z');
    const next = computeNextTrigger(scheduledAt, 'UTC', after, { type: 'daily', interval: 1 });
    expect(next?.toISOString()).toBe('2025-01-02T19:00:00.000Z');
  });

  it('advances a daily reminder by the configured interval', () => {
    const scheduledAt = new Date('2025-01-01T09:00:00.000Z');
    const after = new Date('2025-01-01T09:00:00.000Z');
    const next = computeNextTrigger(scheduledAt, 'UTC', after, { type: 'daily', interval: 3 });
    expect(next?.toISOString()).toBe('2025-01-04T09:00:00.000Z');
  });

  it('finds the next matching weekday for a weekly reminder', () => {
    // 2025-01-06 is a Monday.
    const scheduledAt = new Date('2025-01-06T08:00:00.000Z');
    const after = new Date('2025-01-06T08:00:00.000Z');
    // Every Monday (1).
    const next = computeNextTrigger(scheduledAt, 'UTC', after, { type: 'weekly', daysOfWeek: [1], interval: 1 });
    expect(next?.toISOString()).toBe('2025-01-13T08:00:00.000Z');
  });

  it('keeps the day-of-month for a monthly reminder', () => {
    const scheduledAt = new Date('2025-01-15T12:00:00.000Z');
    const after = new Date('2025-01-15T12:00:00.000Z');
    const next = computeNextTrigger(scheduledAt, 'UTC', after, { type: 'monthly', dayOfMonth: 15, interval: 1 });
    expect(next?.getUTCMonth()).toBe(1); // February
    expect(next?.getUTCDate()).toBe(15);
  });

  it('evaluates custom cron expressions in the reminder timezone', () => {
    const result = computeNextTrigger(
      new Date('2025-01-05T12:00:00.000Z'),
      'UTC',
      new Date('2025-01-05T12:00:00.000Z'),
      { type: 'custom', cronExpression: '0 9 * * 1', interval: 1 },
    );
    expect(result?.toISOString()).toBe('2025-01-06T09:00:00.000Z');
  });
});
