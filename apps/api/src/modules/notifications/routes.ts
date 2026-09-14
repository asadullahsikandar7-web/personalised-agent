import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getUserId } from '../../middleware/current-user';
import { parseOrThrow } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import * as notificationsService from './service';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
});

export default async function notificationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req, reply) => {
    const userId = getUserId(req);
    const { page, limit, unreadOnly } = parseOrThrow(listQuerySchema, req.query);
    const result = await notificationsService.listNotifications(userId, page, limit, unreadOnly);
    sendSuccess(reply, result);
  });

  app.patch('/:id/read', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const notification = await notificationsService.markNotificationRead(userId, id);
    sendSuccess(reply, notificationsService.toNotificationDTO(notification));
  });
}
