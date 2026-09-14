import { NoteModel, type NoteDoc } from '../../db/models';
import { AppError } from '../../utils/errors';
import type { CreateNoteInput, UpdateNoteInput } from '@personal-agent/shared';
import { logActivity } from '../activity/service';

export interface NoteDTO {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export function toNoteDTO(doc: NoteDoc): NoteDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    body: doc.body,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function createNote(userId: string, input: CreateNoteInput): Promise<NoteDoc> {
  const doc = await NoteModel.create({ userId, title: input.title, body: input.body ?? '' });
  await logActivity(userId, { action: 'note.created', category: 'tool', description: `Note created: ${input.title}` });
  return doc;
}

export async function listNotes(userId: string, search?: string): Promise<NoteDoc[]> {
  const filter: Record<string, unknown> = { userId, isDeleted: false };
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { body: { $regex: search, $options: 'i' } },
    ];
  }
  return NoteModel.find(filter).sort({ updatedAt: -1 }).limit(100);
}

export async function getNoteOrThrow(userId: string, id: string): Promise<NoteDoc> {
  const doc = await NoteModel.findOne({ _id: id, userId, isDeleted: false });
  if (!doc) throw AppError.notFound('Note not found');
  return doc;
}

export async function updateNote(userId: string, id: string, input: UpdateNoteInput): Promise<NoteDoc> {
  const doc = await getNoteOrThrow(userId, id);
  if (input.title) doc.title = input.title;
  if (typeof input.body === 'string') doc.body = input.body;
  await doc.save();
  return doc;
}

export async function deleteNote(userId: string, id: string): Promise<void> {
  const doc = await getNoteOrThrow(userId, id);
  doc.isDeleted = true;
  await doc.save();
  await logActivity(userId, { action: 'note.deleted', category: 'tool', description: `Note deleted: ${doc.title}` });
}
