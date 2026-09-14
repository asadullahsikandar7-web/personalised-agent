import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createNoteSchema, updateNoteSchema } from '@personal-agent/shared';
import { getUserId } from '../../middleware/current-user';
import { parseOrThrow } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import * as notesService from './service';

const listQuerySchema = z.object({ search: z.string().trim().max(200).optional() });

export default async function notesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req, reply) => {
    const userId = getUserId(req);
    const { search } = parseOrThrow(listQuerySchema, req.query);
    const notes = await notesService.listNotes(userId, search);
    sendSuccess(reply, notes.map(notesService.toNoteDTO));
  });

  app.post('/', async (req, reply) => {
    const userId = getUserId(req);
    const input = parseOrThrow(createNoteSchema, req.body);
    const note = await notesService.createNote(userId, input);
    sendSuccess(reply, notesService.toNoteDTO(note), 201);
  });

  app.patch('/:id', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const input = parseOrThrow(updateNoteSchema, req.body);
    const note = await notesService.updateNote(userId, id, input);
    sendSuccess(reply, notesService.toNoteDTO(note));
  });

  app.delete('/:id', async (req, reply) => {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    await notesService.deleteNote(userId, id);
    sendSuccess(reply, { deleted: true });
  });
}
