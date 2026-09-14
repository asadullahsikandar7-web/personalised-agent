import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const conversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New conversation', trim: true },
    lastMessagePreview: { type: String, default: null },
    messageCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);
conversationSchema.index({ userId: 1, updatedAt: -1 });

export type ConversationDoc = HydratedDocument<InferSchemaType<typeof conversationSchema>>;
export const ConversationModel = model('Conversation', conversationSchema);
