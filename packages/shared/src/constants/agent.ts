export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'expired'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const MESSAGE_ROLES = ['user', 'assistant', 'system', 'tool'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const TOOL_EXECUTION_STATUSES = [
  'pending',
  'awaiting_approval',
  'succeeded',
  'failed',
  'rejected',
] as const;
export type ToolExecutionStatus = (typeof TOOL_EXECUTION_STATUSES)[number];

/** Default expiry window for a pending approval request. */
export const APPROVAL_EXPIRY_MINUTES = 15;
