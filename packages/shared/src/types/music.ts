import type { MusicProviderName, PlaybackStateName } from '../constants/music';

export interface MusicTrackDTO {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds?: number;
  artworkUrl?: string;
}

export interface PlaybackStateDTO {
  provider: MusicProviderName;
  state: PlaybackStateName;
  currentTrack: MusicTrackDTO | null;
  positionSeconds: number;
  volume: number;
  updatedAt: string;
}

export interface MusicResultDTO {
  success: boolean;
  message: string;
  state?: PlaybackStateDTO;
}
