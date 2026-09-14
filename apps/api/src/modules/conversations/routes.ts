import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getUserId } from '../../middleware/current-user';
import { parseOrThrow } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import * as conversationService from './service';
import * as messageService from '../messages/service';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export default async function conversationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req, reply) => {
    const userId = getUserId(req);
    const { page, limit } = parseOrThrow(listQuerySchema, req.query);
    const result = await conversationService.listConversations(userId, page, limit);
    sendSuccess(reply, result);
  });

  app.post('/', async (req, reply) => {
    const userId = getUserId(req);
    const input = parseOrThrow(createConversationSchema, req.body ?? {});
    const conversation = await conversationService.createConversation(userId, input.title);
    sendSuccess(reply, conversationService.toConversationSummary(conversation), 201);
  });

  app.get('/:id', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const conversation = await conversationService.getConversationOrThrow(userId, id);
    sendSuccess(reply, conversationService.toConversationSummary(conversation));
  });

  app.get('/:id/messages', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    await conversationService.getConversationOrThrow(userId, id);
    const { page, limit } = parseOrThrow(listQuerySchema, req.query);
    const result = await messageService.listMessages(id, page, limit);
    sendSuccess(reply, result);
  });

  app.delete('/:id', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    await conversationService.deleteConversation(userId, id);
    sendSuccess(reply, { deleted: true });
  });
}
