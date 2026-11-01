import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, clearDatabase, registerTestUser, type TestUser } from '../helpers';

// Force both music-search providers "not configured" regardless of what a developer's local
// .env happens to have, so this test is deterministic and makes zero real network calls -
// tests/global-setup.ts only overrides a handful of unrelated vars, and dotenv would otherwise
// fill YOUTUBE_API_KEY/JAMENDO_CLIENT_ID in from a real local .env file if present. Vitest
// hoists vi.mock above the imports above regardless of source order.
vi.mock('../../src/config/env', async () => {
  const actual = await vi.importActual<typeof import('../../src/config/env')>('../../src/config/env');
  return { ...actual, env: { ...actual.env, YOUTUBE_API_KEY: '', JAMENDO_CLIENT_ID: '' } };
});

function auth(user: TestUser) {
  return { authorization: `Bearer ${user.accessToken}` };
}

/**
 * Exercises the real route/auth/validation pipeline with both providers forced unconfigured
 * (see the env mock above) - no real network calls, fully deterministic.
 */
describe('Music catalog search REST endpoint', () => {
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

  it('requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/music-search?query=lofi' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects a request with none of query/title/artist/album/genre', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/music-search', headers: auth(user) });
    expect(res.statusCode).toBe(400);
  });

  it('honestly reports every provider as not configured rather than fabricating results', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/music-search?query=lofi', headers: auth(user) });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.results).toEqual([]);
    expect(data.providersQueried).toEqual([]);
    expect(data.providersFailed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: 'youtube', reason: 'NOT_CONFIGURED' }),
        expect.objectContaining({ provider: 'jamendo', reason: 'NOT_CONFIGURED' }),
      ]),
    );
  });

  it('accepts structured title/artist/album/genre fields in place of query', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/music-search?artist=Nusrat+Fateh+Ali+Khan&genre=Qawwali',
      headers: auth(user),
    });
    expect(res.statusCode).toBe(200);
  });

  it('registers search_music_catalog as a safe tool', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tools', headers: auth(user) });
    expect(res.statusCode).toBe(200);
    const tools = res.json().data;
    const tool = tools.find((t: { name: string }) => t.name === 'search_music_catalog');
    expect(tool).toBeTruthy();
    expect(tool.permissionLevel).toBe('safe');
  });
});
