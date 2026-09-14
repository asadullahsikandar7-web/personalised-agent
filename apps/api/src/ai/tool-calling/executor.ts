import { ToolExecutionModel, ApprovalRequestModel, UserModel } from '../../db/models';
import { getToolRegistry } from '../tools';
import type { ToolContext, ToolResult } from '../tools/types';
import { HARD_APPROVAL_REQUIRED_TOOLS } from '../../config/constants';
import { APPROVAL_EXPIRY_MINUTES } from '@personal-agent/shared';
import { logger } from '../../utils/logger';

export interface ExecuteToolOutcome {
  status: 'succeeded' | 'failed' | 'awaiting_approval' | 'rejected';
  result?: ToolResult<unknown>;
  approvalId?: string;
  toolExecutionId?: string;
}

function needsApproval(permissionLevel: string, toolName: string): boolean {
  if (HARD_APPROVAL_REQUIRED_TOOLS.has(toolName)) return true;
  return permissionLevel === 'approval_required' || permissionLevel === 'restricted';
}

/**
 * Runs a single tool call end-to-end: validates input, enforces the permission gate (creating
 * an ApprovalRequest instead of executing when required), executes the tool, and persists a
 * ToolExecution audit record either way. This is the single choke point every tool invocation
 * passes through, whether triggered by the agent during a conversation or a direct
 * POST /api/tools/:name/execute call.
 */
export async function executeToolCall(
  toolName: string,
  rawInput: unknown,
  context: ToolContext,
): Promise<ExecuteToolOutcome> {
  const registry = getToolRegistry();
  const tool = registry.get(toolName);

  if (!tool) {
    return {
      status: 'failed',
      result: { success: false, message: `Unknown tool "${toolName}".`, errorCode: 'UNKNOWN_TOOL' },
    };
  }

  const parsed = tool.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: 'failed',
      result: {
        success: false,
        message: `Invalid input for tool "${toolName}": ${parsed.error.issues.map((i) => i.message).join('; ')}`,
        errorCode: 'INVALID_INPUT',
      },
    };
  }

  if (needsApproval(tool.permissionLevel, tool.name) && !context.isApprovedExecution) {
    const summary = tool.describeAction?.(parsed.data) ?? `Run "${tool.name}"`;
    const approval = await ApprovalRequestModel.create({
      userId: context.userId,
      conversationId: context.conversationId ?? null,
      toolName: tool.name,
      input: parsed.data,
      summary,
      status: 'pending',
      expiresAt: new Date(Date.now() + APPROVAL_EXPIRY_MINUTES * 60_000),
    });
    return {
      status: 'awaiting_approval',
      approvalId: approval._id.toString(),
      result: { success: false, message: `This action needs your approval: ${summary}`, errorCode: 'APPROVAL_REQUIRED' },
    };
  }

  const toolExecution = await ToolExecutionModel.create({
    userId: context.userId,
    conversationId: context.conversationId ?? null,
    toolName: tool.name,
    input: parsed.data,
    permissionLevel: tool.permissionLevel,
    status: 'pending',
  });

  const startedAt = Date.now();
  try {
    const result = await tool.execute(parsed.data, context);
    toolExecution.status = result.success ? 'succeeded' : 'failed';
    toolExecution.result = result.data ?? null;
    toolExecution.errorMessage = result.success ? null : result.message;
    toolExecution.durationMs = Date.now() - startedAt;
    await toolExecution.save();

    return {
      status: result.success ? 'succeeded' : 'failed',
      result,
      toolExecutionId: toolExecution._id.toString(),
    };
  } catch (err) {
    logger.error({ err, toolName: tool.name }, 'Tool execution threw an unexpected error');
    toolExecution.status = 'failed';
    toolExecution.errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toolExecution.durationMs = Date.now() - startedAt;
    await toolExecution.save();
    return {
      status: 'failed',
      result: { success: false, message: 'The tool failed unexpectedly.', errorCode: 'TOOL_EXCEPTION' },
      toolExecutionId: toolExecution._id.toString(),
    };
  }
}

/** Executes a previously approved ApprovalRequest. Verifies ownership and expiry before running. */
export async function executeApprovedRequest(
  userId: string,
  approvalId: string,
): Promise<{ approvalStatus: 'approved' | 'rejected' | 'expired'; outcome?: ExecuteToolOutcome }> {
  const approval = await ApprovalRequestModel.findOne({ _id: approvalId, userId });
  if (!approval) {
    throw Object.assign(new Error('Approval request not found'), { statusCode: 404 });
  }
  if (approval.status !== 'pending') {
    return { approvalStatus: approval.status as 'approved' | 'rejected' | 'expired' };
  }
  if (approval.expiresAt.getTime() < Date.now()) {
    approval.status = 'expired';
    await approval.save();
    return { approvalStatus: 'expired' };
  }

  approval.status = 'approved';
  approval.decidedAt = new Date();
  await approval.save();

  const user = await UserModel.findById(userId);
  const outcome = await executeToolCall(approval.toolName, approval.input, {
    userId,
    conversationId: approval.conversationId?.toString(),
    timezone: user?.timezone ?? 'UTC',
    isApprovedExecution: true,
  });

  return { approvalStatus: 'approved', outcome };
}

export async function rejectApprovalRequest(userId: string, approvalId: string): Promise<void> {
  const approval = await ApprovalRequestModel.findOne({ _id: approvalId, userId });
  if (!approval) {
    throw Object.assign(new Error('Approval request not found'), { statusCode: 404 });
  }
  if (approval.status === 'pending') {
    approval.status = 'rejected';
    approval.decidedAt = new Date();
    await approval.save();
  }
}
