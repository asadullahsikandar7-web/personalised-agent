import { useQuery } from '@tanstack/react-query';
import type { ToolDescriptor } from '@personal-agent/shared';
import { api } from '../services/api-client';

export function useTools() {
  return useQuery({
    queryKey: ['tools'],
    queryFn: () => api.get<ToolDescriptor[]>('/api/tools'),
    staleTime: 5 * 60_000,
  });
}
