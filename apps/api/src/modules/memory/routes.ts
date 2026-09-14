import type { FastifyInstance } from 'fastify';
import { createMemorySchema, updateMemorySchema, listMemoriesQuerySchema } from '@personal-agent/shared';
import { getUserId } from '../../middleware/current-user';
import { parseOrThrow } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import * as memoryService from './service';

export default async function memoryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req, reply) => {
    const userId = getUserId(req);
    const query = parseOrThrow(listMemoriesQuerySchema, req.query);
    const result = await memoryService.listMemories(userId, query);
    sendSuccess(reply, result);
  });

  app.post('/', async (req, reply) => {
    const userId = getUserId(req);
    const input = parseOrThrow(createMemorySchema, req.body);
    const memory = await memoryService.createMemory(userId, input, 'user');
    sendSuccess(reply, memoryService.toMemoryDTO(memory), 201);
  });

  app.patch('/:id', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const input = parseOrThrow(updateMemorySchema, req.body);
    const memory = await memoryService.updateMemory(userId, id, input);
    sendSuccess(reply, memoryService.toMemoryDTO(memory));
  });

  app.delete('/:id', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    await memoryService.deleteMemory(userId, id);
    sendSuccess(reply, { deleted: true });
  });
}
