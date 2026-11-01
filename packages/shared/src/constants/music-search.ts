export const MUSIC_SEARCH_PROVIDERS = ['youtube', 'jamendo'] as const;
export type MusicSearchProviderName = (typeof MUSIC_SEARCH_PROVIDERS)[number];
