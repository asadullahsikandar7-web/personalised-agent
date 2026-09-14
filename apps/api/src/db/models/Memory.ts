import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { MEMORY_CATEGORIES } from '@personal-agent/shared';

const memorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, enum: MEMORY_CATEGORIES, required: true },
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    source: { type: String, enum: ['user', 'agent'], default: 'agent' },
    confidence: { type: Number, min: 0, max: 1, default: 1 },
    isPinned: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);
memorySchema.index({ userId: 1, category: 1 });
memorySchema.index({ userId: 1, key: 'text', value: 'text' });

export type MemoryDoc = HydratedDocument<InferSchemaType<typeof memorySchema>>;
export const MemoryModel = model('Memory', memorySchema);
