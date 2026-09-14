import { useQuery } from '@tanstack/react-query';
import type { ConversationSummary, Paginated } from '@personal-agent/shared';
import { api } from '../services/api-client';

export function useConversations(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['conversations', page, limit],
    queryFn: () => api.get<Paginated<ConversationSummary>>('/api/conversations', { page, limit }),
  });
}
