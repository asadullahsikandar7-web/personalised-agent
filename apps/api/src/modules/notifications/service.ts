import { NotificationModel, type NotificationDoc } from '../../db/models';
import { AppError } from '../../utils/errors';
import { paginateResult } from '../../utils/pagination';
import type { NotificationDTO, NotificationType } from '@personal-agent/shared';

export function toNotificationDTO(doc: NotificationDoc): NotificationDTO {
  return {
    id: doc._id.toString(),
    type: doc.type as NotificationType,
    title: doc.title,
    body: doc.body,
    isRead: doc.isRead,
    relatedEntityId: doc.relatedEntityId ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityId?: string;
}

/**
 * Creates an in-app notification record. This is the always-available baseline channel.
 * Local device notifications are scheduled client-side (Expo Notifications) and push delivery
 * is a foundation only until a push provider/device tokens are configured - see
 * docs/known-platform-limitations.md and docs/scheduling.md.
 */
export async function createNotification(userId: string, input: CreateNotificationInput): Promise<NotificationDoc> {
  return NotificationModel.create({ userId, ...input });
}

export async function listNotifications(userId: string, page: number, limit: number, unreadOnly?: boolean) {
  const filter: Record<string, unknown> = { userId };
  if (unreadOnly) filter.isRead = false;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    NotificationModel.countDocuments(filter),
  ]);
  return paginateResult(items.map(toNotificationDTO), total, page, limit);
}

export async function markNotificationRead(userId: string, id: string): Promise<NotificationDoc> {
  const doc = await NotificationModel.findOne({ _id: id, userId });
  if (!doc) throw AppError.notFound('Notification not found');
  doc.isRead = true;
  await doc.save();
  return doc;
}
