import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, clearDatabase, registerTestUser, type TestUser } from '../helpers';

// Shrinks the robot command timeout from 8s to 500ms so the "robot never responds" test doesn't
// actually wait 8 seconds, while still leaving enough headroom for the success/error tests'
// real (mongodb-memory-server) round-trips to complete before it fires - hoisted above the
// imports below by Vitest regardless of source order.
vi.mock('@personal-agent/shared', async () => {
  const actual = await vi.importActual<typeof import('@personal-agent/shared')>('@personal-agent/shared');
  return { ...actual, ROBOT_SAFETY_LIMITS: { ...actual.ROBOT_SAFETY_LIMITS, COMMAND_TIMEOUT_MS: 500 } };
});

function auth(user: TestUser) {
  return { authorization: `Bearer ${user.accessToken}` };
}

/** A fake robot-side WebSocket that just records what the gateway sends it. */
function makeFakeSocket() {
  const sent: Array<Record<string, unknown>> = [];
  return {
    sent,
    send: (raw: string) => sent.push(JSON.parse(raw)),
  };
}

describe('Robots REST endpoints', () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await clearDatabase();
    user = await registerTestUser(app);
  });

  it('registers a robot and returns a one-time pairing token', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/robots', headers: auth(user), payload: { name: 'Robo' } });
    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    expect(data.robot).toMatchObject({ name: 'Robo', status: 'offline', battery: null });
    expect(typeof data.pairingToken).toBe('string');
    expect(data.pairingToken.length).toBeGreaterThan(20);
  });

  it('lists only the requesting user\'s robots', async () => {
    await app.inject({ method: 'POST', url: '/api/robots', headers: auth(user), payload: { name: 'Robo' } });
    const otherUser = await registerTestUser(app);
    await app.inject({ method: 'POST', url: '/api/robots', headers: auth(otherUser), payload: { name: 'Other Robo' } });

    const res = await app.inject({ method: 'GET', url: '/api/robots', headers: auth(user) });
    expect(res.statusCode).toBe(200);
    const robots = res.json().data;
    expect(robots).toHaveLength(1);
    expect(robots[0].name).toBe('Robo');
  });

  it('returns 404 for a robot belonging to another user', async () => {
    const registerRes = await app.inject({ method: 'POST', url: '/api/robots', headers: auth(user), payload: { name: 'Robo' } });
    const robotId = registerRes.json().data.robot.id;
    const otherUser = await registerTestUser(app);

    const res = await app.inject({ method: 'GET', url: `/api/robots/${robotId}`, headers: auth(otherUser) });
    expect(res.statusCode).toBe(404);
  });

  it('unpairs a robot', async () => {
    const registerRes = await app.inject({ method: 'POST', url: '/api/robots', headers: auth(user), payload: { name: 'Robo' } });
    const robotId = registerRes.json().data.robot.id;

    const deleteRes = await app.inject({ method: 'DELETE', url: `/api/robots/${robotId}`, headers: auth(user) });
    expect(deleteRes.statusCode).toBe(200);

    const getRes = await app.inject({ method: 'GET', url: `/api/robots/${robotId}`, headers: auth(user) });
    expect(getRes.statusCode).toBe(404);
  });

  it('rejects registration without a name', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/robots', headers: auth(user), payload: {} });
    expect(res.statusCode).toBe(400);
  });
});

