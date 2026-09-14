import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { NOTIFICATION_CHANNELS, RECURRENCE_TYPES, REMINDER_STATUSES } from '@personal-agent/shared';

const recurrenceRuleSchema = new Schema(
  {
    type: { type: String, enum: RECURRENCE_TYPES, default: 'none' },
    daysOfWeek: { type: [Number], default: undefined },
    dayOfMonth: { type: Number, default: undefined },
    cronExpression: { type: String, default: undefined },
    interval: { type: Number, default: 1 },
  },
  { _id: false },
);

const reminderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    scheduledAt: { type: Date, required: true },
    timezone: { type: String, default: 'UTC' },
    recurrenceRule: { type: recurrenceRuleSchema, default: null },
    status: { type: String, enum: REMINDER_STATUSES, default: 'scheduled', index: true },
    notificationChannel: { type: String, enum: NOTIFICATION_CHANNELS, default: 'local' },
    lastTriggeredAt: { type: Date, default: null },
    nextTriggerAt: { type: Date, default: null, index: true },
    jobId: { type: String, default: null },
    // Not database-unique: the key is always prefixed with this reminder's own _id (see
    // modules/schedules/service.ts), so it can never collide across documents. Real idempotency
    // for job execution comes from BullMQ's own jobId uniqueness, not a Mongo constraint - and a
    // `unique` index here would reject multiple reminders sharing the schema default (null).
    idempotencyKey: { type: String, default: null },
  },
  { timestamps: true },
);
reminderSchema.index({ userId: 1, status: 1, nextTriggerAt: 1 });

export type ReminderDoc = HydratedDocument<InferSchemaType<typeof reminderSchema>>;
export const ReminderModel = model('Reminder', reminderSchema);
