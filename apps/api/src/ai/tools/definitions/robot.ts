import {
  robotIdOnlySchema,
  moveRobotSchema,
  turnRobotSchema,
  setRobotSpeedSchema,
} from '@personal-agent/shared';
import { z } from 'zod';
import { defineTool } from '../types';
import type { ToolResult } from '../types';
import { resolveRobot, listRobots, formatRobotChoices } from '../../../modules/robots/service';
import { sendRobotCommand } from '../../../modules/robots/gateway';
import { AppError } from '../../../utils/errors';

/**
 * Robot control tools. Every one of these goes through the same permission gate as every other
 * agent tool (ai/tool-calling/executor.ts) - the LLM never talks to the robot directly, only
 * through these predefined, schema-validated, permission-classified tools. See
 * docs/robot-integration.md.
 *
 * SAFE: read-only queries, and stopping (stopping is always safe to allow immediately).
 * RESTRICTED: anything that moves the robot.
 * Autonomous behaviors (patrol, follow, navigate) are intentionally not implemented yet - see
 * docs/robot-integration.md "Deferred" section.
 */

/**
 * Both resolveRobotId (no robot / ambiguous robot) and sendRobotCommand (offline / timeout /
 * robot-reported error) throw AppError - the right shape for a route (the global error handler
 * formats it), but the tool executor's catch-all discards a thrown error's message down to a
 * generic "failed unexpectedly". Every tool below goes through this instead, matching how
 * web-search.ts and send-message.ts handle their own provider failures: caught here, returned
 * as a normal ToolResult with an honest message, never thrown out of execute().
 */
async function runRobotTool(
  userId: string,
  explicitRobotId: string | undefined,
  type: Parameters<typeof sendRobotCommand>[2],
  input: Record<string, unknown>,
  fallbackMessage: string,
): Promise<ToolResult> {
  let robotName: string | undefined;
  try {
    const robot = await resolveRobot(userId, explicitRobotId);
    robotName = robot.name;
    const result = await sendRobotCommand(userId, robot.id, type, input);
    const readings = describeReadings(result.data);
    const message = `${robot.name}: ${result.message ?? fallbackMessage}${readings ? ` ${readings}` : ''}`;
    return { success: true, message, data: result.data };
  } catch (err) {
    const reason = err instanceof AppError ? err.message : 'Robot command failed unexpectedly.';
    const message = robotName ? `${robotName}: ${reason}` : reason;
    // An ambiguous robot carries the choices so the agent can ask the user to pick one.
    if (err instanceof AppError && err.code === 'VALIDATION_ERROR' && err.details) {
      return { success: false, message, data: err.details, errorCode: 'ROBOT_SELECTION_REQUIRED' };
    }
    return { success: false, message, errorCode: 'PROVIDER_ERROR' };
  }
}

const UNIT_SUFFIXES: Record<string, string> = { cm: ' cm', mm: ' mm', m: ' m', percent: '%', pct: '%', v: ' V', deg: '°', ms: ' ms' };

/** "status: online, motion enabled: no" from a robot's flat result payload, so the reply carries the actual readings. */
function describeReadings(data: unknown): string {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return '';
  const parts = Object.entries(data)
    .filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => {
      const words = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().split('_');
      // A trailing unit in the key ("distance_cm", "battery_percent") moves onto the value.
      const unit = UNIT_SUFFIXES[words[words.length - 1]!];
      if (unit && words.length > 1) words.pop();
      const text = typeof value === 'boolean' ? (value ? 'yes' : 'no') : value === null ? 'unknown' : `${value}${unit ?? ''}`;
      return `${words.join(' ')}: ${text}`;
    });
  return parts.length > 0 ? `${parts.join(', ')}.` : '';
}

export const listRobotsTool = defineTool({
  name: 'list_robots',
  description:
    "List the user's registered robots with their id, name and online/offline status. Use it to let the user pick a robot when they have more than one.",
  inputSchema: z.object({}),
  permissionLevel: 'safe',
  async execute(_input, context) {
    const robots = await listRobots(context.userId);
    if (robots.length === 0) return { success: true, message: 'No robot is registered yet.', data: [] };
    return {
      success: true,
      message: `Your robots:\n${formatRobotChoices(robots)}`,
      data: robots.map((r) => ({ id: r.id, name: r.name, status: r.status, lastSeenAt: r.lastSeenAt })),
    };
  },
});