describe('Robot gateway command lifecycle', () => {
  let app: FastifyInstance;
  let user: TestUser;
  let robotId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await clearDatabase();
    user = await registerTestUser(app);
    const res = await app.inject({ method: 'POST', url: '/api/robots', headers: auth(user), payload: { name: 'Robo' } });
    robotId = res.json().data.robot.id;
  });

  it('fails honestly when the robot has no active connection, without throwing out of a tool', async () => {
    const { executeToolCall } = await import('../../src/ai/tool-calling/executor');
    const outcome = await executeToolCall(
      'get_robot_battery',
      { robotId },
      { userId: user.userId, timezone: 'UTC', isApprovedExecution: false },
    );
    expect(outcome.status).toBe('failed');
    expect(outcome.result?.success).toBe(false);
    expect(outcome.result?.message).toMatch(/offline/i);
  });

  it('resolves a command when the robot acks and returns a result', async () => {
    const { registerRobotConnection, sendRobotCommand, handleRobotMessage } = await import('../../src/modules/robots/gateway');
    const { RobotCommandModel } = await import('../../src/db/models');
    const socket = makeFakeSocket();
    await registerRobotConnection(robotId, socket as never);

    const commandPromise = sendRobotCommand(user.userId, robotId, 'get_battery', {});
    // The gateway sent exactly one command; grab its id to reply to it, like a real robot would.
    await vi.waitFor(() => expect(socket.sent).toHaveLength(1));
    const commandId = socket.sent[0].id as string;

    await handleRobotMessage(robotId, JSON.stringify({ type: 'ack', command_id: commandId, status: 'accepted' }));
    await handleRobotMessage(robotId, JSON.stringify({ type: 'result', command_id: commandId, status: 'ok', data: { battery: 77 } }));

    const outcome = await commandPromise;
    expect(outcome.data).toEqual({ battery: 77 });

    const saved = await RobotCommandModel.findById(commandId);
    expect(saved?.status).toBe('completed');
  });

  it('fails the command when the robot reports an error', async () => {
    const { registerRobotConnection, sendRobotCommand, handleRobotMessage } = await import('../../src/modules/robots/gateway');
    const { RobotCommandModel } = await import('../../src/db/models');
    const socket = makeFakeSocket();
    await registerRobotConnection(robotId, socket as never);

    const commandPromise = sendRobotCommand(user.userId, robotId, 'move', { direction: 'forward' });
    await vi.waitFor(() => expect(socket.sent).toHaveLength(1));
    const commandId = socket.sent[0].id as string;

    await handleRobotMessage(
      robotId,
      JSON.stringify({ type: 'error', command_id: commandId, code: 'OBSTACLE_DETECTED', message: 'Obstacle ahead' }),
    );

    await expect(commandPromise).rejects.toThrow('Obstacle ahead');
    const saved = await RobotCommandModel.findById(commandId);
    expect(saved?.status).toBe('failed');
    expect(saved?.errorMessage).toBe('Obstacle ahead');
  });

  it('times out a command the robot never responds to', async () => {
    const { registerRobotConnection, sendRobotCommand } = await import('../../src/modules/robots/gateway');
    const { RobotCommandModel } = await import('../../src/db/models');
    const socket = makeFakeSocket();
    await registerRobotConnection(robotId, socket as never);

    await expect(sendRobotCommand(user.userId, robotId, 'get_status', {})).rejects.toThrow(/did not respond/i);

    const saved = await RobotCommandModel.findOne({ robotId }).sort({ createdAt: -1 });
    expect(saved?.status).toBe('timeout');
  });

  it('updates robot telemetry from an unsolicited telemetry message', async () => {
    const { handleRobotMessage } = await import('../../src/modules/robots/gateway');
    const { RobotModel } = await import('../../src/db/models');

    await handleRobotMessage(robotId, JSON.stringify({ type: 'telemetry', battery: 42, distance_cm: 30 }));

    const robot = await RobotModel.findById(robotId);
    expect(robot?.battery).toBe(42);
    expect(robot?.distanceCm).toBe(30);
  });
});

