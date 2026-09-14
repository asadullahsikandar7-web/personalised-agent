import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { TASK_PRIORITIES, TASK_STATUSES } from '@personal-agent/shared';

const taskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'medium' },
    status: { type: String, enum: TASK_STATUSES, default: 'pending', index: true },
    dueDate: { type: Date, default: null },
    tags: { type: [String], default: [] },
    completedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);
taskSchema.index({ userId: 1, status: 1, dueDate: 1 });

export type TaskDoc = HydratedDocument<InferSchemaType<typeof taskSchema>>;
export const TaskModel = model('Task', taskSchema);
