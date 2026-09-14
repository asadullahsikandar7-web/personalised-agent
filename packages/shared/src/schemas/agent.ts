import { z } from 'zod';

export const agentMessageSchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1).max(4000),
});
export type AgentMessageInput = z.infer<typeof agentMessageSchema>;

export const agentVoiceSchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
  transcript: z.string().trim().min(1).max(4000),
});
export type AgentVoiceInput = z.infer<typeof agentVoiceSchema>;

export const agentApprovalDecisionSchema = z.object({
  approvalId: z.string().trim().min(1),
});
export type AgentApprovalDecisionInput = z.infer<typeof agentApprovalDecisionSchema>;
