import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api-client';

export interface UserPreferencesDTO {
  theme: 'system' | 'light' | 'dark';
  voiceEnabled: boolean;
  ttsEnabled: boolean;
  notificationsEnabled: boolean;
  pushToken: string | null;
  defaultReminderChannel: 'push' | 'local' | 'in_app';
}

export function useUserPreferences() {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: () => api.get<UserPreferencesDTO>('/api/users/me/preferences'),
  });
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<UserPreferencesDTO>) => api.patch<UserPreferencesDTO>('/api/users/me/preferences', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-preferences'] }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; timezone?: string }) => api.patch('/api/users/me', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['current-user'] }),
  });
}
