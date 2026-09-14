import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, clearDatabase, registerTestUser, type TestUser } from '../helpers';

function auth(user: TestUser) {
  return { authorization: `Bearer ${user.accessToken}` };
}

describe('Cross-user data ownership', () => {
  let app: FastifyInstance;
  let owner: TestUser;
  let intruder: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await clearDatabase();
    owner = await registerTestUser(app);
    intruder = await registerTestUser(app);
  });

  it('prevents another user from reading a task that is not theirs', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(owner),
      payload: { title: 'Private task' },
    });
    const taskId = create.json().data.id;

    const asIntruder = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskId}`,
      headers: auth(intruder),
      payload: { title: 'Hacked' },
    });
    expect(asIntruder.statusCode).toBe(404);
  });

  it('prevents another user from deleting a memory that is not theirs', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/memories',
      headers: auth(owner),
      payload: { category: 'preference', key: 'k', value: 'v' },
    });
    const memoryId = create.json().data.id;

    const asIntruder = await app.inject({
      method: 'DELETE',
      url: `/api/memories/${memoryId}`,
      headers: auth(intruder),
    });
    expect(asIntruder.statusCode).toBe(404);
  });

  it('prevents another user from seeing a reminder that is not theirs', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/reminders',
      headers: auth(owner),
      payload: { title: 'Private reminder', scheduledAt: new Date(Date.now() + 60_000).toISOString() },
    });
    const reminderId = create.json().data.id;

    const asIntruder = await app.inject({
      method: 'DELETE',
      url: `/api/reminders/${reminderId}`,
      headers: auth(intruder),
    });
    expect(asIntruder.statusCode).toBe(404);
  });

  it('only lists the requesting user\'s own tasks', async () => {
    await app.inject({ method: 'POST', url: '/api/tasks', headers: auth(owner), payload: { title: 'Owner task' } });
    await app.inject({ method: 'POST', url: '/api/tasks', headers: auth(intruder), payload: { title: 'Intruder task' } });

    const ownerTasks = await app.inject({ method: 'GET', url: '/api/tasks', headers: auth(owner) });
    const titles = ownerTasks.json().data.items.map((t: { title: string }) => t.title);
    expect(titles).toEqual(['Owner task']);
  });
});
