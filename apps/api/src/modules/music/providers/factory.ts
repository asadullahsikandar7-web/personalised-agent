import type { MusicProvider } from './types';
import { MockMusicProvider } from './mock-music-provider';

let instance: MusicProvider | null = null;

/**
 * Only MockMusicProvider is implemented today. The interface is designed so a future
 * DeviceAudioProvider (app-owned audio playback via expo-av/expo-audio) or an
 * AndroidMediaControllerProvider (native module bridging Android's MediaSession APIs) can be
 * swapped in without touching routes, the agent tool, or the mobile music screen. See
 * docs/music-integration.md.
 */
export function getMusicProvider(): MusicProvider {
  if (!instance) instance = new MockMusicProvider();
  return instance;
}
