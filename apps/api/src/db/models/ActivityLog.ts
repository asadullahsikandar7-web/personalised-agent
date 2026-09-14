import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const activityLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    category: { type: String, enum: ['agent', 'tool', 'auth', 'system'], required: true, index: true },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
activityLogSchema.index({ userId: 1, createdAt: -1 });

export type ActivityLogDoc = HydratedDocument<InferSchemaType<typeof activityLogSchema>>;
export const ActivityLogModel = model('ActivityLog', activityLogSchema);
