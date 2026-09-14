import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    deviceInfo: { type: String, default: 'unknown' },
    ipAddress: { type: String },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    revokedAt: { type: Date, default: null },
    replacedByTokenHash: { type: String, default: null },
  },
  { timestamps: true },
);

export type RefreshTokenDoc = HydratedDocument<InferSchemaType<typeof refreshTokenSchema>>;
export const RefreshTokenModel = model('RefreshToken', refreshTokenSchema);
