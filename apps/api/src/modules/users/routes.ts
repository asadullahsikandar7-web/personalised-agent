import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getUserId } from '../../middleware/current-user';
import { parseOrThrow } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import { toPublicUser } from '../auth/service';
import * as usersService from './service';

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
});

const updatePreferencesSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  voiceEnabled: z.boolean().optional(),
  ttsEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  pushToken: z.string().nullable().optional(),
  defaultReminderChannel: z.enum(['push', 'local', 'in_app']).optional(),
});

export default async function usersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.patch('/me', async (req, reply) => {
    const userId = getUserId(req);
    const input = parseOrThrow(updateProfileSchema, req.body);
    const user = await usersService.updateProfile(userId, input);
    sendSuccess(reply, toPublicUser(user));
  });

  app.get('/me/preferences', async (req, reply) => {
    const userId = getUserId(req);
    const prefs = await usersService.getOrCreatePreferences(userId);
    sendSuccess(reply, prefs);
  });

  app.patch('/me/preferences', async (req, reply) => {
    const userId = getUserId(req);
    const input = parseOrThrow(updatePreferencesSchema, req.body);
    const prefs = await usersService.updatePreferences(userId, input);
    sendSuccess(reply, prefs);
  });
}
