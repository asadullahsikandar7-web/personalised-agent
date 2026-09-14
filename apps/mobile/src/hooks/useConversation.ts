import { useQuery } from '@tanstack/react-query';
import type { ConversationSummary, MessageDTO, Paginated } from '@personal-agent/shared';
import { api } from '../services/api-client';

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.get<ConversationSummary>(`/api/conversations/${conversationId}`),
    enabled: !!conversationId,
  });
}

export function useConversationMessages(conversationId: string | undefined, page = 1, limit = 50) {
  return useQuery({
    queryKey: ['conversation-messages', conversationId, page, limit],
    queryFn: () => api.get<Paginated<MessageDTO>>(`/api/conversations/${conversationId}/messages`, { page, limit }),
    enabled: !!conversationId,
  });
}
