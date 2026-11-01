import { useEffect } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

interface JamendoAudioPlayerProps {
  streamUrl: string;
  isPlaying: boolean;
  onEnded?: () => void;
}

/**
 * Headless real audio playback for the 'jamendo' MusicProvider via `expo-audio`'s native
 * player - a direct MP3 URL, no embedded player, no ToS-restricted content, unlike YouTube.
 * `useAudioPlayer` recreates its underlying player whenever `streamUrl` changes, so switching
 * tracks needs no manual `.replace()` call here. Renders nothing; the Music screen's own UI
 * (title/artist/controls) is the visible surface.
 */
export function JamendoAudioPlayer({ streamUrl, isPlaying, onEnded }: JamendoAudioPlayerProps) {
  const player = useAudioPlayer(streamUrl);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    // Always act on intent directly rather than gating on player.playing - that flag can lag
    // behind (e.g. still buffering right after a fresh play() call), which previously made a
    // quick pause() no-op because the guard saw playing:false and skipped calling pause().
    if (isPlaying) player.play();
    else player.pause();
  }, [isPlaying, player]);

  useEffect(() => {
    if (status.didJustFinish) onEnded?.();
  }, [status.didJustFinish, onEnded]);

  return null;
}
