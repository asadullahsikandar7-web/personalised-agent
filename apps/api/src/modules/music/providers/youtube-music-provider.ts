import { MusicPlaybackModel } from '../../../db/models';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { AppError } from '../../../utils/errors';
import type { MusicProvider, MusicResult, MusicTrack, PlaybackState } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YoutubeSnippet {
  title: string;
  channelTitle: string;
  thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
}

interface YoutubeVideoItem {
  id: string;
  snippet: YoutubeSnippet;
  contentDetails?: { duration: string };
}

/** Parses an ISO 8601 duration (e.g. "PT3M42S") into whole seconds. */
function parseIsoDuration(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return undefined;
  const [, h, m, s] = match;
  return (Number(h ?? 0) * 3600) + (Number(m ?? 0) * 60) + Number(s ?? 0);
}

function toMusicTrack(item: YoutubeVideoItem): MusicTrack {
  return {
    id: item.id,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    durationSeconds: parseIsoDuration(item.contentDetails?.duration),
    artworkUrl: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url,
  };
}

async function fetchVideosByIds(ids: string[]): Promise<YoutubeVideoItem[]> {
  if (!ids.length) return [];
  const url = new URL(`${YOUTUBE_API_BASE}/videos`);
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('id', ids.join(','));
  url.searchParams.set('key', env.YOUTUBE_API_KEY);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube videos.list returned ${res.status}`);
  const json = (await res.json()) as { items?: YoutubeVideoItem[] };
  return json.items ?? [];
}

async function searchYoutube(query: string): Promise<MusicTrack[]> {
  const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('videoCategoryId', '10'); // Music
  searchUrl.searchParams.set('maxResults', '10');
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
  return videos.map(toMusicTrack);
}

async function getOrCreatePlayback(userId: string) {
  let doc = await MusicPlaybackModel.findOne({ userId });
  if (!doc) {
    doc = await MusicPlaybackModel.create({ userId, provider: 'youtube', state: 'idle' });
  } else if (doc.provider !== 'youtube') {
    doc.provider = 'youtube';
  }
  return doc;
}

function toPlaybackState(doc: Awaited<ReturnType<typeof getOrCreatePlayback>>): PlaybackState {
  return {
    provider: 'youtube',
    state: doc.state as PlaybackState['state'],
    currentTrack: (doc.currentTrack as MusicTrack | null | undefined) ?? null,
    positionSeconds: doc.positionSeconds,
    volume: doc.volume,
  };
}

/**
 * Real YouTube Data API v3 search + queue/state tracking, backed by MongoDB per user (same
 * shape as MockMusicProvider). The Data API only returns metadata - it cannot stream audio, and
 * extracting raw audio/video streams outside the official player violates YouTube's Terms of
 * Service. Actual playback happens on-device via the official YouTube IFrame Player embedded in
 * the mobile app (`src/components/YoutubePlayer.tsx`), which reads `currentTrack.id` (a video
 * ID) and `state` from this provider and mirrors them - this provider is the source of truth for
 * *what* should be playing, not the audio pipeline itself.
 */
export class YoutubeMusicProvider implements MusicProvider {
  getProviderName(): 'youtube' {
    return 'youtube';
  }

  async getPlaybackState(userId: string): Promise<PlaybackState> {
    const doc = await getOrCreatePlayback(userId);
    return toPlaybackState(doc);
  }

  async play(userId: string): Promise<MusicResult> {
    const doc = await getOrCreatePlayback(userId);
    if (!doc.currentTrack) {
      return { success: false, message: 'No track selected yet - search and pick a track first.', state: toPlaybackState(doc) };
    }
    doc.state = 'playing';
    await doc.save();
    return { success: true, message: `Playing "${doc.currentTrack.title}"`, state: toPlaybackState(doc) };
  }

  async pause(userId: string): Promise<MusicResult> {
    const doc = await getOrCreatePlayback(userId);
    if (doc.state !== 'playing') {
      return { success: true, message: 'Music is already paused', state: toPlaybackState(doc) };
    }
    doc.state = 'paused';
    await doc.save();
    return { success: true, message: 'Paused', state: toPlaybackState(doc) };
  }

  async resume(userId: string): Promise<MusicResult> {
    return this.play(userId);
  }

  async next(userId: string): Promise<MusicResult> {
    const doc = await getOrCreatePlayback(userId);
    const currentIndex = doc.history.findIndex((h) => h.id === doc.currentTrack?.id);
    if (currentIndex <= 0) {
      return { success: false, message: 'No next track in your recent queue - search and pick another track.', state: toPlaybackState(doc) };
    }
    const track = doc.history[currentIndex - 1];
    doc.currentTrack = track;
    doc.state = 'playing';
    doc.positionSeconds = 0;
    await doc.save();
    return { success: true, message: `Now playing "${track?.title}"`, state: toPlaybackState(doc) };
  }

  async previous(userId: string): Promise<MusicResult> {
    const doc = await getOrCreatePlayback(userId);
    const currentIndex = doc.history.findIndex((h) => h.id === doc.currentTrack?.id);
    if (currentIndex === -1 || currentIndex >= doc.history.length - 1) {
      return { success: false, message: 'No previous track in your recent queue.', state: toPlaybackState(doc) };
    }
    const track = doc.history[currentIndex + 1];
    doc.currentTrack = track;
    doc.state = 'playing';
    doc.positionSeconds = 0;
    await doc.save();
    return { success: true, message: `Now playing "${track?.title}"`, state: toPlaybackState(doc) };
  }

  async search(_userId: string, query: string): Promise<MusicTrack[]> {
    try {
      return await searchYoutube(query);
    } catch (err) {
      logger.error({ err, query }, 'YouTube search failed');
      const status = (err as { status?: number }).status;
      if (status === 429 || status === 403) {
        throw AppError.provider('YouTube search is temporarily unavailable - the API key has hit its daily quota. Try again later.');
      }
      throw AppError.provider('YouTube search failed. Please try again.');
    }
  }

  async playTrack(userId: string, trackId: string): Promise<MusicResult> {
    const doc = await getOrCreatePlayback(userId);
    const [video] = await fetchVideosByIds([trackId]);
    if (!video) return { success: false, message: 'Video not found', state: toPlaybackState(doc) };

    const track = toMusicTrack(video);
    doc.currentTrack = track;
    doc.state = 'playing';
    doc.positionSeconds = 0;
    doc.history = [track, ...doc.history.filter((h) => h.id !== track.id)].slice(0, 20) as typeof doc.history;
    await doc.save();
    return { success: true, message: `Playing "${track.title}"`, state: toPlaybackState(doc) };
  }
}
