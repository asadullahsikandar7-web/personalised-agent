import { ActivityLogModel, type ActivityLogDoc } from '../../db/models';
import { paginateResult } from '../../utils/pagination';
import type { ActivityLogDTO } from '@personal-agent/shared';

export interface LogActivityInput {
  action: string;
  category: 'agent' | 'tool' | 'auth' | 'system';
  description: string;
  metadata?: Record<string, unknown>;
}

export function toActivityDTO(doc: ActivityLogDoc): ActivityLogDTO {
  return {
    id: doc._id.toString(),
    action: doc.action,
    category: doc.category as ActivityLogDTO['category'],
    description: doc.description,
    metadata: (doc.metadata as Record<string, unknown>) ?? {},
    createdAt: doc.createdAt.toISOString(),
  };
}

/** Fire-and-forget-safe activity logger: never throws, so a logging failure can't break a request. */
export async function logActivity(userId: string, input: LogActivityInput): Promise<void> {
  try {
    await ActivityLogModel.create({ userId, ...input });
  } catch {
    // Activity logging must never break the calling operation.
  }
}

export async function listActivity(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    ActivityLogModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLogModel.countDocuments({ userId }),
  ]);
  return paginateResult(items.map(toActivityDTO), total, page, limit);
}
