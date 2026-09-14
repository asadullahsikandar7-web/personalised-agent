import type { NotificationChannel, ReminderStatus, RecurrenceType } from '../constants/schedules';

export interface RecurrenceRuleDTO {
  type: RecurrenceType;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  cronExpression?: string;
  interval: number;
}

export interface ReminderDTO {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  timezone: string;
  recurrenceRule: RecurrenceRuleDTO | null;
  status: ReminderStatus;
  notificationChannel: NotificationChannel;
  lastTriggeredAt: string | null;
  nextTriggerAt: string | null;
  createdAt: string;
  updatedAt: string;
}
