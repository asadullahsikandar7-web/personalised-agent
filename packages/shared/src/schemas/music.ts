import { z } from 'zod';

export const musicSearchQuerySchema = z.object({
  query: z.string().trim().min(1).max(200),
});
export type MusicSearchQuery = z.infer<typeof musicSearchQuerySchema>;

export const playTrackSchema = z.object({
  trackId: z.string().trim().min(1),
});
export type PlayTrackInput = z.infer<typeof playTrackSchema>;
