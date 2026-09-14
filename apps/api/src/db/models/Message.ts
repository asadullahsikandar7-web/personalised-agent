import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const toolCallSchema = new Schema(
  {
    toolName: { type: String, required: true },
    input: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'awaiting_approval', 'succeeded', 'failed', 'rejected'],
      default: 'pending',
    },
    result: { type: Schema.Types.Mixed },
    approvalId: { type: Schema.Types.ObjectId, ref: 'ApprovalRequest' },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
    content: { type: String, required: true },
    toolCalls: { type: [toolCallSchema], default: [] },
  },
  { timestamps: true },
);
messageSchema.index({ conversationId: 1, createdAt: 1 });

export type MessageDoc = HydratedDocument<InferSchemaType<typeof messageSchema>>;
export const MessageModel = model('Message', messageSchema);
