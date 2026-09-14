import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, clearDatabase, registerTestUser, type TestUser } from '../helpers';

function auth(user: TestUser) {
  return { authorization: `Bearer ${user.accessToken}` };
}

describe('Agent message flow', () => {
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

  it('answers a plain question directly with no tool calls', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agent/message',
      headers: auth(user),
      payload: { message: 'How are you today?' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json().data;
    expect(body.assistantMessage.toolCalls ?? []).toHaveLength(0);
    expect(body.conversationId).toBeTruthy();
  });

  it('creates a task through natural language and confirms it in the reply', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agent/message',
      headers: auth(user),
      payload: { message: 'Create a task called Finish API testing' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json().data;
    expect(body.assistantMessage.toolCalls[0].toolName).toBe('create_task');
    expect(body.assistantMessage.toolCalls[0].status).toBe('succeeded');

    const tasks = await app.inject({ method: 'GET', url: '/api/tasks', headers: auth(user) });
    expect(tasks.json().data.items).toHaveLength(1);
    expect(tasks.json().data.items[0].title).toMatch(/Finish API testing/);
  });

  it('creates a reminder through natural language', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agent/message',
      headers: auth(user),
      payload: { message: 'Remind me to study Data Structures at 7 PM.' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json().data;
    expect(body.assistantMessage.toolCalls[0].toolName).toBe('create_reminder');
  });

  it('saves a memory through natural language', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agent/message',
      headers: auth(user),
      payload: { message: 'Remember that my preferred programming language is TypeScript.' },
    });
    expect(res.statusCode).toBe(200);
    const memories = await app.inject({ method: 'GET', url: '/api/memories', headers: auth(user) });
    expect(memories.json().data.items.length).toBeGreaterThan(0);
  });

  it('refuses to save a memory that looks like a credential', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/memories',
      headers: auth(user),
      payload: { category: 'instruction', key: 'my api key', value: 'sk-super-secret-api-key-value' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('continues an existing conversation when conversationId is supplied', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/agent/message',
      headers: auth(user),
      payload: { message: 'Hello there' },
    });
    const conversationId = first.json().data.conversationId;

    const second = await app.inject({
      method: 'POST',
      url: '/api/agent/message',
      headers: auth(user),
      payload: { conversationId, message: 'Follow-up message' },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().data.conversationId).toBe(conversationId);

    const messages = await app.inject({ method: 'GET', url: `/api/conversations/${conversationId}/messages`, headers: auth(user) });
    expect(messages.json().data.items.length).toBe(4); // 2 user + 2 assistant
  });

  it('requires approval before sending a message, and the message stays unsent until approved', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agent/message',
      headers: auth(user),
      payload: { message: 'Send this message to the team saying we shipped it' },
    });
    expect(res.statusCode).toBe(200);
    const toolCall = res.json().data.assistantMessage.toolCalls[0];
    expect(toolCall.toolName).toBe('send_message');
    expect(toolCall.status).toBe('awaiting_approval');
    expect(toolCall.approvalId).toBeTruthy();

    const approvals = await app.inject({ method: 'GET', url: '/api/agent/approvals', headers: auth(user) });
    expect(approvals.json().data.items.some((a: { id: string }) => a.id === toolCall.approvalId)).toBe(true);
  });

  it('executes the tool once its approval request is approved', async () => {
    const message = await app.inject({
      method: 'POST',
      url: '/api/agent/message',
      headers: auth(user),
      payload: { message: 'Send this message to the team saying we shipped it' },
    });
    const approvalId = message.json().data.assistantMessage.toolCalls[0].approvalId;

    const approve = await app.inject({
      method: 'POST',
      url: '/api/agent/approve',
      headers: auth(user),
      payload: { approvalId },
    });
    expect(approve.statusCode).toBe(200);
    expect(approve.json().data.approvalStatus).toBe('approved');
    // No message provider is configured in this build, so the tool honestly reports that
    // nothing was actually sent rather than pretending it succeeded.
    expect(approve.json().data.outcome.result.errorCode).toBe('NOT_CONFIGURED');
  });

  it('rejects an approval request and never executes the tool', async () => {
    const message = await app.inject({
      method: 'POST',
      url: '/api/agent/message',
      headers: auth(user),
      payload: { message: 'Send this message to the team saying we shipped it' },
    });
    const approvalId = message.json().data.assistantMessage.toolCalls[0].approvalId;

    const reject = await app.inject({
      method: 'POST',
      url: '/api/agent/reject',
      headers: auth(user),
      payload: { approvalId },
    });
    expect(reject.statusCode).toBe(200);

    const approveAfterReject = await app.inject({
      method: 'POST',
      url: '/api/agent/approve',
      headers: auth(user),
      payload: { approvalId },
    });
    expect(approveAfterReject.json().data.approvalStatus).toBe('rejected');
  });

  it('another user cannot approve or see someone else\'s approval request', async () => {
    const other = await registerTestUser(app);
    const message = await app.inject({
      method: 'POST',
      url: '/api/agent/message',
      headers: auth(user),
      payload: { message: 'Send this message to the team saying we shipped it' },
    });
    const approvalId = message.json().data.assistantMessage.toolCalls[0].approvalId;

    const approveAsOther = await app.inject({
      method: 'POST',
      url: '/api/agent/approve',
      headers: auth(other),
      payload: { approvalId },
    });
    expect(approveAsOther.statusCode).toBe(404);
  });
});
