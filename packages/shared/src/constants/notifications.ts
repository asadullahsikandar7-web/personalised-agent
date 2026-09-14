export const NOTIFICATION_TYPES = [
  'reminder',
  'approval_request',
  'tool_failure',
  'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
