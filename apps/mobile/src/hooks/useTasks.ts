import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TaskDTO, Paginated, CreateTaskInput, UpdateTaskInput } from '@personal-agent/shared';
import { api } from '../services/api-client';

export function useTasks(params: { status?: string; priority?: string } = {}) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => api.get<Paginated<TaskDTO>>('/api/tasks', { ...params, limit: 100 }),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.post<TaskDTO>('/api/tasks', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => api.patch<TaskDTO>(`/api/tasks/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<TaskDTO>(`/api/tasks/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
