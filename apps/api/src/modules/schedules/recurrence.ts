import { parseExpression } from 'cron-parser';
import { DateTime } from 'luxon';
import type { RecurrenceRuleInput } from '@personal-agent/shared';

/**
 * Computes the next occurrence strictly after `after`, given the original scheduled instant
 * and a recurrence rule, in the reminder's IANA timezone. Returns null for one-time reminders
 * (recurrenceRule undefined or type 'none') or invalid custom expressions.
 */
export function computeNextTrigger(
  scheduledAt: Date,
  timezone: string,
  after: Date,
  recurrenceRule?: RecurrenceRuleInput | null,
): Date | null {
  if (!recurrenceRule || recurrenceRule.type === 'none') return null;

  const zone = timezone || 'UTC';
  const interval = recurrenceRule.interval ?? 1;
  let candidate = DateTime.fromJSDate(scheduledAt, { zone });
  const afterDt = DateTime.fromJSDate(after, { zone });

  switch (recurrenceRule.type) {
    case 'daily': {
      while (candidate <= afterDt) {
        candidate = candidate.plus({ days: interval });
      }
      return candidate.toJSDate();
    }
    case 'weekly': {
      const days = recurrenceRule.daysOfWeek?.length
        ? recurrenceRule.daysOfWeek
        : [scheduledAt.getUTCDay()];
      let next = candidate;
      // Walk forward day by day (bounded) until we land on an allowed weekday after `after`.
      for (let i = 0; i < 366; i++) {
        next = next.plus({ days: 1 });
        const weekday = next.weekday % 7; // luxon: Mon=1..Sun=7 -> convert to Sun=0..Sat=6
        if (days.includes(weekday) && next > afterDt) {
          return next.toJSDate();
        }
      }
      return null;
    }
    case 'monthly': {
      const dayOfMonth = recurrenceRule.dayOfMonth ?? scheduledAt.getUTCDate();
      let next = candidate;
      for (let i = 0; i < 36; i++) {
        next = next.plus({ months: interval }).set({ day: Math.min(dayOfMonth, next.daysInMonth ?? 28) });
        if (next > afterDt) return next.toJSDate();
      }
      return null;
    }
    case 'custom': {
      if (!recurrenceRule.cronExpression) return null;
      try {
        return parseExpression(recurrenceRule.cronExpression, {
          currentDate: after,
          tz: zone,
        }).next().toDate();
      } catch {
        return null;
      }
    }
    default:
      return null;
  }
}
