import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MemoryDTO, Paginated, CreateMemoryInput, UpdateMemoryInput } from '@personal-agent/shared';
import { api } from '../services/api-client';

export function useMemories(params: { search?: string; category?: string; pinned?: boolean } = {}) {
  return useQuery({
    queryKey: ['memories', params],
    queryFn: () =>
      api.get<Paginated<MemoryDTO>>('/api/memories', {
        search: params.search,
        category: params.category,
        pinned: params.pinned,
        limit: 100,
      }),
  });
}

export function useCreateMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMemoryInput) => api.post<MemoryDTO>('/api/memories', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memories'] }),
  });
}

export function useUpdateMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMemoryInput }) =>
      api.patch<MemoryDTO>(`/api/memories/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memories'] }),
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/memories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memories'] }),
  });
}
