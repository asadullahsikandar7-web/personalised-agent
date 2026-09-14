import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, clearDatabase, registerTestUser, type TestUser } from '../helpers';
import { getReminderQueue } from '../../src/queues/reminder-queue';

function auth(user: TestUser) {
  return { authorization: `Bearer ${user.accessToken}` };
}

describe('Reminders and scheduling', () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
    await getReminderQueue().close();
  });
  beforeEach(async () => {
    await clearDatabase();
    user = await registerTestUser(app);
  });

  it('creates a reminder and schedules a real BullMQ job for it', async () => {
    const scheduledAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const res = await app.inject({
      method: 'POST',
      url: '/api/reminders',
      headers: auth(user),
      payload: { title: 'Study Data Structures', scheduledAt, timezone: 'UTC' },
    });
    expect(res.statusCode).toBe(201);
    const reminder = res.json().data;
    expect(reminder.status).toBe('scheduled');
    expect(reminder.nextTriggerAt).toBe(new Date(scheduledAt).toISOString());

    const job = await getReminderQueue().getJob(`${reminder.id}-${new Date(reminder.nextTriggerAt).getTime()}`);
    expect(job).toBeTruthy();
  });

  it('rejects an invalid scheduledAt', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reminders',
      headers: auth(user),
      payload: { title: 'Bad reminder', scheduledAt: 'not-a-date' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('lists reminders sorted by next trigger', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/reminders',
      headers: auth(user),
      payload: { title: 'Later', scheduledAt: new Date(Date.now() + 60 * 60_000).toISOString() },
    });
    await app.inject({
      method: 'POST',
      url: '/api/reminders',
      headers: auth(user),
      payload: { title: 'Sooner', scheduledAt: new Date(Date.now() + 5 * 60_000).toISOString() },
    });
    const res = await app.inject({ method: 'GET', url: '/api/reminders', headers: auth(user) });
    const titles = res.json().data.items.map((r: { title: string }) => r.title);
    expect(titles).toEqual(['Sooner', 'Later']);
  });

  it('snoozes a reminder and moves its next trigger into the future', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/reminders',
      headers: auth(user),
      payload: { title: 'Snooze me', scheduledAt: new Date(Date.now() + 60_000).toISOString() },
    });
    const reminderId = create.json().data.id;

    const snooze = await app.inject({
      method: 'POST',
      url: `/api/reminders/${reminderId}/snooze`,
      headers: auth(user),
      payload: { minutes: 20 },
    });
    expect(snooze.statusCode).toBe(200);
    expect(snooze.json().data.status).toBe('snoozed');
    const nextTrigger = new Date(snooze.json().data.nextTriggerAt).getTime();
    expect(nextTrigger).toBeGreaterThan(Date.now() + 15 * 60_000);
  });

  it('cancels a reminder', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/reminders',
      headers: auth(user),
      payload: { title: 'Cancel me', scheduledAt: new Date(Date.now() + 60_000).toISOString() },
    });
    const reminderId = create.json().data.id;

    const cancel = await app.inject({ method: 'DELETE', url: `/api/reminders/${reminderId}`, headers: auth(user) });
    expect(cancel.json().data.status).toBe('cancelled');
    expect(cancel.json().data.nextTriggerAt).toBeNull();
  });
});
