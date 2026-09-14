import { getMusicProvider } from './providers/factory';
import { logActivity } from '../activity/service';
import type { MusicResultDTO, PlaybackStateDTO } from '@personal-agent/shared';

function toDTO(state: Awaited<ReturnType<ReturnType<typeof getMusicProvider>['getPlaybackState']>>): PlaybackStateDTO {
  return { ...state, updatedAt: new Date().toISOString() };
}

export async function getMusicState(userId: string): Promise<PlaybackStateDTO> {
  const state = await getMusicProvider().getPlaybackState(userId);
  return toDTO(state);
}

async function runAndLog(userId: string, action: string, fn: () => Promise<{ success: boolean; message: string; state?: unknown }>): Promise<MusicResultDTO> {
  const result = await fn();
  if (result.success) {
    await logActivity(userId, { action: `music.${action}`, category: 'tool', description: result.message });
  }
  return {
    success: result.success,
    message: result.message,
    state: result.state ? toDTO(result.state as never) : undefined,
  };
}

export const musicPlay = (userId: string) => runAndLog(userId, 'play', () => getMusicProvider().play(userId));
export const musicPause = (userId: string) => runAndLog(userId, 'pause', () => getMusicProvider().pause(userId));
export const musicResume = (userId: string) => runAndLog(userId, 'resume', () => getMusicProvider().resume(userId));
export const musicNext = (userId: string) => runAndLog(userId, 'next', () => getMusicProvider().next(userId));
export const musicPrevious = (userId: string) => runAndLog(userId, 'previous', () => getMusicProvider().previous(userId));
export const musicSearch = (userId: string, query: string) => getMusicProvider().search(userId, query);
export const musicPlayTrack = (userId: string, trackId: string) =>
  runAndLog(userId, 'play_track', () => {
    const provider = getMusicProvider();
    if (!provider.playTrack) return Promise.resolve({ success: false, message: 'This provider does not support playing a specific track' });
    return provider.playTrack(userId, trackId);
  });
