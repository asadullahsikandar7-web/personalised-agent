import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MessageDTO } from '@personal-agent/shared';
import { api } from '../services/api-client';

export interface AgentReplyResult {
  conversationId: string;
  userMessage: MessageDTO;
  assistantMessage: MessageDTO;
  pendingApprovalIds: string[];
}

export function useSendAgentMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { message: string; conversationId?: string; source?: 'text' | 'voice' }) =>
      api.post<AgentReplyResult>(input.source === 'voice' ? '/api/agent/voice' : '/api/agent/message', {
        conversationId: input.conversationId,
        [input.source === 'voice' ? 'transcript' : 'message']: input.message,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}
