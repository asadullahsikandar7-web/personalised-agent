import type { MusicSearchProviderName } from '../constants/music-search';

/**
 * A single search result normalized to a common shape across every catalog-search provider
 * (YouTube, Jamendo, ...). Deliberately excludes anything playback-capable (no direct stream
 * URL) - `sourceUrl` is always the provider's own canonical webpage for the track, safe to show
 * or open, not a media file. See docs/music-search-module.md.
 */
export interface NormalizedTrackDTO {
  title: string;
  artist: string;
  album: string | null;
  artwork: string | null;
  durationSeconds: number | null;
  provider: MusicSearchProviderName;
  providerTrackId: string;
  sourceUrl: string;
}

export interface ProviderFailureDTO {
  provider: MusicSearchProviderName;
  reason: 'NOT_CONFIGURED' | 'RATE_LIMITED' | 'PROVIDER_ERROR';
  message: string;
}

export interface MusicSearchResponseDTO {
  results: NormalizedTrackDTO[];
  providersQueried: MusicSearchProviderName[];
  providersFailed: ProviderFailureDTO[];
}
