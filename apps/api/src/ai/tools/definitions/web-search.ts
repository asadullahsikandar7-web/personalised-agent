import { z } from 'zod';
import { defineTool } from '../types';
import { env } from '../../../config/env';

const inputSchema = z.object({
  query: z.string().trim().min(1).max(300),
});

/**
 * Web search abstraction. No web search API is bundled by default (none was requested/approved
 * for this build). If WEB_SEARCH_PROVIDER + WEB_SEARCH_API_KEY are configured in the
 * environment, a real provider can be wired in here; until then this tool always returns a
 * clear "not configured" result rather than fabricating search results, per the project rule
 * that the agent must never pretend a tool succeeded when it did not.
 */
export const webSearchTool = defineTool({
  name: 'web_search',
  description: 'Search the public web for up-to-date information. Only available when a web search provider is configured on the backend.',
  inputSchema,
  permissionLevel: 'restricted',
  async execute() {
    if (!env.WEB_SEARCH_PROVIDER || !env.WEB_SEARCH_API_KEY) {
      return {
        success: false,
        message: 'Web search is not configured on this server yet. No search was performed.',
        errorCode: 'NOT_CONFIGURED',
      };
    }
    // Placeholder for a real provider integration (e.g. Bing/Brave/Serper). Intentionally not
    // implemented without an approved API key/provider - see docs/known-platform-limitations.md.
    return {
      success: false,
      message: `Web search provider "${env.WEB_SEARCH_PROVIDER}" is configured but not yet implemented.`,
      errorCode: 'NOT_IMPLEMENTED',
    };
  },
});
