import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getUserId } from '../../middleware/current-user';
import { parseOrThrow } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import { listActivity } from './service';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export default async function activityRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req, reply) => {
    const userId = getUserId(req);
    const { page, limit } = parseOrThrow(listQuerySchema, req.query);
    const result = await listActivity(userId, page, limit);
    sendSuccess(reply, result);
  });
}
