import type { FastifyInstance } from 'fastify';
import { registerRobotSchema, robotRemoteCommandSchema } from '@personal-agent/shared';
import { getUserId } from '../../middleware/current-user';
import { parseOrThrow } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import { hashToken } from '../../utils/jwt';
import { RobotModel } from '../../db/models';
import { logger } from '../../utils/logger';
import * as robotsService from './service';
import { registerRobotConnection, removeRobotConnection, handleRobotMessage, sendRobotCommand } from './gateway';

export default async function robotsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/', async (req, reply) => {
    const input = parseOrThrow(registerRobotSchema, req.body);
    const result = await robotsService.registerRobot(getUserId(req), input);
    sendSuccess(reply, result, 201);
  });

  app.get('/', async (req, reply) => {
    sendSuccess(reply, await robotsService.listRobots(getUserId(req)));
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await robotsService.getRobotOrThrow(getUserId(req), id);
    sendSuccess(reply, robotsService.toRobotDTO(doc));
  });

  /**
   * Remote control: the app's drive pad sends each button press here. Holding a direction sends
   * a short move after every completed one, so this gets its own, higher rate limit than the
   * app-wide 200/min - a few minutes of driving shouldn't lock the user out of everything else.
   */
  app.post('/:id/commands', { config: { rateLimit: { max: 600, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { command, ...input } = parseOrThrow(robotRemoteCommandSchema, req.body);
    await robotsService.getRobotOrThrow(getUserId(req), id);
    const result = await sendRobotCommand(getUserId(req), id, command, input);
    sendSuccess(reply, { message: result.message ?? null, data: result.data ?? null });
  });

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await robotsService.unpairRobot(getUserId(req), id);
    sendSuccess(reply, { unpaired: true });
  });
}

/**
 * The Pi's persistent connection - registered separately from robotsRoutes because it
 * authenticates with a per-robot pairing token, not a user JWT (a Pi isn't a logged-in user).
 * See gateway.ts for the wire protocol and docs/robot-integration.md for the full design.
 */
export async function robotWsRoutes(app: FastifyInstance) {
  app.get('/:deviceId', { websocket: true }, async (socket, req) => {
    const { deviceId } = req.params as { deviceId: string };
    const { token } = req.query as { token?: string };

    if (!token) {
      socket.close(4001, 'Missing pairing token');
      return;
    }

    const robot = await RobotModel.findOne({ deviceId }).select('+pairingTokenHash');
    if (!robot || robot.pairingTokenHash !== hashToken(token)) {
      socket.close(4003, 'Invalid device id or pairing token');
      return;
    }

    const robotId = robot._id.toString();
    await registerRobotConnection(robotId, socket);
    logger.info({ robotId, deviceId }, 'Robot connected');

    socket.on('message', (raw: Buffer) => {
      handleRobotMessage(robotId, raw.toString()).catch((err) => {
        logger.error({ err, robotId }, 'Failed handling robot message');
      });
    });

    socket.on('close', () => {
      removeRobotConnection(robotId).catch((err) => {
        logger.error({ err, robotId }, 'Failed to record robot disconnect');
      });
      logger.info({ robotId, deviceId }, 'Robot disconnected');
    });
  });
}
