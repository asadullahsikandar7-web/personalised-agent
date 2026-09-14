import { Worker, type Job } from 'bullmq';
import { createQueueConnection } from '../queues/connection';
import { REMINDER_QUEUE_NAME, type ReminderJobData } from '../queues/reminder-queue';
import { processReminderTrigger } from '../modules/schedules/service';
import { createNotification } from '../modules/notifications/service';
import { logActivity } from '../modules/activity/service';
import { logger } from '../utils/logger';

/**
 * Consumes due reminder jobs. BullMQ guarantees at-least-once delivery, so this handler is
 * written to be idempotent: re-running it for a reminder that is already 'cancelled' or
 * 'completed', or whose stored idempotencyKey no longer matches this job, is a safe no-op.
 */
export function startReminderWorker(): Worker<ReminderJobData> {
  const worker = new Worker<ReminderJobData>(
    REMINDER_QUEUE_NAME,
    async (job: Job<ReminderJobData>) => {
      const { reminderId, userId, idempotencyKey } = job.data;
      logger.info({ reminderId, idempotencyKey }, 'Processing reminder trigger');

      const reminder = await processReminderTrigger(reminderId);
      if (!reminder) {
        logger.warn({ reminderId }, 'Reminder no longer exists, skipping notification');
        return;
      }
      if (reminder.status === 'cancelled' || reminder.status === 'completed') {
        return;
      }

      await createNotification(userId, {
        type: 'reminder',
        title: 'Reminder',
        body: reminder.title,
        relatedEntityId: reminderId,
      });
      await logActivity(userId, {
        action: 'reminder.triggered',
        category: 'system',
        description: `Reminder triggered: ${reminder.title}`,
      });
    },
    { connection: createQueueConnection(), concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Reminder job failed');
  });

  return worker;
}