describe('Robot selection when the user has several robots', () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await clearDatabase();
    user = await registerTestUser(app);
    await app.inject({ method: 'POST', url: '/api/robots', headers: auth(user), payload: { name: 'Robo' } });
    await app.inject({ method: 'POST', url: '/api/robots', headers: auth(user), payload: { name: 'Robo Freenove Pi' } });
  });

  const context = () => ({ userId: user.userId, timezone: 'UTC', isApprovedExecution: false });

  it('asks which robot, with a numbered list, instead of guessing', async () => {
    const { executeToolCall } = await import('../../src/ai/tool-calling/executor');
    const outcome = await executeToolCall('get_robot_status', {}, context());
    expect(outcome.result?.success).toBe(false);
    expect(outcome.result?.errorCode).toBe('ROBOT_SELECTION_REQUIRED');
    expect(outcome.result?.message).toMatch(/Which one do you mean\?/);
    expect(outcome.result?.message).toContain('1. Robo Freenove Pi (offline)');
    expect(outcome.result?.message).toContain('2. Robo (offline)');
  });

  it('resolves "connected" to the only online robot', async () => {
    const { RobotModel } = await import('../../src/db/models');
    await RobotModel.updateOne({ name: 'Robo Freenove Pi' }, { status: 'online' });
    const { resolveRobot } = await import('../../src/modules/robots/service');
    expect((await resolveRobot(user.userId, 'connected')).name).toBe('Robo Freenove Pi');
  });

  it.each(['1', 'robo freenove pi', 'freenove'])('resolves the choice "%s" to that robot', async (choice) => {
    const { executeToolCall } = await import('../../src/ai/tool-calling/executor');
    const outcome = await executeToolCall('get_robot_status', { robotId: choice }, context());
    // Resolution succeeded and reached the gateway, which reports the (unconnected) robot offline.
    expect(outcome.result?.errorCode).not.toBe('ROBOT_SELECTION_REQUIRED');
    expect(outcome.result?.message).toMatch(/offline/i);
  });

  it('lists the robots via list_robots', async () => {
    const { executeToolCall } = await import('../../src/ai/tool-calling/executor');
    const outcome = await executeToolCall('list_robots', {}, context());
    expect(outcome.result?.success).toBe(true);
    expect(outcome.result?.message).toContain('1. Robo Freenove Pi');
  });
});

describe('Robot remote-control endpoint', () => {
  let app: FastifyInstance;
  let user: TestUser;
  let robotId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await clearDatabase();
    user = await registerTestUser(app);
    const res = await app.inject({ method: 'POST', url: '/api/robots', headers: auth(user), payload: { name: 'Robo' } });
    robotId = res.json().data.robot.id;
  });

  const command = (payload: unknown, who: TestUser = user) =>
    app.inject({ method: 'POST', url: `/api/robots/${robotId}/commands`, headers: auth(who), payload: payload as object });

  it('reports an offline robot honestly instead of pretending it moved', async () => {
    const res = await command({ command: 'move', direction: 'forward' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.json().error.message).toMatch(/offline/i);
  });

  it('sends a move straight to the robot, without an approval step', async () => {
    const { registerRobotConnection, handleRobotMessage } = await import('../../src/modules/robots/gateway');
    const socket = makeFakeSocket();
    await registerRobotConnection(robotId, socket as never);

    const pendingRes = command({ command: 'move', direction: 'forward', speed: 60, durationMs: 700 });
    await vi.waitFor(() => expect(socket.sent).toHaveLength(1));
    expect(socket.sent[0]).toMatchObject({ command: 'move', direction: 'forward', speed: 60, durationMs: 700 });
    const commandId = socket.sent[0].id as string;
    await handleRobotMessage(robotId, JSON.stringify({ type: 'result', command_id: commandId, status: 'ok', message: 'Moved.' }));

    const res = await pendingRes;
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual({ message: 'Moved.', data: null });
  });

  it.each([
    [{ command: 'move', direction: 'sideways' }],
    [{ command: 'move', direction: 'forward', durationMs: 60_000 }],
    [{ command: 'move', direction: 'forward', speed: 150 }],
    [{ command: 'self_destruct' }],
  ])('rejects out-of-bounds command %o', async (payload) => {
    expect((await command(payload)).statusCode).toBe(400);
  });

  it("refuses to drive another user's robot", async () => {
    const other = await registerTestUser(app);
    expect((await command({ command: 'stop' }, other)).statusCode).toBe(404);
  });

  it('sends stop with no extra fields', async () => {
    const { registerRobotConnection, handleRobotMessage } = await import('../../src/modules/robots/gateway');
    const socket = makeFakeSocket();
    await registerRobotConnection(robotId, socket as never);
    const pendingRes = command({ command: 'stop' });
    await vi.waitFor(() => expect(socket.sent).toHaveLength(1));
    expect(socket.sent[0]).toMatchObject({ command: 'stop' });
    await handleRobotMessage(robotId, JSON.stringify({ type: 'result', command_id: socket.sent[0].id, status: 'ok' }));
    expect((await pendingRes).statusCode).toBe(200);
  });
});
