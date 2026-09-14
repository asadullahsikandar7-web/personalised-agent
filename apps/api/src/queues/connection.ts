import IORedis from 'ioredis';
import { env } from '../config/env';

/** Shared BullMQ Redis connection. BullMQ requires maxRetriesPerRequest: null on its connections. */
export function createQueueConnection(): IORedis {
  return new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
}
