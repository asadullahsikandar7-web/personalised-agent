import { z } from 'zod';
import { defineTool } from '../types';
import * as notesService from '../../../modules/notes/service';

export const createNoteTool = defineTool({
  name: 'create_note',
  description: 'Create a personal note with a title and body text.',
  inputSchema: z.object({ title: z.string().trim().min(1).max(200), body: z.string().trim().max(10000).optional() }),
  permissionLevel: 'normal',
  async execute(input, context) {
    const note = await notesService.createNote(context.userId, { title: input.title, body: input.body ?? '' });
    return { success: true, message: `Note "${note.title}" created.`, data: notesService.toNoteDTO(note) };
  },
});

export const listNotesTool = defineTool({
  name: 'list_notes',
  description: 'List or search the user\'s notes.',
  inputSchema: z.object({ search: z.string().trim().max(200).optional() }),
  permissionLevel: 'safe',
  async execute(input, context) {
    const notes = await notesService.listNotes(context.userId, input.search);
    return {
      success: true,
      message: notes.length ? `Found ${notes.length} note(s).` : 'No notes found.',
      data: notes.map(notesService.toNoteDTO),
    };
  },
});

export const updateNoteTool = defineTool({
  name: 'update_note',
  description: 'Edit an existing note by id.',
  inputSchema: z.object({ noteId: z.string().min(1), title: z.string().trim().min(1).max(200).optional(), body: z.string().trim().max(10000).optional() }),
  permissionLevel: 'normal',
  async execute(input, context) {
    const note = await notesService.updateNote(context.userId, input.noteId, { title: input.title, body: input.body });
    return { success: true, message: `Note "${note.title}" updated.`, data: notesService.toNoteDTO(note) };
  },
});

export const deleteNoteTool = defineTool({
  name: 'delete_note',
  description: 'Permanently delete a note by id. Requires user approval.',
  inputSchema: z.object({ noteId: z.string().min(1) }),
  permissionLevel: 'approval_required',
  describeAction: (input) => `Delete note ${input.noteId}`,
  async execute(input, context) {
    await notesService.deleteNote(context.userId, input.noteId);
    return { success: true, message: 'Note deleted.' };
  },
});
