import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Vitest globalSetup: boots one in-memory MongoDB instance for the whole test run and points
 * MONGODB_URI at it before any test file imports src/config/env.ts. Tests still use the real
 * local Redis (BullMQ needs a genuine Redis, not a fake) - start `redis-server` before running
 * the suite; see docs/testing.md.
 */
export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create({ instance: { dbName: 'personal_agent_test' } });
  process.env.MONGODB_URI = mongod.getUri('personal_agent_test');
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-not-for-production-use-only';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-for-production-use-only';
  process.env.AI_PROVIDER = 'mock';

  return async () => {
    await mongod.stop();
  };
}
