import { z } from 'zod';
import { defineTool } from '../types';

const inputSchema = z.object({
  url: z.string().trim().url().max(2000),
});

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export const openUrlTool = defineTool({
  name: 'open_url',
  description: 'Validate and return a URL for the mobile app to open. Only http(s) URLs are allowed.',
  inputSchema,
  permissionLevel: 'normal',
  describeAction: (input) => `Open URL: ${input.url}`,
  async execute(input) {
    let parsed: URL;
    try {
      parsed = new URL(input.url);
    } catch {
      return { success: false, message: 'That is not a valid URL.', errorCode: 'INVALID_INPUT' };
    }
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return { success: false, message: `URLs with protocol "${parsed.protocol}" are not allowed.`, errorCode: 'INVALID_INPUT' };
    }
    return {
      success: true,
      message: `Ready to open ${parsed.href}`,
      data: { url: parsed.href },
    };
  },
});
