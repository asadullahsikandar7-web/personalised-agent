import { ApprovalRequestModel, type ApprovalRequestDoc } from '../../db/models';
import { paginateResult } from '../../utils/pagination';
import type { ApprovalRequestDTO } from '@personal-agent/shared';

export function toApprovalDTO(doc: ApprovalRequestDoc): ApprovalRequestDTO {
  return {
    id: doc._id.toString(),
    toolName: doc.toolName,
    input: doc.input,
    summary: doc.summary,
    status: doc.status as ApprovalRequestDTO['status'],
    expiresAt: doc.expiresAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listApprovals(userId: string, page: number, limit: number, statusFilter?: string) {
  const filter: Record<string, unknown> = { userId };
  if (statusFilter) filter.status = statusFilter;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    ApprovalRequestModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ApprovalRequestModel.countDocuments(filter),
  ]);
  return paginateResult(items.map(toApprovalDTO), total, page, limit);
}
