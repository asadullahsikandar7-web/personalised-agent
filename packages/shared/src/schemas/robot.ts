import { z } from 'zod';
import { ROBOT_MOVE_DIRECTIONS, ROBOT_TURN_DIRECTIONS, ROBOT_SAFETY_LIMITS } from '../constants/robot';

export const registerRobotSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
export type RegisterRobotInput = z.infer<typeof registerRobotSchema>;

/**
 * Every robot tool/command targets one robot - explicitly when a user owns more than one, but
 * optional otherwise so a plain voice command like "move forward" doesn't require naming a
 * robot. The API resolves an omitted robotId to the user's only robot, or fails honestly if
 * there are zero or several (see resolveRobotId in modules/robots/service.ts).
 */
const robotIdField = z.string().trim().min(1).optional();

export const robotIdOnlySchema = z.object({
  robotId: robotIdField,
});
export type RobotIdOnlyInput = z.infer<typeof robotIdOnlySchema>;

export const moveRobotSchema = z.object({
  robotId: robotIdField,
  direction: z.enum(ROBOT_MOVE_DIRECTIONS),
  speed: z.number().int().min(ROBOT_SAFETY_LIMITS.MIN_SPEED_PERCENT).max(ROBOT_SAFETY_LIMITS.MAX_SPEED_PERCENT).default(40),
  durationMs: z.number().int().min(1).max(ROBOT_SAFETY_LIMITS.MAX_COMMAND_DURATION_MS).default(1000),
});
export type MoveRobotInput = z.infer<typeof moveRobotSchema>;

export const turnRobotSchema = z.object({
  robotId: robotIdField,
  direction: z.enum(ROBOT_TURN_DIRECTIONS),
  durationMs: z.number().int().min(1).max(ROBOT_SAFETY_LIMITS.MAX_COMMAND_DURATION_MS).default(500),
});
export type TurnRobotInput = z.infer<typeof turnRobotSchema>;

export const setRobotSpeedSchema = z.object({
  robotId: robotIdField,
  speed: z.number().int().min(ROBOT_SAFETY_LIMITS.MIN_SPEED_PERCENT).max(ROBOT_SAFETY_LIMITS.MAX_SPEED_PERCENT),
});
export type SetRobotSpeedInput = z.infer<typeof setRobotSpeedSchema>;

/**
 * A command sent straight from the app's remote-control screen (POST /api/robots/:id/commands).
 * Same bounds as the agent tools, but no approval step: each one is an explicit button press by
 * the robot's owner rather than something an LLM decided to do. Short default durations keep the
 * robot from driving on if the app loses its connection mid-drive.
 */
export const robotRemoteCommandSchema = z.discriminatedUnion('command', [
  moveRobotSchema.omit({ robotId: true }).extend({ command: z.literal('move') }),
  turnRobotSchema.omit({ robotId: true }).extend({ command: z.literal('turn') }),
  setRobotSpeedSchema.omit({ robotId: true }).extend({ command: z.literal('set_speed') }),
  z.object({ command: z.enum(['stop', 'get_status', 'get_distance', 'get_sensors', 'get_battery']) }),
]);
export type RobotRemoteCommandInput = z.infer<typeof robotRemoteCommandSchema>;
