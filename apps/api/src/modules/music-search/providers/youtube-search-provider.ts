import { env } from '../../../config/env';
import type { NormalizedTrackDTO } from '@personal-agent/shared';
import { MusicSearchProviderError, type MusicSearchProvider } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YoutubeVideoItem {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
  };
  contentDetails?: { duration: string };
}

function parseIsoDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return null;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

async function fetchVideosByIds(ids: string[]): Promise<YoutubeVideoItem[]> {
  if (!ids.length) return [];
  const url = new URL(`${YOUTUBE_API_BASE}/videos`);
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('id', ids.join(','));
  url.searchParams.set('key', env.YOUTUBE_API_KEY);

  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`YouTube videos.list returned ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const json = (await res.json()) as { items?: YoutubeVideoItem[] };
  return json.items ?? [];
}

/**
 * Real search against the official YouTube Data API v3 - metadata only. `sourceUrl` is the
 * canonical watch page, not a stream/embed URL, so this stays search-only per this module's
 * "no playback yet" scope. See docs/music-search-module.md and modules/music/providers/
 * youtube-music-provider.ts for the (separate) provider that actually plays YouTube audio.
 */
export class YoutubeSearchProvider implements MusicSearchProvider {
  getProviderName(): 'youtube' {
    return 'youtube';
  }

  isConfigured(): boolean {
    return Boolean(env.YOUTUBE_API_KEY);
  }

  async search(query: string, limit: number): Promise<NormalizedTrackDTO[]> {
    try {
      const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('videoCategoryId', '10'); // Music
      searchUrl.searchParams.set('maxResults', String(limit));
      searchUrl.searchParams.set('key', env.YOUTUBE_API_KEY);

      const res = await fetch(searchUrl);
      if (!res.ok) {
        const err = new Error(`YouTube search.list returned ${res.status}`) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }
      const json = (await res.json()) as { items?: { id: { videoId: string } }[] };
      const videoIds = (json.items ?? []).map((item) => item.id.videoId).filter(Boolean);
      const videos = await fetchVideosByIds(videoIds);

      return videos.map((video) => ({
        title: video.snippet.title,
        artist: video.snippet.channelTitle,
        album: null,
        artwork: video.snippet.thumbnails?.high?.url ?? video.snippet.thumbnails?.medium?.url ?? video.snippet.thumbnails?.default?.url ?? null,
        durationSeconds: parseIsoDuration(video.contentDetails?.duration),
        provider: 'youtube' as const,
        providerTrackId: video.id,
        sourceUrl: `https://www.youtube.com/watch?v=${video.id}`,
      }));
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 429 || status === 403) {
        throw new MusicSearchProviderError('youtube', 'RATE_LIMITED', 'YouTube search has hit its daily quota.');
      }
      throw new MusicSearchProviderError('youtube', 'PROVIDER_ERROR', 'YouTube search failed.');
    }
  }
}
