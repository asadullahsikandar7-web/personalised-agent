import type { z, ZodSchema } from 'zod';
import type { PermissionLevel } from '@personal-agent/shared';

export interface ToolContext {
  userId: string;
  conversationId?: string;
  /** Timezone of the requesting user, used by time-sensitive tools (reminders, datetime). */
  timezone: string;
  /** True only when this execution is running *after* an approval was explicitly granted. */
  isApprovedExecution: boolean;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
  /** Machine-readable error code when success is false, e.g. 'NOT_FOUND', 'INVALID_INPUT'. */
  errorCode?: string;
}

export interface AgentTool<Input = unknown, Output = unknown> {
  name: string;
  description: string;
  inputSchema: ZodSchema<Input>;
  permissionLevel: PermissionLevel;
  /** Human-readable list of permissions/capabilities this tool needs, shown in approval UI. */
  requiredPermissions?: string[];
  execute(input: Input, context: ToolContext): Promise<ToolResult<Output>>;
  /**
   * Builds the one-line, user-facing summary shown on an approval request
   * ("Send message: 'Hello team...'"). Falls back to a generic summary if omitted.
   */
  describeAction?(input: Input): string;
}

/**
 * Smart constructor for AgentTool. Type inference is anchored on `inputSchema` (a single source
 * of truth: S), so `execute`/`describeAction` parameter types are inferred automatically from
 * z.infer<S> without callers needing to write out generic type arguments by hand.
 */
export function defineTool<S extends ZodSchema<unknown>, Output = unknown>(tool: {
  name: string;
  description: string;
  inputSchema: S;
  permissionLevel: PermissionLevel;
  requiredPermissions?: string[];
  execute(input: z.infer<S>, context: ToolContext): Promise<ToolResult<Output>>;
  describeAction?(input: z.infer<S>): string;
}): AgentTool<z.infer<S>, Output> {
  return tool as AgentTool<z.infer<S>, Output>;
}
