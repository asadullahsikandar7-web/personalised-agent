import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ROBOT_STATUSES } from '@personal-agent/shared';

/**
 * A registered robot. Live telemetry (battery, distance, state) is kept directly on this
 * document rather than a separate time-series collection - only the *latest* reading matters
 * for the app/agent, and a full telemetry history would grow unboundedly for no real use today
 * (see docs/robot-integration.md - "avoid unnecessary database volumes" is an explicit
 * requirement). Significant telemetry-derived moments (e.g. battery low, obstacle detected) are
 * recorded as ActivityLog entries instead, same as every other subsystem.
 */
const robotSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    /** Stable identifier the Pi presents on every connection (distinct from the DB _id so a
     *  robot can be re-paired/re-provisioned without losing its device identity). */
    deviceId: { type: String, required: true, unique: true },
    /** SHA-256 hash of the one-time pairing token shown at registration - never store it raw. */
    pairingTokenHash: { type: String, required: true, select: false },
    status: { type: String, enum: ROBOT_STATUSES, default: 'offline', index: true },
    battery: { type: Number, default: null, min: 0, max: 100 },
    distanceCm: { type: Number, default: null },
    firmwareVersion: { type: String, default: null },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type RobotDoc = HydratedDocument<InferSchemaType<typeof robotSchema>>;
export const RobotModel = model('Robot', robotSchema);
