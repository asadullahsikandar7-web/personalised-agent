import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(10000).default(''),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = createNoteSchema.partial();
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
