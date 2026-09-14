import type { FastifyInstance } from 'fastify';
import { isMongoConnected } from '../../db/mongoose';
import { sendSuccess } from '../../utils/response';

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_req, reply) => {
    sendSuccess(reply, { status: 'ok', uptimeSeconds: process.uptime() });
  });

  app.get('/ready', async (_req, reply) => {
    const mongoUp = isMongoConnected();
    let redisUp = false;
    try {
      const pong = await app.redis.ping();
      redisUp = pong === 'PONG';
    } catch {
      redisUp = false;
    }
    const ready = mongoUp && redisUp;
    sendSuccess(reply, { ready, mongo: mongoUp, redis: redisUp }, ready ? 200 : 503);
  });
}
