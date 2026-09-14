export const RECURRENCE_TYPES = ['none', 'daily', 'weekly', 'monthly', 'custom'] as const;
export type RecurrenceType = (typeof RECURRENCE_TYPES)[number];

export const REMINDER_STATUSES = [
  'scheduled',
  'triggered',
  'snoozed',
  'completed',
  'cancelled',
  'missed',
] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ['push', 'local', 'in_app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
