import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, clearDatabase, registerTestUser } from '../helpers';

describe('Auth flow', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await clearDatabase();
  });

  it('registers a new user and returns a token pair', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'alice@example.com', password: 'AlicePass123!', name: 'Alice' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('alice@example.com');
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.refreshToken).toBeTruthy();
    expect(body.data.user).not.toHaveProperty('passwordHash');
  });

  it('rejects registration with an invalid email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'not-an-email', password: 'AlicePass123!', name: 'Alice' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a duplicate registration for the same email', async () => {
    await registerTestUser(app, { email: 'dup@example.com' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'dup@example.com', password: 'AnotherPass123!', name: 'Dup' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('logs in with correct credentials', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'bob@example.com', password: 'BobPass123!', name: 'Bob' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'bob@example.com', password: 'BobPass123!' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.accessToken).toBeTruthy();
  });

  it('rejects login with the wrong password', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'carol@example.com', password: 'CarolPass123!', name: 'Carol' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'carol@example.com', password: 'WrongPassword!' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects access to a protected route without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('allows access to a protected route with a valid token', async () => {
    const user = await registerTestUser(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${user.accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.email).toBe(user.email);
  });

  it('rejects a request with a malformed token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rotates the refresh token and issues a new access token', async () => {
    const user = await registerTestUser(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: user.refreshToken },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.refreshToken).not.toBe(user.refreshToken);
  });

  it('rejects reusing a refresh token after it has been rotated', async () => {
    const user = await registerTestUser(app);
    await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken: user.refreshToken } });
    const reuse = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken: user.refreshToken } });
    expect(reuse.statusCode).toBe(401);
  });

  it('logs out and revokes the refresh token', async () => {
    const user = await registerTestUser(app);
    const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', payload: { refreshToken: user.refreshToken } });
    expect(logout.statusCode).toBe(200);
    const refreshAfterLogout = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken: user.refreshToken } });
    expect(refreshAfterLogout.statusCode).toBe(401);
  });
});
