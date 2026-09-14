import { MessageModel, type MessageDoc } from '../../db/models';
import { paginateResult } from '../../utils/pagination';
import type { MessageDTO, MessageRole, ToolCallDTO } from '@personal-agent/shared';

export function toMessageDTO(doc: MessageDoc): MessageDTO {
  return {
    id: doc._id.toString(),
    conversationId: doc.conversationId.toString(),
    role: doc.role as MessageRole,
    content: doc.content,
    toolCalls: doc.toolCalls?.length
      ? (doc.toolCalls.map((tc) => ({
          toolName: tc.toolName,
          input: tc.input,
          status: tc.status as ToolCallDTO['status'],
          result: tc.result,
          approvalId: tc.approvalId?.toString(),
        })) as ToolCallDTO[])
      : undefined,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listMessages(conversationId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    MessageModel.find({ conversationId }).sort({ createdAt: 1 }).skip(skip).limit(limit),
    MessageModel.countDocuments({ conversationId }),
  ]);
  return paginateResult(items.map(toMessageDTO), total, page, limit);
}

export async function getRecentMessages(conversationId: string, limit = 20): Promise<MessageDoc[]> {
  const docs = await MessageModel.find({ conversationId }).sort({ createdAt: -1 }).limit(limit);
  return docs.reverse();
}
