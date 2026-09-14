import type { FastifyInstance } from 'fastify';
import { createTaskSchema, updateTaskSchema, listTasksQuerySchema } from '@personal-agent/shared';
import { getUserId } from '../../middleware/current-user';
import { parseOrThrow } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import * as taskService from './service';

export default async function tasksRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req, reply) => {
    const userId = getUserId(req);
    const query = parseOrThrow(listTasksQuerySchema, req.query);
    const result = await taskService.listTasks(userId, query);
    sendSuccess(reply, result);
  });

  app.post('/', async (req, reply) => {
    const userId = getUserId(req);
    const input = parseOrThrow(createTaskSchema, req.body);
    const task = await taskService.createTask(userId, input);
    sendSuccess(reply, taskService.toTaskDTO(task), 201);
  });

  app.patch('/:id', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const input = parseOrThrow(updateTaskSchema, req.body);
    const task = await taskService.updateTask(userId, id, input);
    sendSuccess(reply, taskService.toTaskDTO(task));
  });

  app.post('/:id/complete', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const task = await taskService.completeTask(userId, id);
    sendSuccess(reply, taskService.toTaskDTO(task));
  });

  app.delete('/:id', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    await taskService.deleteTask(userId, id);
    sendSuccess(reply, { deleted: true });
  });
}
