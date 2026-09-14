import { z } from 'zod';
import { defineTool } from '../types';
import * as musicService from '../../../modules/music/service';

export const musicPlayTool = defineTool({
  name: 'music_play',
  description: 'Start playing music (resumes the current track or starts the default playlist).',
  inputSchema: z.object({}),
  permissionLevel: 'safe',
  async execute(_input, context) {
    const result = await musicService.musicPlay(context.userId);
    return { success: result.success, message: result.message, data: result.state };
  },
});

export const musicPauseTool = defineTool({
  name: 'music_pause',
  description: 'Pause music playback.',
  inputSchema: z.object({}),
  permissionLevel: 'safe',
  async execute(_input, context) {
    const result = await musicService.musicPause(context.userId);
    return { success: result.success, message: result.message, data: result.state };
  },
});

export const musicResumeTool = defineTool({
  name: 'music_resume',
  description: 'Resume paused music playback.',
  inputSchema: z.object({}),
  permissionLevel: 'safe',
  async execute(_input, context) {
    const result = await musicService.musicResume(context.userId);
    return { success: result.success, message: result.message, data: result.state };
  },
});

export const musicNextTool = defineTool({
  name: 'music_next',
  description: 'Skip to the next track.',
  inputSchema: z.object({}),
  permissionLevel: 'safe',
  async execute(_input, context) {
    const result = await musicService.musicNext(context.userId);
    return { success: result.success, message: result.message, data: result.state };
  },
});

export const musicPreviousTool = defineTool({
  name: 'music_previous',
  description: 'Go back to the previous track.',
  inputSchema: z.object({}),
  permissionLevel: 'safe',
  async execute(_input, context) {
    const result = await musicService.musicPrevious(context.userId);
    return { success: result.success, message: result.message, data: result.state };
  },
});

export const musicSearchTool = defineTool({
  name: 'music_search',
  description: 'Search the available music catalog by title, artist, or album.',
  inputSchema: z.object({ query: z.string().trim().min(1).max(200) }),
  permissionLevel: 'safe',
  async execute(input, context) {
    const tracks = await musicService.musicSearch(context.userId, input.query);
    return { success: true, message: `Found ${tracks.length} track(s).`, data: tracks };
  },
});
