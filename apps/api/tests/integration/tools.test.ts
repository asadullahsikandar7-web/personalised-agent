import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, clearDatabase, registerTestUser, type TestUser } from '../helpers';

function auth(user: TestUser) {
  return { authorization: `Bearer ${user.accessToken}` };
}

describe('Tool registry REST endpoints', () => {
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

  it('lists all registered tools with their permission levels', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tools', headers: auth(user) });
    expect(res.statusCode).toBe(200);
    const tools = res.json().data;
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(10);
    const calculator = tools.find((t: { name: string }) => t.name === 'calculator');
    expect(calculator.permissionLevel).toBe('safe');
    expect(calculator.inputJsonSchema).toBeTruthy();
  });

  it('returns 404 for an unknown tool', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tools/does_not_exist', headers: auth(user) });
    expect(res.statusCode).toBe(404);
  });

  it('directly executes a safe tool', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tools/calculator/execute',
      headers: auth(user),
      payload: { expression: '10 * 4' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.result.data).toEqual({ result: 40 });
  });

  it('returns awaiting_approval (202) when directly executing an approval-required tool', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tools/delete_task/execute',
      headers: auth(user),
      payload: { taskId: '507f1f77bcf86cd799439011' },
    });
    expect(res.statusCode).toBe(202);
    expect(res.json().data.status).toBe('awaiting_approval');
  });

  it('validates tool input and reports a clear error for bad input', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tools/calculator/execute',
      headers: auth(user),
      payload: { expression: '' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().data.result.errorCode).toBe('INVALID_INPUT');
  });
});
