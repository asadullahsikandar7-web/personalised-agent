import { useQuery } from '@tanstack/react-query';
import type { MusicSearchResponseDTO, MusicSearchProviderName } from '@personal-agent/shared';
import { api } from '../services/api-client';

export interface MusicCatalogSearchParams {
  query?: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  provider?: MusicSearchProviderName | 'all';
}

function hasAnyField(params: MusicCatalogSearchParams): boolean {
  return Boolean(params.query?.trim() || params.title?.trim() || params.artist?.trim() || params.album?.trim() || params.genre?.trim());
}

/**
 * Search-only lookup across configured catalog providers (YouTube, Jamendo) - metadata only, no
 * playback. Separate from useMusicSearch (in useMusicState.ts), which searches only the single
 * active playback provider's catalog for the Music screen's play-a-track flow.
 */
export function useMusicCatalogSearch(params: MusicCatalogSearchParams) {
  return useQuery({
    queryKey: ['music-catalog-search', params],
    queryFn: () =>
      api.get<MusicSearchResponseDTO>('/api/music-search', {
        query: params.query,
        title: params.title,
        artist: params.artist,
        album: params.album,
        genre: params.genre,
        provider: params.provider,
      }),
    enabled: hasAnyField(params),
  });
}
