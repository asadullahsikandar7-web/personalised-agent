import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { buildApp } from '../src/app';

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

/** Drops all collections between tests so each test starts from a clean database. */
export async function clearDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export interface TestUser {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

let counter = 0;

export async function registerTestUser(app: FastifyInstance, overrides: Partial<{ email: string; password: string; name: string }> = {}): Promise<TestUser> {
  counter += 1;
  const email = overrides.email ?? `test-user-${counter}-${Date.now()}@example.com`;
  const password = overrides.password ?? 'TestPass123!';
  const name = overrides.name ?? 'Test User';

  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password, name },
  });
  if (res.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${res.statusCode} ${res.body}`);
  }
  const body = res.json();
  return {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    userId: body.data.user.id,
    email,
  };
}
