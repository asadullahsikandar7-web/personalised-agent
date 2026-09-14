import { ReminderModel, type ReminderDoc } from '../../db/models';
import { AppError } from '../../utils/errors';
import { paginateResult } from '../../utils/pagination';
import { getReminderQueue } from '../../queues/reminder-queue';
import { computeNextTrigger } from './recurrence';
import { logActivity } from '../activity/service';
import type {
  CreateReminderInput,
  UpdateReminderInput,
  ListRemindersQuery,
  ReminderDTO,
  RecurrenceType,
} from '@personal-agent/shared';

export function toReminderDTO(doc: ReminderDoc): ReminderDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? null,
    scheduledAt: doc.scheduledAt.toISOString(),
    timezone: doc.timezone,
    recurrenceRule: doc.recurrenceRule
      ? {
          type: doc.recurrenceRule.type as RecurrenceType,
          daysOfWeek: doc.recurrenceRule.daysOfWeek ?? undefined,
          dayOfMonth: doc.recurrenceRule.dayOfMonth ?? undefined,
          cronExpression: doc.recurrenceRule.cronExpression ?? undefined,
          interval: doc.recurrenceRule.interval ?? 1,
        }
      : null,
    status: doc.status as ReminderDTO['status'],
    notificationChannel: doc.notificationChannel as ReminderDTO['notificationChannel'],
    lastTriggeredAt: doc.lastTriggeredAt ? doc.lastTriggeredAt.toISOString() : null,
    nextTriggerAt: doc.nextTriggerAt ? doc.nextTriggerAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** Schedules (or reschedules) the BullMQ delayed job that will fire this reminder. */
async function enqueueReminderJob(doc: ReminderDoc): Promise<void> {
  const delayMs = Math.max(0, doc.nextTriggerAt!.getTime() - Date.now());
  // BullMQ job ids may not contain ":", so idempotency keys use "-" as the separator.
  const idempotencyKey = `${doc._id.toString()}-${doc.nextTriggerAt!.getTime()}`;
  const job = await getReminderQueue().add(
    'trigger-reminder',
    { reminderId: doc._id.toString(), userId: doc.userId.toString(), idempotencyKey },
    { delay: delayMs, jobId: idempotencyKey, removeOnComplete: true, removeOnFail: 100 },
  );
  doc.jobId = job.id ?? null;
  doc.idempotencyKey = idempotencyKey;
  await doc.save();
}

export async function createReminder(userId: string, input: CreateReminderInput): Promise<ReminderDoc> {
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw AppError.validation('scheduledAt must be a valid ISO 8601 datetime');
  }
  const doc = await ReminderModel.create({
    userId,
    title: input.title,
    description: input.description ?? null,
    scheduledAt,
    timezone: input.timezone,
    recurrenceRule: input.recurrenceRule ?? null,
    notificationChannel: input.notificationChannel ?? 'local',
    status: 'scheduled',
    nextTriggerAt: scheduledAt,
  });
  await enqueueReminderJob(doc);
  await logActivity(userId, {
    action: 'reminder.created',
    category: 'tool',
    description: `Reminder set: ${input.title} at ${scheduledAt.toISOString()}`,
  });
  return doc;
}

export async function listReminders(userId: string, query: ListRemindersQuery) {
  const filter: Record<string, unknown> = { userId };
  if (query.status) filter.status = query.status;
  if (query.from || query.to) {
    filter.scheduledAt = {};
    if (query.from) (filter.scheduledAt as Record<string, Date>).$gte = new Date(query.from);
    if (query.to) (filter.scheduledAt as Record<string, Date>).$lte = new Date(query.to);
  }
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    ReminderModel.find(filter).sort({ nextTriggerAt: 1 }).skip(skip).limit(query.limit),
    ReminderModel.countDocuments(filter),
  ]);
  return paginateResult(items.map(toReminderDTO), total, query.page, query.limit);
}

export async function getReminderOrThrow(userId: string, id: string): Promise<ReminderDoc> {
  const doc = await ReminderModel.findOne({ _id: id, userId });
  if (!doc) throw AppError.notFound('Reminder not found');
  return doc;
}

async function removeScheduledJob(doc: ReminderDoc): Promise<void> {
  if (doc.idempotencyKey) {
    const job = await getReminderQueue().getJob(doc.idempotencyKey);
    if (job) await job.remove().catch(() => undefined);
  }
}

export async function updateReminder(
  userId: string,
  id: string,
  input: UpdateReminderInput,
): Promise<ReminderDoc> {
  const doc = await getReminderOrThrow(userId, id);
  await removeScheduledJob(doc);

  if (input.title) doc.title = input.title;
  if (typeof input.description === 'string') doc.description = input.description;
  if (input.scheduledAt) doc.scheduledAt = new Date(input.scheduledAt);
  if (input.timezone) doc.timezone = input.timezone;
  if (input.recurrenceRule) doc.recurrenceRule = input.recurrenceRule;
  if (input.notificationChannel) doc.notificationChannel = input.notificationChannel;

  doc.status = 'scheduled';
  doc.nextTriggerAt = doc.scheduledAt;
  await enqueueReminderJob(doc);
  return doc;
}

export async function cancelReminder(userId: string, id: string): Promise<ReminderDoc> {
  const doc = await getReminderOrThrow(userId, id);
  await removeScheduledJob(doc);
  doc.status = 'cancelled';
  doc.nextTriggerAt = null;
  await doc.save();
  await logActivity(userId, { action: 'reminder.cancelled', category: 'tool', description: `Reminder cancelled: ${doc.title}` });
  return doc;
}

export async function snoozeReminder(userId: string, id: string, minutes: number): Promise<ReminderDoc> {
  const doc = await getReminderOrThrow(userId, id);
  await removeScheduledJob(doc);
  const nextTrigger = new Date(Date.now() + minutes * 60_000);
  doc.nextTriggerAt = nextTrigger;
  doc.status = 'snoozed';
  await enqueueReminderJob(doc);
  await logActivity(userId, { action: 'reminder.snoozed', category: 'tool', description: `Reminder snoozed ${minutes}m: ${doc.title}` });
  return doc;
}

export async function markReminderComplete(userId: string, id: string): Promise<ReminderDoc> {
  const doc = await getReminderOrThrow(userId, id);
  await removeScheduledJob(doc);
  doc.status = 'completed';
  doc.nextTriggerAt = null;
  await doc.save();
  await logActivity(userId, { action: 'reminder.completed', category: 'tool', description: `Reminder completed: ${doc.title}` });
  return doc;
}

/**
 * Called by the worker when a reminder's job fires. Marks it triggered, and if it recurs,
 * computes and enqueues the next occurrence. Idempotent: re-processing the same job id is a
 * no-op if the reminder is no longer in a state that expects this trigger.
 */
export async function processReminderTrigger(reminderId: string): Promise<ReminderDoc | null> {
  const doc = await ReminderModel.findById(reminderId);
  if (!doc) return null;
  if (doc.status === 'cancelled' || doc.status === 'completed') return doc;

  const now = new Date();
  doc.lastTriggeredAt = now;

  const next = computeNextTrigger(doc.scheduledAt, doc.timezone, now, doc.recurrenceRule as never);
  if (next) {
    doc.nextTriggerAt = next;
    doc.status = 'scheduled';
    await enqueueReminderJob(doc);
  } else {
    doc.nextTriggerAt = null;
    doc.status = 'triggered';
    await doc.save();
  }
  return doc;
}
