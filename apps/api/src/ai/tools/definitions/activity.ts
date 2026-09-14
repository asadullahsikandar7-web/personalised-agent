import { z } from 'zod';
import { defineTool } from '../types';
import { listActivity } from '../../../modules/activity/service';

export const getActivityTool = defineTool({
  name: 'get_activity',
  description: "Get the user's recent agent/tool activity history.",
  inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional() }),
  permissionLevel: 'safe',
  async execute(input, context) {
    const result = await listActivity(context.userId, 1, input.limit ?? 10);
    return { success: true, message: `Here are your ${result.items.length} most recent activities.`, data: result.items };
  },
});
