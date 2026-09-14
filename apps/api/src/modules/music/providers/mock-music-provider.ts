import { MusicPlaybackModel } from '../../../db/models';
import type { MusicProvider, MusicResult, MusicTrack, PlaybackState } from './types';

/**
 * In-memory-backed (persisted per user in Mongo) mock music catalog and playback state, used
 * for development and tests, and as the default until a real provider (device-owned audio
 * playback, or a native Android MediaController bridge) is wired in.
 */
const MOCK_CATALOG: MusicTrack[] = [
  { id: 't1', title: 'Deep Focus', artist: 'Study Beats', album: 'Focus Vol. 1', durationSeconds: 245 },
  { id: 't2', title: 'Late Night Coding', artist: 'Lo-Fi Collective', album: 'Sessions', durationSeconds: 198 },
  { id: 't3', title: 'Morning Momentum', artist: 'Ambient Works', album: 'Rise', durationSeconds: 210 },
  { id: 't4', title: 'Calm Data Structures', artist: 'Study Beats', album: 'Focus Vol. 1', durationSeconds: 260 },
];

async function getOrCreatePlayback(userId: string) {
  let doc = await MusicPlaybackModel.findOne({ userId });
  if (!doc) {
    doc = await MusicPlaybackModel.create({ userId, provider: 'mock', state: 'idle' });
  }
  return doc;
}

function toPlaybackState(doc: Awaited<ReturnType<typeof getOrCreatePlayback>>): PlaybackState {
  return {
    provider: 'mock',
    state: doc.state as PlaybackState['state'],
    currentTrack: (doc.currentTrack as MusicTrack | null | undefined) ?? null,
    positionSeconds: doc.positionSeconds,
    volume: doc.volume,
  };
}

export class MockMusicProvider implements MusicProvider {
  getProviderName(): 'mock' {
    return 'mock';
  }

  async getPlaybackState(userId: string): Promise<PlaybackState> {
    const doc = await getOrCreatePlayback(userId);
    return toPlaybackState(doc);
  }

  async play(userId: string): Promise<MusicResult> {
    const doc = await getOrCreatePlayback(userId);
    const track = doc.currentTrack ?? MOCK_CATALOG[0];
    doc.currentTrack = track;
    doc.state = 'playing';
    doc.positionSeconds = 0;
    if (track && !doc.history.some((h) => h.id === track.id)) {
      doc.history = [track, ...doc.history].slice(0, 20) as typeof doc.history;
    }
    await doc.save();
    return { success: true, message: `Playing "${track?.title}"`, state: toPlaybackState(doc) };
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
    const doc = await getOrCreatePlayback(userId);
    if (!doc.currentTrack) return this.play(userId);
    doc.state = 'playing';
    await doc.save();
    return { success: true, message: `Resumed "${doc.currentTrack.title}"`, state: toPlaybackState(doc) };
  }

  async next(userId: string): Promise<MusicResult> {
    const doc = await getOrCreatePlayback(userId);
    const currentIndex = MOCK_CATALOG.findIndex((t) => t.id === doc.currentTrack?.id);
    const track = MOCK_CATALOG[(currentIndex + 1) % MOCK_CATALOG.length];
    doc.currentTrack = track;
    doc.state = 'playing';
    doc.positionSeconds = 0;
    await doc.save();
    return { success: true, message: `Now playing "${track?.title}"`, state: toPlaybackState(doc) };
  }

  async previous(userId: string): Promise<MusicResult> {
    const doc = await getOrCreatePlayback(userId);
    const currentIndex = MOCK_CATALOG.findIndex((t) => t.id === doc.currentTrack?.id);
    const idx = currentIndex <= 0 ? MOCK_CATALOG.length - 1 : currentIndex - 1;
    const track = MOCK_CATALOG[idx];
    doc.currentTrack = track;
    doc.state = 'playing';
    doc.positionSeconds = 0;
    await doc.save();
    return { success: true, message: `Now playing "${track?.title}"`, state: toPlaybackState(doc) };
  }

  async search(_userId: string, query: string): Promise<MusicTrack[]> {
    const q = query.toLowerCase();
    return MOCK_CATALOG.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album?.toLowerCase().includes(q),
    );
  }

  async playTrack(userId: string, trackId: string): Promise<MusicResult> {
    const track = MOCK_CATALOG.find((t) => t.id === trackId);
    if (!track) return { success: false, message: 'Track not found' };
    const doc = await getOrCreatePlayback(userId);
    doc.currentTrack = track;
    doc.state = 'playing';
    doc.positionSeconds = 0;
    doc.history = [track, ...doc.history.filter((h) => h.id !== track.id)].slice(0, 20) as typeof doc.history;
    await doc.save();
    return { success: true, message: `Playing "${track.title}"`, state: toPlaybackState(doc) };
  }
}
