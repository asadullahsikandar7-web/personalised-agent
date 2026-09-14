/**
 * Permission levels for agent tools.
 * - safe: read-only or fully reversible, no approval needed, always allowed.
 * - normal: mutates user-owned data but is low-risk (create a note/task); no approval needed.
 * - approval_required: user must explicitly approve the exact action before execution.
 * - restricted: disabled by default / requires explicit configuration (e.g. real web search, external sends).
 */
export const PERMISSION_LEVELS = ['safe', 'normal', 'approval_required', 'restricted'] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

export const PERMISSION_RANK: Record<PermissionLevel, number> = {
  safe: 0,
  normal: 1,
  approval_required: 2,
  restricted: 3,
};
