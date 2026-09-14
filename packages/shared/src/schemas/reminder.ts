import { z } from 'zod';
import { RECURRENCE_TYPES } from '../constants/schedules';

export const recurrenceRuleSchema = z.object({
  type: z.enum(RECURRENCE_TYPES).default('none'),
  /** For weekly: 0-6 (Sun-Sat). For monthly: 1-31. Ignored for daily/none. */
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  /** RFC-like custom cron expression, only used when type === 'custom'. */
  cronExpression: z.string().max(120).optional(),
  interval: z.number().int().min(1).max(365).default(1),
});
export type RecurrenceRuleInput = z.infer<typeof recurrenceRuleSchema>;

export const createReminderSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  scheduledAt: z.string().datetime(),
  timezone: z.string().trim().min(1).max(64).default('UTC'),
  recurrenceRule: recurrenceRuleSchema.optional(),
  notificationChannel: z.enum(['push', 'local', 'in_app']).default('local'),
});
export type CreateReminderInput = z.infer<typeof createReminderSchema>;

export const updateReminderSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  scheduledAt: z.string().datetime().optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  recurrenceRule: recurrenceRuleSchema.optional(),
  notificationChannel: z.enum(['push', 'local', 'in_app']).optional(),
});
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;

export const snoozeReminderSchema = z.object({
  minutes: z.number().int().min(1).max(1440).default(10),
});
export type SnoozeReminderInput = z.infer<typeof snoozeReminderSchema>;

export const listRemindersQuerySchema = z.object({
  status: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListRemindersQuery = z.infer<typeof listRemindersQuerySchema>;
