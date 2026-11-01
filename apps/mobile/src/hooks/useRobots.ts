import { useQuery } from '@tanstack/react-query';
import type { RobotDTO, RobotRemoteCommandInput, RobotRemoteCommandResultDTO } from '@personal-agent/shared';
import { api } from '../services/api-client';

/** The user's robots. Polls so online/offline and telemetry (distance, battery) stay current. */
export function useRobots(refetchInterval: number | false = false) {
  return useQuery({
    queryKey: ['robots'],
    queryFn: () => api.get<RobotDTO[]>('/api/robots'),
    refetchInterval,
  });
}

/** Sends one remote-control command straight to a robot (no agent, no approval step). */
export function sendRobotRemoteCommand(robotId: string, command: RobotRemoteCommandInput) {
  return api.post<RobotRemoteCommandResultDTO>(`/api/robots/${robotId}/commands`, command);
}
