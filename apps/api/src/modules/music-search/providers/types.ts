import type { MusicSearchProviderName, NormalizedTrackDTO } from '@personal-agent/shared';

export class MusicSearchProviderError extends Error {
  constructor(
    public readonly provider: MusicSearchProviderName,
    public readonly code: 'RATE_LIMITED' | 'PROVIDER_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'MusicSearchProviderError';
  }
}

/**
 * Search-only provider abstraction, deliberately separate from `modules/music`'s
 * `MusicProvider` (which is about controlling one active playback session). This one is about
 * finding tracks across as many catalogs as are configured, normalizing metadata, and nothing
 * else - no play/pause/queue state, no direct stream URLs. See docs/music-search-module.md.
 */
export interface MusicSearchProvider {
  getProviderName(): MusicSearchProviderName;
  /** Whether this provider's required API key/credential is present. */
  isConfigured(): boolean;
  /** Throws MusicSearchProviderError on failure; never returns a fabricated result on error. */
  search(query: string, limit: number): Promise<NormalizedTrackDTO[]>;
}
