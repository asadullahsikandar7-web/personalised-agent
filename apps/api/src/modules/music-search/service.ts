import type { MusicCatalogSearchQuery } from '@personal-agent/shared';
import type { MusicSearchResponseDTO, MusicSearchProviderName } from '@personal-agent/shared';
import { YoutubeSearchProvider } from './providers/youtube-search-provider';
import { JamendoSearchProvider } from './providers/jamendo-search-provider';
import { MusicSearchProviderError, type MusicSearchProvider } from './providers/types';

function getAllProviders(): MusicSearchProvider[] {
  return [new YoutubeSearchProvider(), new JamendoSearchProvider()];
}

/** Joins whichever structured fields were given into one free-text query string per provider. */
export function buildCatalogSearchQuery(input: {
  query?: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
}): string {
  if (input.query) return input.query;
  return [input.title, input.artist, input.album, input.genre].filter(Boolean).join(' ');
}

export async function searchMusicCatalog(
  input: Pick<MusicCatalogSearchQuery, 'provider' | 'limit'> & { queryText: string },
): Promise<MusicSearchResponseDTO> {
  const allProviders = getAllProviders();
  const targets = input.provider === 'all' ? allProviders : allProviders.filter((p) => p.getProviderName() === input.provider);

  const providersQueried: MusicSearchProviderName[] = [];
  const providersFailed: MusicSearchResponseDTO['providersFailed'] = [];

  const resultsPerProvider = await Promise.all(
    targets.map(async (provider) => {
      if (!provider.isConfigured()) {
        providersFailed.push({
          provider: provider.getProviderName(),
          reason: 'NOT_CONFIGURED',
          message: `${provider.getProviderName()} is not configured on this server.`,
        });
        return [];
      }
      providersQueried.push(provider.getProviderName());
      try {
        return await provider.search(input.queryText, input.limit);
      } catch (err) {
        if (err instanceof MusicSearchProviderError) {
          providersFailed.push({ provider: err.provider, reason: err.code, message: err.message });
        } else {
          providersFailed.push({
            provider: provider.getProviderName(),
            reason: 'PROVIDER_ERROR',
            message: 'Unexpected error while searching.',
          });
        }
        return [];
      }
    }),
  );

  return {
    results: resultsPerProvider.flat(),
    providersQueried,
    providersFailed,
  };
}
