import type { FastifyInstance } from 'fastify';
import { musicCatalogSearchQuerySchema } from '@personal-agent/shared';
import { parseOrThrow } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import { buildCatalogSearchQuery, searchMusicCatalog } from './service';

/**
 * Search-only music catalog endpoints, separate from `/api/music` (which controls one active
 * playback session). See docs/music-search-module.md.
 */
export default async function musicSearchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req, reply) => {
    const input = parseOrThrow(musicCatalogSearchQuerySchema, req.query);
    const queryText = buildCatalogSearchQuery(input);
    const result = await searchMusicCatalog({ queryText, provider: input.provider, limit: input.limit });
    sendSuccess(reply, result);
  });
}
