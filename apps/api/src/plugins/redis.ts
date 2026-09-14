import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

declare module 'fastify' {
  interface FastifyInstance {
    redis: IORedis;
  }
}

export default fp(async function redisPlugin(app: FastifyInstance) {
  const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));
  app.decorate('redis', redis);
  app.addHook('onClose', async () => {
    await redis.quit();
  });
});
