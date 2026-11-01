import type { MusicProvider } from './types';
import { MockMusicProvider } from './mock-music-provider';
import { YoutubeMusicProvider } from './youtube-music-provider';
import { JamendoMusicProvider } from './jamendo-music-provider';
import { env } from '../../../config/env';

let instance: MusicProvider | null = null;

/**
 * MockMusicProvider (fixed demo catalog) is the default. YoutubeMusicProvider takes priority
 * when YOUTUBE_API_KEY is configured - it has real mainstream/commercial catalog coverage
 * (Jamendo's Creative-Commons-only catalog never will), at the cost of a daily API quota and
 * occasional per-video embedding restrictions - see that provider's docstring.
 * JamendoMusicProvider is used instead when only JAMENDO_CLIENT_ID is set - real full-track
 * streaming, no OAuth, no embedding restrictions, but independent/CC artists only. The interface
 * is designed so any of these can be swapped for a future DeviceAudioProvider or
 * AndroidMediaControllerProvider without touching routes, the agent tool, or the mobile music
 * screen. See docs/music-integration.md.
 */
export function getMusicProvider(): MusicProvider {
  if (!instance) {
    if (env.YOUTUBE_API_KEY) instance = new YoutubeMusicProvider();
    else if (env.JAMENDO_CLIENT_ID) instance = new JamendoMusicProvider();
    else instance = new MockMusicProvider();
  }
  return instance;
}
