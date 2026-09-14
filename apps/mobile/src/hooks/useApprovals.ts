import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApprovalRequestDTO, Paginated } from '@personal-agent/shared';
import { api } from '../services/api-client';

export function useApprovals(status?: string) {
  return useQuery({
    queryKey: ['approvals', status],
    queryFn: () => api.get<Paginated<ApprovalRequestDTO>>('/api/agent/approvals', { status, limit: 50 }),
    refetchInterval: 10_000,
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (approvalId: string) => api.post('/api/agent/approve', { approvalId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (approvalId: string) => api.post('/api/agent/reject', { approvalId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals'] }),
  });
}