export const getRobotStatusTool = defineTool({
  name: 'get_robot_status',
  description: "Get a robot's online/offline status.",
  inputSchema: robotIdOnlySchema,
  permissionLevel: 'safe',
  async execute(input, context) {
    return runRobotTool(context.userId, input.robotId, 'get_status', {}, 'Status retrieved.');
  },
});

export const getRobotBatteryTool = defineTool({
  name: 'get_robot_battery',
  description: "Get a robot's current battery level.",
  inputSchema: robotIdOnlySchema,
  permissionLevel: 'safe',
  async execute(input, context) {
    return runRobotTool(context.userId, input.robotId, 'get_battery', {}, 'Battery level retrieved.');
  },
});

export const getRobotSensorsTool = defineTool({
  name: 'get_robot_sensors',
  description: "Get a robot's current sensor readings (IR, IMU, etc., whatever it reports).",
  inputSchema: robotIdOnlySchema,
  permissionLevel: 'safe',
  async execute(input, context) {
    return runRobotTool(context.userId, input.robotId, 'get_sensors', {}, 'Sensor readings retrieved.');
  },
});

export const getRobotDistanceTool = defineTool({
  name: 'get_robot_distance',
  description: "Get a robot's ultrasonic distance-to-obstacle reading.",
  inputSchema: robotIdOnlySchema,
  permissionLevel: 'safe',
  async execute(input, context) {
    return runRobotTool(context.userId, input.robotId, 'get_distance', {}, 'Distance reading retrieved.');
  },
});

export const moveRobotTool = defineTool({
  name: 'move_robot',
  description: 'Move a robot forward or backward at a given speed for a bounded duration.',
  inputSchema: moveRobotSchema,
  permissionLevel: 'restricted',
  describeAction: (input) => `Move robot ${input.direction} at ${input.speed}% speed for ${input.durationMs}ms`,
  async execute(input, context) {
    return runRobotTool(
      context.userId,
      input.robotId,
      'move',
      { direction: input.direction, speed: input.speed, durationMs: input.durationMs },
      `Moved ${input.direction}.`,
    );
  },
});

export const turnRobotTool = defineTool({
  name: 'turn_robot',
  description: 'Turn a robot left or right for a bounded duration.',
  inputSchema: turnRobotSchema,
  permissionLevel: 'restricted',
  describeAction: (input) => `Turn robot ${input.direction} for ${input.durationMs}ms`,
  async execute(input, context) {
    return runRobotTool(
      context.userId,
      input.robotId,
      'turn',
      { direction: input.direction, durationMs: input.durationMs },
      `Turned ${input.direction}.`,
    );
  },
});

export const stopRobotTool = defineTool({
  name: 'stop_robot',
  description: 'Immediately stop a robot. Always safe to call, including to cancel other motion.',
  inputSchema: robotIdOnlySchema,
  permissionLevel: 'safe',
  async execute(input, context) {
    return runRobotTool(context.userId, input.robotId, 'stop', {}, 'Stopped.');
  },
});

export const setRobotSpeedTool = defineTool({
  name: 'set_robot_speed',
  description: "Set a robot's default movement speed (0-100%) for subsequent move commands.",
  inputSchema: setRobotSpeedSchema,
  permissionLevel: 'restricted',
  describeAction: (input) => `Set robot speed to ${input.speed}%`,
  async execute(input, context) {
    return runRobotTool(context.userId, input.robotId, 'set_speed', { speed: input.speed }, `Speed set to ${input.speed}%.`);
  },
});

export const captureRobotImageTool = defineTool({
  name: 'capture_robot_image',
  description: "Capture a still image from a robot's camera.",
  inputSchema: robotIdOnlySchema,
  permissionLevel: 'safe',
  async execute(input, context) {
    return runRobotTool(context.userId, input.robotId, 'capture_image', {}, 'Image captured.');
  },
});

export const getRobotCameraStatusTool = defineTool({
  name: 'get_robot_camera_status',
  description: "Get a robot's camera connection status.",
  inputSchema: robotIdOnlySchema,
  permissionLevel: 'safe',
  async execute(input, context) {
    return runRobotTool(context.userId, input.robotId, 'get_camera_status', {}, 'Camera status retrieved.');
  },
});
