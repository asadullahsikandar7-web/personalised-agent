import { useQuery } from '@tanstack/react-query';
import type { ActivityLogDTO, Paginated } from '@personal-agent/shared';
import { api } from '../services/api-client';

export function useActivity(page = 1, limit = 30) {
  return useQuery({
    queryKey: ['activity', page, limit],
    queryFn: () => api.get<Paginated<ActivityLogDTO>>('/api/activity', { page, limit }),
  });
}
