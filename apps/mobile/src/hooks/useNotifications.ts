import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationDTO, Paginated } from '@personal-agent/shared';
import { api } from '../services/api-client';

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => api.get<Paginated<NotificationDTO>>('/api/notifications', { unreadOnly, limit: 50 }),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<NotificationDTO>(`/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
