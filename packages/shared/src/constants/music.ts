export const MUSIC_PROVIDERS = ['mock', 'device_audio', 'spotify_deeplink', 'youtube', 'jamendo'] as const;
export type MusicProviderName = (typeof MUSIC_PROVIDERS)[number];

export const PLAYBACK_STATES = ['idle', 'playing', 'paused', 'stopped'] as const;
export type PlaybackStateName = (typeof PLAYBACK_STATES)[number];
