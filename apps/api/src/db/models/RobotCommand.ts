import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ROBOT_COMMAND_TYPES, ROBOT_COMMAND_STATUSES } from '@personal-agent/shared';

/**
 * One row per command sent to a robot over the WebSocket gateway - the robot-command analog of
 * ToolExecution. Tracks the pending -> sent -> acked -> completed/failed/timeout lifecycle so a
 * command's outcome can be traced and audited even after the live WS round-trip is done.
 */
const robotCommandSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    robotId: { type: Schema.Types.ObjectId, ref: 'Robot', required: true, index: true },
    type: { type: String, enum: ROBOT_COMMAND_TYPES, required: true },
    input: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ROBOT_COMMAND_STATUSES, default: 'pending', index: true },
    result: { type: Schema.Types.Mixed, default: null },
    errorMessage: { type: String, default: null },
    durationMs: { type: Number, default: null },
  },
  { timestamps: true },
);

export type RobotCommandDoc = HydratedDocument<InferSchemaType<typeof robotCommandSchema>>;
export const RobotCommandModel = model('RobotCommand', robotCommandSchema);
