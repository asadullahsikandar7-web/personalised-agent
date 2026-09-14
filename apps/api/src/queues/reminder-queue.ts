import { Queue } from 'bullmq';
import { createQueueConnection } from './connection';

export const REMINDER_QUEUE_NAME = 'reminders';

export interface ReminderJobData {
  reminderId: string;
  userId: string;
  idempotencyKey: string;
}

let queue: Queue<ReminderJobData> | null = null;

export function getReminderQueue(): Queue<ReminderJobData> {
  if (!queue) {
    queue = new Queue<ReminderJobData>(REMINDER_QUEUE_NAME, { connection: createQueueConnection() });
  }
  return queue;
}
