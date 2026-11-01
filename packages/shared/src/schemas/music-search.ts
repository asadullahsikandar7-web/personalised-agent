import { z } from 'zod';
import { MUSIC_SEARCH_PROVIDERS } from '../constants/music-search';

/**
 * At least one of query/title/artist/album/genre is required; whichever are given are joined
 * into a single free-text query per provider (see buildCatalogSearchQuery on the API side).
 */
export const musicCatalogSearchQuerySchema = z
  .object({
    query: z.string().trim().min(1).max(200).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    artist: z.string().trim().min(1).max(200).optional(),
    album: z.string().trim().min(1).max(200).optional(),
    genre: z.string().trim().min(1).max(100).optional(),
    provider: z.enum([...MUSIC_SEARCH_PROVIDERS, 'all']).default('all'),
    limit: z.coerce.number().int().min(1).max(25).default(10),
  })
  .refine((data) => Boolean(data.query || data.title || data.artist || data.album || data.genre), {
    message: 'At least one of query, title, artist, album, or genre is required',
  });

export type MusicCatalogSearchQuery = z.infer<typeof musicCatalogSearchQuerySchema>;
