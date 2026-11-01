import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/config/env', () => ({
  env: {
    YOUTUBE_API_KEY: 'test-youtube-key',
    JAMENDO_CLIENT_ID: 'test-jamendo-id',
  },
  isProduction: false,
  isTest: true,
}));

import { buildCatalogSearchQuery, searchMusicCatalog } from '../../src/modules/music-search/service';
import { env } from '../../src/config/env';

const youtubeSearchResponse = {
  items: [{ id: { videoId: 'yt1' } }],
};
const youtubeVideosResponse = {
  items: [
    {
      id: 'yt1',
      snippet: { title: 'YT Song', channelTitle: 'YT Artist', thumbnails: { high: { url: 'https://img/yt.jpg' } } },
      contentDetails: { duration: 'PT3M20S' },
    },
  ],
};
const jamendoResponse = {
  results: [
    {
      id: 'jm1',
      name: 'Jamendo Song',
      artist_name: 'Jamendo Artist',
      album_name: 'Jamendo Album',
      duration: 180,
      image: 'https://img/jm.jpg',
      shareurl: 'https://jamendo.com/track/jm1',
    },
  ],
};

function mockFetchByUrl() {
  return vi.fn(async (input: string | URL) => {
    const url = input.toString();
    if (url.includes('youtube') && url.includes('/search')) {
      return { ok: true, json: async () => youtubeSearchResponse } as Response;
    }
    if (url.includes('youtube') && url.includes('/videos')) {
      return { ok: true, json: async () => youtubeVideosResponse } as Response;
    }
    if (url.includes('jamendo')) {
      return { ok: true, json: async () => jamendoResponse } as Response;
    }
    throw new Error(`Unexpected fetch to ${url}`);
  });
}

describe('buildCatalogSearchQuery', () => {
  it('uses query directly when given', () => {
    expect(buildCatalogSearchQuery({ query: 'lofi beats' })).toBe('lofi beats');
  });

  it('joins structured fields when no query is given', () => {
    expect(buildCatalogSearchQuery({ title: 'Song', artist: 'Artist', genre: 'Jazz' })).toBe('Song Artist Jazz');
  });

  it('skips missing structured fields', () => {
    expect(buildCatalogSearchQuery({ artist: 'Solo Artist' })).toBe('Solo Artist');
  });
});

describe('searchMusicCatalog', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetchByUrl() as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('aggregates normalized results from every configured provider', async () => {
    const result = await searchMusicCatalog({ queryText: 'test', provider: 'all', limit: 10 });

    expect(result.providersQueried.sort()).toEqual(['jamendo', 'youtube']);
    expect(result.providersFailed).toEqual([]);
    expect(result.results).toHaveLength(2);

    const youtubeResult = result.results.find((r) => r.provider === 'youtube');
    expect(youtubeResult).toMatchObject({
      title: 'YT Song',
      artist: 'YT Artist',
      album: null,
      durationSeconds: 200,
      provider: 'youtube',
      providerTrackId: 'yt1',
      sourceUrl: 'https://www.youtube.com/watch?v=yt1',
    });

    const jamendoResult = result.results.find((r) => r.provider === 'jamendo');
    expect(jamendoResult).toMatchObject({
      title: 'Jamendo Song',
      artist: 'Jamendo Artist',
      album: 'Jamendo Album',
      durationSeconds: 180,
      provider: 'jamendo',
      providerTrackId: 'jm1',
      sourceUrl: 'https://jamendo.com/track/jm1',
    });
  });

  it('restricts to a single provider when requested', async () => {
    const result = await searchMusicCatalog({ queryText: 'test', provider: 'jamendo', limit: 10 });
    expect(result.providersQueried).toEqual(['jamendo']);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].provider).toBe('jamendo');
  });

  it('reports NOT_CONFIGURED for a provider missing its key, without failing the whole request', async () => {
    (env as { YOUTUBE_API_KEY: string }).YOUTUBE_API_KEY = '';

    const result = await searchMusicCatalog({ queryText: 'test', provider: 'all', limit: 10 });

    expect(result.providersFailed).toEqual([
      { provider: 'youtube', reason: 'NOT_CONFIGURED', message: 'youtube is not configured on this server.' },
    ]);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].provider).toBe('jamendo');

    (env as { YOUTUBE_API_KEY: string }).YOUTUBE_API_KEY = 'test-youtube-key';
  });

  it('falls back to the other provider when one rate-limits, reporting the failure honestly', async () => {
    global.fetch = vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (url.includes('youtube')) {
        return { ok: false, status: 429, json: async () => ({}) } as Response;
      }
      if (url.includes('jamendo')) {
        return { ok: true, json: async () => jamendoResponse } as Response;
      }
      throw new Error(`Unexpected fetch to ${url}`);
    }) as unknown as typeof fetch;

    const result = await searchMusicCatalog({ queryText: 'test', provider: 'all', limit: 10 });

    expect(result.providersFailed).toEqual([
      { provider: 'youtube', reason: 'RATE_LIMITED', message: 'YouTube search has hit its daily quota.' },
    ]);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].provider).toBe('jamendo');
  });

  it('returns empty results with no throw when a provider errors and nothing else is configured', async () => {
    (env as { JAMENDO_CLIENT_ID: string }).JAMENDO_CLIENT_ID = '';
    global.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response) as unknown as typeof fetch;

    const result = await searchMusicCatalog({ queryText: 'test', provider: 'all', limit: 10 });

    expect(result.results).toEqual([]);
    expect(result.providersFailed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: 'youtube', reason: 'PROVIDER_ERROR' }),
        expect.objectContaining({ provider: 'jamendo', reason: 'NOT_CONFIGURED' }),
      ]),
    );

    (env as { JAMENDO_CLIENT_ID: string }).JAMENDO_CLIENT_ID = 'test-jamendo-id';
  });
});
