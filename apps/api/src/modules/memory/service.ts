import { MemoryModel, type MemoryDoc } from '../../db/models';
import { AppError } from '../../utils/errors';
import { paginateResult } from '../../utils/pagination';
import type {
  CreateMemoryInput,
  UpdateMemoryInput,
  ListMemoriesQuery,
  MemoryDTO,
} from '@personal-agent/shared';
import { logActivity } from '../activity/service';

/** Fields we refuse to persist even if a caller (agent or user) tries to save them as a memory. */
const SENSITIVE_PATTERNS = [
  /password/i,
  /api[_\s-]?key/i,
  /secret/i,
  /credit\s?card/i,
  /\bcvv\b/i,
  /\bssn\b/i,
  /private\s?key/i,
];

export function containsSensitiveContent(text: string): boolean {
  return SENSITIVE_PATTERNS.some((re) => re.test(text));
}

export function toMemoryDTO(doc: MemoryDoc): MemoryDTO {
  return {
    id: doc._id.toString(),
    category: doc.category as MemoryDTO['category'],
    key: doc.key,
    value: doc.value,
    source: doc.source as MemoryDTO['source'],
    confidence: doc.confidence,
    isPinned: doc.isPinned,
    expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function createMemory(
  userId: string,
  input: CreateMemoryInput,
  source: 'user' | 'agent' = 'user',
): Promise<MemoryDoc> {
  if (containsSensitiveContent(`${input.key} ${input.value}`)) {
    throw AppError.validation(
      'This looks like a password, API key, or other sensitive credential. Personal Agent does not store credentials in memory.',
    );
  }
  const doc = await MemoryModel.create({
    userId,
    category: input.category,
    key: input.key,
    value: input.value,
    source,
    isPinned: input.isPinned ?? false,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
  });
  await logActivity(userId, {
    action: 'memory.created',
    category: 'tool',
    description: `Remembered: ${input.key}`,
  });
  return doc;
}

export async function listMemories(userId: string, query: ListMemoriesQuery) {
  const filter: Record<string, unknown> = { userId };
  if (query.category) filter.category = query.category;
  if (typeof query.pinned === 'boolean') filter.isPinned = query.pinned;
  if (query.search) {
    filter.$or = [
      { key: { $regex: query.search, $options: 'i' } },
      { value: { $regex: query.search, $options: 'i' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    MemoryModel.find(filter).sort({ isPinned: -1, updatedAt: -1 }).skip(skip).limit(query.limit),
    MemoryModel.countDocuments(filter),
  ]);
  return paginateResult(items.map(toMemoryDTO), total, query.page, query.limit);
}

export async function getMemoryOrThrow(userId: string, id: string): Promise<MemoryDoc> {
  const doc = await MemoryModel.findOne({ _id: id, userId });
  if (!doc) throw AppError.notFound('Memory not found');
  return doc;
}

export async function updateMemory(
  userId: string,
  id: string,
  input: UpdateMemoryInput,
): Promise<MemoryDoc> {
  const doc = await getMemoryOrThrow(userId, id);
  if (input.category) doc.category = input.category;
  if (input.key) doc.key = input.key;
  if (input.value) doc.value = input.value;
  if (typeof input.isPinned === 'boolean') doc.isPinned = input.isPinned;
  if (input.expiresAt) doc.expiresAt = new Date(input.expiresAt);
  await doc.save();
  return doc;
}

export async function deleteMemory(userId: string, id: string): Promise<void> {
  const doc = await getMemoryOrThrow(userId, id);
  await doc.deleteOne();
  await logActivity(userId, {
    action: 'memory.deleted',
    category: 'tool',
    description: `Forgot: ${doc.key}`,
  });
}
