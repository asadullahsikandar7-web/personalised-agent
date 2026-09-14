import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateNoteInput, UpdateNoteInput } from '@personal-agent/shared';
import { api } from '../services/api-client';

export interface NoteDTO {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export function useNotes(search?: string) {
  return useQuery({
    queryKey: ['notes', search],
    queryFn: () => api.get<NoteDTO[]>('/api/notes', { search }),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) => api.post<NoteDTO>('/api/notes', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateNoteInput }) => api.patch<NoteDTO>(`/api/notes/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/notes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}
