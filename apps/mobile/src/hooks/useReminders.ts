import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReminderDTO, Paginated, CreateReminderInput, UpdateReminderInput } from '@personal-agent/shared';
import { api } from '../services/api-client';

export function useReminders(params: { status?: string } = {}) {
  return useQuery({
    queryKey: ['reminders', params],
    queryFn: () => api.get<Paginated<ReminderDTO>>('/api/reminders', { ...params, limit: 100 }),
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReminderInput) => api.post<ReminderDTO>('/api/reminders', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateReminderInput }) =>
      api.patch<ReminderDTO>(`/api/reminders/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useCancelReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<ReminderDTO>(`/api/reminders/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useSnoozeReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
      api.post<ReminderDTO>(`/api/reminders/${id}/snooze`, { minutes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ReminderDTO>(`/api/reminders/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}
