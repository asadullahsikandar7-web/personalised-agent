import type { FastifyInstance } from 'fastify';
import { musicSearchQuerySchema, playTrackSchema } from '@personal-agent/shared';
import { getUserId } from '../../middleware/current-user';
import { parseOrThrow } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import * as musicService from './service';

export default async function musicRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/state', async (req, reply) => {
    const state = await musicService.getMusicState(getUserId(req));
    sendSuccess(reply, state);
  });

  app.post('/play', async (req, reply) => {
    sendSuccess(reply, await musicService.musicPlay(getUserId(req)));
  });

  app.post('/pause', async (req, reply) => {
    sendSuccess(reply, await musicService.musicPause(getUserId(req)));
  });

  app.post('/resume', async (req, reply) => {
    sendSuccess(reply, await musicService.musicResume(getUserId(req)));
  });

  app.post('/next', async (req, reply) => {
    sendSuccess(reply, await musicService.musicNext(getUserId(req)));
  });

  app.post('/previous', async (req, reply) => {
    sendSuccess(reply, await musicService.musicPrevious(getUserId(req)));
  });

  app.post('/play-track', async (req, reply) => {
    const input = parseOrThrow(playTrackSchema, req.body);
    sendSuccess(reply, await musicService.musicPlayTrack(getUserId(req), input.trackId));
  });

  app.get('/search', async (req, reply) => {
    const query = parseOrThrow(musicSearchQuerySchema, req.query);
    const tracks = await musicService.musicSearch(getUserId(req), query.query);
    sendSuccess(reply, tracks);
  });
}
