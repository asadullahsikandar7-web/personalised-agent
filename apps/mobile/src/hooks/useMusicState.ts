import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlaybackStateDTO, MusicResultDTO, MusicTrackDTO } from '@personal-agent/shared';
import { api } from '../services/api-client';

export function useMusicState() {
  return useQuery({
    queryKey: ['music-state'],
    queryFn: () => api.get<PlaybackStateDTO>('/api/music/state'),
    refetchInterval: 15_000,
  });
}

function useMusicAction(path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<MusicResultDTO>(path),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['music-state'] }),
  });
}

export const useMusicPlay = () => useMusicAction('/api/music/play');
export const useMusicPause = () => useMusicAction('/api/music/pause');
export const useMusicResume = () => useMusicAction('/api/music/resume');
export const useMusicNext = () => useMusicAction('/api/music/next');
export const useMusicPrevious = () => useMusicAction('/api/music/previous');

export function useMusicSearch(query: string) {
  return useQuery({
    queryKey: ['music-search', query],
    queryFn: () => api.get<MusicTrackDTO[]>('/api/music/search', { query }),
    enabled: query.trim().length > 0,
  });
}

export function usePlayTrack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trackId: string) => api.post<MusicResultDTO>('/api/music/play-track', { trackId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['music-state'] }),
  });
}
