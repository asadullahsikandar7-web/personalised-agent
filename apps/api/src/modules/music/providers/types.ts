import type { MusicProviderName, PlaybackStateName } from '@personal-agent/shared';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds?: number;
  artworkUrl?: string;
  /** Direct streamable audio URL, when the provider serves one (e.g. Jamendo). Absent for
   *  providers where playback happens through an embedded player instead (e.g. YouTube). */
  streamUrl?: string;
}

export interface PlaybackState {
  provider: MusicProviderName;
  state: PlaybackStateName;
  currentTrack: MusicTrack | null;
  positionSeconds: number;
  volume: number;
}

export interface MusicResult {
  success: boolean;
  message: string;
  state?: PlaybackState;
}

/**
 * Provider abstraction for music control. Real third-party music-app control depends on what
 * the OS and installed apps officially expose - see docs/music-integration.md for exactly what
 * is and is not possible today (Android MediaSession/MediaController requires a native module
 * we have not built yet) and what the documented fallback (opening the app via deep link) is.
 */
export interface MusicProvider {
  getPlaybackState(userId: string): Promise<PlaybackState>;
  play(userId: string): Promise<MusicResult>;
  pause(userId: string): Promise<MusicResult>;
  resume(userId: string): Promise<MusicResult>;
  next(userId: string): Promise<MusicResult>;
  previous(userId: string): Promise<MusicResult>;
  search(userId: string, query: string): Promise<MusicTrack[]>;
  playTrack?(userId: string, trackId: string): Promise<MusicResult>;
  getProviderName(): MusicProviderName;
}
