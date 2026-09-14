import type { MessageRole } from '../constants/agent';

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessagePreview: string | null;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCallDTO[] | undefined;
  createdAt: string;
}

export interface ToolCallDTO {
  toolName: string;
  input: unknown;
  status: 'pending' | 'awaiting_approval' | 'succeeded' | 'failed' | 'rejected';
  result?: unknown;
  approvalId?: string;
}
