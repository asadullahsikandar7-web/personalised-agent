import { ConversationModel, type ConversationDoc } from '../../db/models';
import { AppError } from '../../utils/errors';
import { paginateResult } from '../../utils/pagination';
import type { ConversationSummary } from '@personal-agent/shared';

export function toConversationSummary(doc: ConversationDoc): ConversationSummary {
  return {
    id: doc._id.toString(),
    title: doc.title,
    lastMessagePreview: doc.lastMessagePreview ?? null,
    messageCount: doc.messageCount,
    updatedAt: doc.updatedAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function createConversation(userId: string, title = 'New conversation'): Promise<ConversationDoc> {
  return ConversationModel.create({ userId, title });
}

export async function listConversations(userId: string, page: number, limit: number) {
  const filter = { userId, isDeleted: false };
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    ConversationModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    ConversationModel.countDocuments(filter),
  ]);
  return paginateResult(items.map(toConversationSummary), total, page, limit);
}

export async function getConversationOrThrow(userId: string, id: string): Promise<ConversationDoc> {
  const doc = await ConversationModel.findOne({ _id: id, userId, isDeleted: false });
  if (!doc) throw AppError.notFound('Conversation not found');
  return doc;
}

export async function deleteConversation(userId: string, id: string): Promise<void> {
  const doc = await getConversationOrThrow(userId, id);
  doc.isDeleted = true;
  await doc.save();
}

export async function touchConversation(id: string, preview: string): Promise<void> {
  await ConversationModel.findByIdAndUpdate(id, {
    $set: { lastMessagePreview: preview.slice(0, 160) },
    $inc: { messageCount: 1 },
  });
}

/** Auto-titles a fresh conversation from its first user message (first ~6 words). */
export async function maybeAutoTitle(conversation: ConversationDoc, firstUserMessage: string): Promise<void> {
  if (conversation.title !== 'New conversation') return;
  const words = firstUserMessage.trim().split(/\s+/).slice(0, 6).join(' ');
  conversation.title = words.length > 0 ? words : 'New conversation';
  await conversation.save();
}
