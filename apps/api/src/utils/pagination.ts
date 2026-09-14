import type { Paginated } from '@personal-agent/shared';

export function paginateResult<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
