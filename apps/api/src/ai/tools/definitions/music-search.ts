import { z } from 'zod';
import { defineTool } from '../types';
import { buildCatalogSearchQuery, searchMusicCatalog } from '../../../modules/music-search/service';

const inputSchema = z
  .object({
    query: z.string().trim().min(1).max(200).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    artist: z.string().trim().min(1).max(200).optional(),
    album: z.string().trim().min(1).max(200).optional(),
    genre: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => Boolean(data.query || data.title || data.artist || data.album || data.genre), {
    message: 'At least one of query, title, artist, album, or genre is required',
  });

/**
 * Search-only lookup across configured music catalogs (currently YouTube + Jamendo). Distinct
 * from music_play/music_pause/etc, which control one active playback session - this tool never
 * starts playback, it only returns normalized metadata for the agent to describe or for the
 * client to show as a results list. See docs/music-search-module.md.
 */
export const searchMusicCatalogTool = defineTool({
  name: 'search_music_catalog',
  description:
    'Search for songs by title, artist, album, or genre across configured music catalogs (YouTube, Jamendo). Returns metadata only (title, artist, album, artwork, duration, provider, source link) - does not play anything.',
  inputSchema,
  permissionLevel: 'safe',
  async execute(input) {
    const queryText = buildCatalogSearchQuery(input);
    const result = await searchMusicCatalog({ queryText, provider: 'all', limit: 10 });
    const providerNote = result.providersFailed.length
      ? ` (${result.providersFailed.map((f) => `${f.provider}: ${f.message}`).join('; ')})`
      : '';
    return {
      success: true,
      message: `Found ${result.results.length} track(s) across ${result.providersQueried.join(', ') || 'no configured'} provider(s).${providerNote}`,
      data: result,
    };
  },
});
