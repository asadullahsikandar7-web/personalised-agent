import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const userPreferenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    voiceEnabled: { type: Boolean, default: true },
    ttsEnabled: { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true },
    pushToken: { type: String, default: null },
    defaultReminderChannel: { type: String, enum: ['push', 'local', 'in_app'], default: 'local' },
  },
  { timestamps: true },
);

export type UserPreferenceDoc = HydratedDocument<InferSchemaType<typeof userPreferenceSchema>>;
export const UserPreferenceModel = model('UserPreference', userPreferenceSchema);
