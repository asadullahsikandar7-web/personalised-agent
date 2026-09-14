import { z } from 'zod';
import { defineTool } from '../types';

const inputSchema = z.object({
  timezone: z.string().trim().min(1).max(64).optional(),
});

export const getCurrentDatetimeTool = defineTool({
  name: 'get_current_datetime',
  description: "Get the current date and time, optionally in a specific IANA timezone. Use this before creating reminders that reference relative times like 'today' or 'tomorrow'.",
  inputSchema,
  permissionLevel: 'safe',
  async execute(input, context) {
    const timezone = input.timezone || context.timezone || 'UTC';
    const now = new Date();
    let formatted: string;
    try {
      formatted = now.toLocaleString('en-US', { timeZone: timezone, dateStyle: 'full', timeStyle: 'short' });
    } catch {
      formatted = now.toISOString();
    }
    return {
      success: true,
      message: `It is currently ${formatted} (${timezone}).`,
      data: { iso: now.toISOString(), timezone, formatted },
    };
  },
});
