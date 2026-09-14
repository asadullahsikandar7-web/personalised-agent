import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env';
import { logger } from './utils/logger';

import mongoPlugin from './plugins/mongo';
import redisPlugin from './plugins/redis';
import authPlugin from './plugins/auth';
import errorHandlerPlugin from './plugins/error-handler';
import requestContextPlugin from './plugins/request-context';
import swaggerPlugin from './plugins/swagger';

import authRoutes from './modules/auth/routes';
import usersRoutes from './modules/users/routes';
import conversationsRoutes from './modules/conversations/routes';
import agentRoutes from './modules/agent/routes';
import memoryRoutes from './modules/memory/routes';
import tasksRoutes from './modules/tasks/routes';
import schedulesRoutes from './modules/schedules/routes';
import toolsRoutes from './modules/tools/routes';
import musicRoutes from './modules/music/routes';
import notificationsRoutes from './modules/notifications/routes';
import activityRoutes from './modules/activity/routes';
import notesRoutes from './modules/notes/routes';
import healthRoutes from './modules/health/routes';

export interface BuildAppOptions {
  /** Skip connecting to Mongo/Redis - used by unit tests that mock the DB layer. */
  skipInfra?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger,
    trustProxy: true,
    disableRequestLogging: env.NODE_ENV === 'test',
  });

  await app.register(requestContextPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  });
  await app.register(rateLimit, {
    max: env.NODE_ENV === 'test' ? 10_000 : 200,
    timeWindow: '1 minute',
  });

  if (!options.skipInfra) {
    await app.register(mongoPlugin);
    await app.register(redisPlugin);
  }

  await app.register(authPlugin);
  if (env.NODE_ENV !== 'test') {
    await app.register(swaggerPlugin);
  }

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(conversationsRoutes, { prefix: '/api/conversations' });
  await app.register(agentRoutes, { prefix: '/api/agent' });
  await app.register(memoryRoutes, { prefix: '/api/memories' });
  await app.register(tasksRoutes, { prefix: '/api/tasks' });
  await app.register(schedulesRoutes, { prefix: '/api/reminders' });
  await app.register(toolsRoutes, { prefix: '/api/tools' });
  await app.register(musicRoutes, { prefix: '/api/music' });
  await app.register(notificationsRoutes, { prefix: '/api/notifications' });
  await app.register(activityRoutes, { prefix: '/api/activity' });
  await app.register(notesRoutes, { prefix: '/api/notes' });
  await app.register(healthRoutes, { prefix: '/api' });

  return app;
}
