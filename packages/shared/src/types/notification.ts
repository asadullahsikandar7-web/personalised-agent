import type { NotificationType } from '../constants/notifications';

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  relatedEntityId: string | null;
  createdAt: string;
}
