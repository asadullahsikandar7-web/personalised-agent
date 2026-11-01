import { MusicPlaybackModel } from '../../../db/models';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { AppError } from '../../../utils/errors';
import type { MusicProvider, MusicResult, MusicTrack, PlaybackState } from './types';

const JAMENDO_API_BASE = 'https://api.jamendo.com/v3.0';

interface JamendoTrack {
  id: string;
  name: string;
  artist_name: string;
  album_name?: string;
  duration?: number;
  image?: string;
  audio?: string;
}

function toMusicTrack(track: JamendoTrack): MusicTrack {
  return {
    id: track.id,
    title: track.name,
    artist: track.artist_name,
    album: track.album_name || undefined,
    durationSeconds: track.duration,
    artworkUrl: track.image,
    streamUrl: track.audio,
  };
}

async function jamendoRequest(params: Record<string, string>): Promise<JamendoTrack[]> {
  const url = new URL(`${JAMENDO_API_BASE}/tracks/`);
  url.searchParams.set('client_id', env.JAMENDO_CLIENT_ID);
  url.searchParams.set('format', 'json');
  url.searchParams.set('audioformat', 'mp32');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Jamendo API returned ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const json = (await res.json()) as { results?: JamendoTrack[] };
  return json.results ?? [];
}

async function getOrCreatePlayback(userId: string) {
  let doc = await MusicPlaybackModel.findOne({ userId });
  if (!doc) {
    doc = await MusicPlaybackModel.create({ userId, provider: 'jamendo', state: 'idle' });
  } else if (doc.provider !== 'jamendo') {
    doc.provider = 'jamendo';
  }
  return doc;
}

function toPlaybackState(doc: Awaited<ReturnType<typeof getOrCreatePlayback>>): PlaybackState {
  return {
    provider: 'jamendo',
    state: doc.state as PlaybackState['state'],
    currentTrack: (doc.currentTrack as MusicTrack | null | undefined) ?? null,
    positionSeconds: doc.positionSeconds,
    volume: doc.volume,
  };
}

/**
 * Real full-track search + streaming via the Jamendo API. Unlike YouTube, Jamendo's catalog is
 * entirely Creative-Commons-licensed independent music, so every track is legally streamable
 * with no embedding restrictions and no OAuth flow - just a free `client_id` from
 * developer.jamendo.com. `search()` returns a direct MP3 `streamUrl` per track, so playback on
 * the mobile client is a real native audio player (`expo-audio`), not an embedded video player.
 */
export class JamendoMusicProvider implements MusicProvider {
  getProviderName(): 'jamendo' {
    return 'jamendo';
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
      const tracks = await jamendoRequest({ search: query, limit: '15' });
      return tracks.filter((t) => t.audio).map(toMusicTrack);
    } catch (err) {
      logger.error({ err, query }, 'Jamendo search failed');
      const status = (err as { status?: number }).status;
      if (status === 429) {
        throw AppError.provider('Jamendo search is temporarily rate-limited. Try again shortly.');
      }
      throw AppError.provider('Jamendo search failed. Please try again.');
    }
  }

  async playTrack(userId: string, trackId: string): Promise<MusicResult> {
    const doc = await getOrCreatePlayback(userId);
    const [jamendoTrack] = await jamendoRequest({ id: trackId });
    if (!jamendoTrack || !jamendoTrack.audio) {
      return { success: false, message: 'Track not found', state: toPlaybackState(doc) };
    }

    const track = toMusicTrack(jamendoTrack);
    doc.currentTrack = track;
    doc.state = 'playing';
    doc.positionSeconds = 0;
    doc.history = [track, ...doc.history.filter((h) => h.id !== track.id)].slice(0, 20) as typeof doc.history;
    await doc.save();
    return { success: true, message: `Playing "${track.title}"`, state: toPlaybackState(doc) };
  }
}
