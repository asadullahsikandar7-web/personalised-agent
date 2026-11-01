import type WebSocket from 'ws';
import { RobotCommandModel, RobotModel } from '../../db/models';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { logActivity } from '../activity/service';
import { ROBOT_SAFETY_LIMITS, type RobotCommandType } from '@personal-agent/shared';

/**
 * Wire protocol between this gateway and a Raspberry Pi robot-agent, over one WebSocket per
 * robot. See docs/robot-integration.md for the full spec - this extends the sketch from the
 * original design doc with an explicit `result` envelope for query-style commands
 * (get_status/get_battery/...), which the sketch didn't cover.
 *
 *   -> {"type":"command","id":"<uuid>","command":"move","direction":"forward","speed":40,"durationMs":1000}
 *   <- {"type":"ack","command_id":"<uuid>","status":"accepted"}
 *   <- {"type":"result","command_id":"<uuid>","status":"ok"|"error","data"?:{...},"message"?:"..."}
 *   <- {"type":"telemetry","battery":82,"distance_cm":65,"state":"idle"}   // unsolicited, periodic
 *   <- {"type":"error","command_id":"<uuid>","code":"OBSTACLE_DETECTED","message":"..."}
 */

interface PendingCommand {
  resolve: (value: { data?: unknown; message?: string }) => void;
  reject: (err: Error) => void;
  timeout: NodeJS.Timeout;
}

const connections = new Map<string, WebSocket>();
const pending = new Map<string, PendingCommand>();

export function isRobotConnected(robotId: string): boolean {
  return connections.has(robotId);
}

export async function registerRobotConnection(robotId: string, socket: WebSocket): Promise<void> {
  connections.set(robotId, socket);
  await RobotModel.findByIdAndUpdate(robotId, { status: 'online', lastSeenAt: new Date() });
  const robot = await RobotModel.findById(robotId);
  if (robot) {
    await logActivity(robot.userId.toString(), {
      action: 'robot.connected',
      category: 'system',
      description: `Robot "${robot.name}" connected`,
      metadata: { robotId },
    });
  }
}

export async function removeRobotConnection(robotId: string): Promise<void> {
  connections.delete(robotId);
  const robot = await RobotModel.findByIdAndUpdate(robotId, { status: 'offline' });
  if (robot) {
    await logActivity(robot.userId.toString(), {
      action: 'robot.disconnected',
      category: 'system',
      description: `Robot "${robot.name}" disconnected`,
      metadata: { robotId },
    });
  }
  // Any command still awaiting a reply from this robot will simply hit its own timeout in
  // sendRobotCommand rather than being proactively rejected here - `pending` isn't keyed by
  // robot, and cross-referencing it against this one disconnect isn't worth the complexity.
}

/** Parses and dispatches one incoming message from a robot's WebSocket connection. */
export async function handleRobotMessage(robotId: string, raw: string): Promise<void> {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    logger.warn({ robotId }, 'Received non-JSON message from robot, ignoring');
    return;
  }

  const type = data.type;

  if (type === 'telemetry') {
    const update: Record<string, unknown> = { lastSeenAt: new Date() };
    if (typeof data.battery === 'number') update.battery = data.battery;
    if (typeof data.distance_cm === 'number') update.distanceCm = data.distance_cm;
    await RobotModel.findByIdAndUpdate(robotId, update);
    if (typeof data.battery === 'number' && data.battery <= 15) {
      const robot = await RobotModel.findById(robotId);
      if (robot) {
        await logActivity(robot.userId.toString(), {
          action: 'robot.battery_low',
          category: 'system',
          description: `Robot "${robot.name}" battery is low (${data.battery}%)`,
          metadata: { robotId, battery: data.battery },
        });
      }
    }
    return;
  }

  if (type === 'ack') {
    const commandId = String(data.command_id ?? '');
    await RobotCommandModel.findByIdAndUpdate(commandId, { status: 'acked' }).catch(() => undefined);
    return;
  }

  if (type === 'result' || type === 'error') {
    const commandId = String(data.command_id ?? '');
    const entry = pending.get(commandId);
    if (!entry) return;
    pending.delete(commandId);
    clearTimeout(entry.timeout);

    if (type === 'error' || data.status === 'error') {
      entry.reject(new Error(typeof data.message === 'string' ? data.message : 'Robot reported an error'));
    } else {
      entry.resolve({ data: data.data, message: typeof data.message === 'string' ? data.message : undefined });
    }
    return;
  }

  logger.warn({ robotId, type }, 'Received unknown message type from robot');
}

/**
 * Sends a command to a robot and waits for its result (or times out). Persists a RobotCommand
 * audit record through the full pending -> sent -> acked -> completed/failed/timeout lifecycle.
 * This is the single choke point every robot tool goes through - analogous to executeToolCall
 * for regular agent tools.
 */
export async function sendRobotCommand(
  userId: string,
  robotId: string,
  type: RobotCommandType,
  input: Record<string, unknown>,
): Promise<{ data?: unknown; message?: string }> {
  const socket = connections.get(robotId);
  if (!socket) {
    throw AppError.provider('Robot is offline - no active connection.');
  }

  const command = await RobotCommandModel.create({ userId, robotId, type, input, status: 'pending' });
  const commandId = command._id.toString();
  const startedAt = Date.now();

  try {
    const outcome = await new Promise<{ data?: unknown; message?: string }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(commandId);
        reject(new Error('Robot did not respond in time.'));
      }, ROBOT_SAFETY_LIMITS.COMMAND_TIMEOUT_MS);
      pending.set(commandId, { resolve, reject, timeout });

      socket.send(JSON.stringify({ type: 'command', id: commandId, command: type, ...input }));
    });

    command.status = 'completed';
    command.result = outcome.data ?? null;
    command.durationMs = Date.now() - startedAt;
    await command.save();
    return outcome;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Robot command failed';
    command.status = message === 'Robot did not respond in time.' ? 'timeout' : 'failed';
    command.errorMessage = message;
    command.durationMs = Date.now() - startedAt;
    await command.save();
    throw AppError.provider(message);
  }
}
