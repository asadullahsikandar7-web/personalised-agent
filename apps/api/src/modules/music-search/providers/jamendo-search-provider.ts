import { env } from '../../../config/env';
import type { NormalizedTrackDTO } from '@personal-agent/shared';
import { MusicSearchProviderError, type MusicSearchProvider } from './types';

const JAMENDO_API_BASE = 'https://api.jamendo.com/v3.0';

interface JamendoTrack {
  id: string;
  name: string;
  artist_name: string;
  album_name?: string;
  duration?: number;
  image?: string;
  shareurl?: string;
}

/**
 * Real search against the official Jamendo API v3.0 - metadata only. `sourceUrl` is the
 * track's canonical jamendo.com page (`shareurl`), not the direct audio file, so this stays
 * search-only per this module's "no playback yet" scope. See docs/music-search-module.md and
 * modules/music/providers/jamendo-music-provider.ts for the (separate) provider that actually
 * streams Jamendo audio.
 */
export class JamendoSearchProvider implements MusicSearchProvider {
  getProviderName(): 'jamendo' {
    return 'jamendo';
  }

  isConfigured(): boolean {
    return Boolean(env.JAMENDO_CLIENT_ID);
  }

  async search(query: string, limit: number): Promise<NormalizedTrackDTO[]> {
    try {
      const url = new URL(`${JAMENDO_API_BASE}/tracks/`);
      url.searchParams.set('client_id', env.JAMENDO_CLIENT_ID);
      url.searchParams.set('format', 'json');
      url.searchParams.set('search', query);
      url.searchParams.set('limit', String(limit));

      const res = await fetch(url);
      if (!res.ok) {
        const err = new Error(`Jamendo API returned ${res.status}`) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }
      const json = (await res.json()) as { results?: JamendoTrack[] };
      const tracks = json.results ?? [];

      return tracks.map((track) => ({
        title: track.name,
        artist: track.artist_name,
        album: track.album_name || null,
        artwork: track.image || null,
        durationSeconds: track.duration ?? null,
        provider: 'jamendo' as const,
        providerTrackId: track.id,
        sourceUrl: track.shareurl || `https://www.jamendo.com/track/${track.id}`,
      }));
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 429) {
        throw new MusicSearchProviderError('jamendo', 'RATE_LIMITED', 'Jamendo search is temporarily rate-limited.');
      }
      throw new MusicSearchProviderError('jamendo', 'PROVIDER_ERROR', 'Jamendo search failed.');
    }
  }
}
