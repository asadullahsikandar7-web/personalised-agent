import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { APPROVAL_STATUSES } from '@personal-agent/shared';

const approvalRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', default: null },
    toolName: { type: String, required: true },
    input: { type: Schema.Types.Mixed },
    summary: { type: String, required: true },
    status: { type: String, enum: APPROVAL_STATUSES, default: 'pending', index: true },
    expiresAt: { type: Date, required: true },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type ApprovalRequestDoc = HydratedDocument<InferSchemaType<typeof approvalRequestSchema>>;
export const ApprovalRequestModel = model('ApprovalRequest', approvalRequestSchema);
