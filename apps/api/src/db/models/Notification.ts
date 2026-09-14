import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { NOTIFICATION_TYPES } from '@personal-agent/shared';

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    relatedEntityId: { type: String, default: null },
  },
  { timestamps: true },
);
notificationSchema.index({ userId: 1, createdAt: -1 });

export type NotificationDoc = HydratedDocument<InferSchemaType<typeof notificationSchema>>;
export const NotificationModel = model('Notification', notificationSchema);
