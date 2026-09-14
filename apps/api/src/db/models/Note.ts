import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const noteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);
noteSchema.index({ userId: 1, title: 'text', body: 'text' });

export type NoteDoc = HydratedDocument<InferSchemaType<typeof noteSchema>>;
export const NoteModel = model('Note', noteSchema);
