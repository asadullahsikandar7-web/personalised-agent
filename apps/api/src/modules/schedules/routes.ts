import type { FastifyInstance } from 'fastify';
import {
  createReminderSchema,
  updateReminderSchema,
  listRemindersQuerySchema,
  snoozeReminderSchema,
} from '@personal-agent/shared';
import { getUserId } from '../../middleware/current-user';
import { parseOrThrow } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import * as reminderService from './service';

export default async function schedulesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req, reply) => {
    const userId = getUserId(req);
    const query = parseOrThrow(listRemindersQuerySchema, req.query);
    const result = await reminderService.listReminders(userId, query);
    sendSuccess(reply, result);
  });

  app.post('/', async (req, reply) => {
    const userId = getUserId(req);
    const input = parseOrThrow(createReminderSchema, req.body);
    const reminder = await reminderService.createReminder(userId, input);
    sendSuccess(reply, reminderService.toReminderDTO(reminder), 201);
  });

  app.patch('/:id', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const input = parseOrThrow(updateReminderSchema, req.body);
    const reminder = await reminderService.updateReminder(userId, id, input);
    sendSuccess(reply, reminderService.toReminderDTO(reminder));
  });

  app.delete('/:id', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const reminder = await reminderService.cancelReminder(userId, id);
    sendSuccess(reply, reminderService.toReminderDTO(reminder));
  });

  app.post('/:id/snooze', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const input = parseOrThrow(snoozeReminderSchema, req.body ?? {});
    const reminder = await reminderService.snoozeReminder(userId, id, input.minutes);
    sendSuccess(reply, reminderService.toReminderDTO(reminder));
  });

  app.post('/:id/complete', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const reminder = await reminderService.markReminderComplete(userId, id);
    sendSuccess(reply, reminderService.toReminderDTO(reminder));
  });
}
