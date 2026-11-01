import { randomUUID } from 'node:crypto';
import { RobotModel, type RobotDoc } from '../../db/models';
import { AppError } from '../../utils/errors';
import { hashToken, generateOpaqueToken } from '../../utils/jwt';
import { logActivity } from '../activity/service';
import type { RegisterRobotInput, RobotDTO, RobotRegistrationResultDTO } from '@personal-agent/shared';

export function toRobotDTO(doc: RobotDoc): RobotDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    deviceId: doc.deviceId,
    status: doc.status as RobotDTO['status'],
    battery: doc.battery ?? null,
    distanceCm: doc.distanceCm ?? null,
    firmwareVersion: doc.firmwareVersion ?? null,
    lastSeenAt: doc.lastSeenAt ? doc.lastSeenAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * Registers a new robot and returns a one-time pairing token (shown once, like a password -
 * only its hash is stored). The Pi presents this token on its first WebSocket connection to
 * prove it's the robot this user just registered; see ws-route.ts.
 */
export async function registerRobot(userId: string, input: RegisterRobotInput): Promise<RobotRegistrationResultDTO> {
  const pairingToken = generateOpaqueToken();
  const doc = await RobotModel.create({
    userId,
    name: input.name,
    deviceId: randomUUID(),
    pairingTokenHash: hashToken(pairingToken),
    status: 'offline',
  });
  await logActivity(userId, { action: 'robot.registered', category: 'system', description: `Robot "${input.name}" registered` });
  return { robot: toRobotDTO(doc), pairingToken };
}

export async function listRobots(userId: string): Promise<RobotDTO[]> {
  const docs = await RobotModel.find({ userId }).sort({ createdAt: -1 });
  return docs.map(toRobotDTO);
}

export async function getRobotOrThrow(userId: string, robotId: string): Promise<RobotDoc> {
  const doc = await RobotModel.findOne({ _id: robotId, userId });
  if (!doc) throw AppError.notFound('Robot not found');
  return doc;
}

export async function unpairRobot(userId: string, robotId: string): Promise<void> {
  const doc = await getRobotOrThrow(userId, robotId);
  await doc.deleteOne();
  await logActivity(userId, { action: 'robot.unpaired', category: 'system', description: `Robot "${doc.name}" unpaired` });
}

/** Numbered "1. Name (status)" lines, in the same order resolveRobotId accepts numbers for. */
export function formatRobotChoices(robots: RobotDTO[]): string {
  return robots.map((r, i) => `${i + 1}. ${r.name} (${r.status})`).join('\n');
}

/** "my connected robo" - resolves to the one online robot, when exactly one is online. */
const CONNECTED_REFERENCES = new Set(['online', 'connected', 'active', 'live']);

/**
 * Matches a user/LLM-supplied reference against the user's robots. Accepts the DB id, the
 * deviceId, a 1-based position in the listRobots order (so a voice reply of "2" works after the
 * agent has shown the numbered list), "online"/"connected", an exact name, or a unique partial name ("freenove").
 */
function matchRobot(robots: RobotDTO[], reference: string): RobotDTO | undefined {
  const ref = reference.trim().toLowerCase();
  const byId = robots.find((r) => r.id === reference.trim() || r.deviceId.toLowerCase() === ref);
  if (byId) return byId;
  if (/^\d+$/.test(ref)) return robots[Number(ref) - 1];
  if (CONNECTED_REFERENCES.has(ref)) {
    const online = robots.filter((r) => r.status === 'online');
    return online.length === 1 ? online[0] : undefined;
  }
  const exact = robots.filter((r) => r.name.toLowerCase() === ref);
  if (exact.length === 1) return exact[0];
  const partial = robots.filter((r) => r.name.toLowerCase().includes(ref));
  return partial.length === 1 ? partial[0] : undefined;
}

/**
 * Resolves which robot a tool call targets. An explicit reference (id, deviceId, number or name -
 * see matchRobot) always wins; when omitted (the common case for voice commands like "move
 * forward", which don't name a robot), falls back to the user's only robot. With multiple robots
 * and no usable reference it fails with a numbered list of choices rather than guessing which one
 * to move, so the agent can ask the user to pick.
 */
export async function resolveRobot(userId: string, explicitRobotId?: string): Promise<RobotDTO> {
  const robots = await listRobots(userId);
  if (robots.length === 0) throw AppError.notFound('No robot is registered yet.');
  if (explicitRobotId) {
    const match = matchRobot(robots, explicitRobotId);
    if (match) return match;
  } else if (robots.length === 1) {
    return robots[0]!;
  }
  const lead = explicitRobotId
    ? `I couldn't find a robot matching "${explicitRobotId}".`
    : `You have ${robots.length} robots.`;
  throw AppError.validation(
    `${lead} Which one do you mean?\n${formatRobotChoices(robots)}\nReply with the robot's number or name.`,
    { robots: robots.map((r) => ({ id: r.id, name: r.name, status: r.status })) },
  );
}

export async function resolveRobotId(userId: string, explicitRobotId?: string): Promise<string> {
  return (await resolveRobot(userId, explicitRobotId)).id;
}
