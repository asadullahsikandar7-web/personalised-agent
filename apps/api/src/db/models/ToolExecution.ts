import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const toolExecutionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', default: null },
    toolName: { type: String, required: true, index: true },
    input: { type: Schema.Types.Mixed },
    permissionLevel: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'awaiting_approval', 'succeeded', 'failed', 'rejected'],
      default: 'pending',
      index: true,
    },
    result: { type: Schema.Types.Mixed },
    errorMessage: { type: String, default: null },
    durationMs: { type: Number, default: null },
    approvalId: { type: Schema.Types.ObjectId, ref: 'ApprovalRequest', default: null },
  },
  { timestamps: true },
);

export type ToolExecutionDoc = HydratedDocument<InferSchemaType<typeof toolExecutionSchema>>;
export const ToolExecutionModel = model('ToolExecution', toolExecutionSchema);
