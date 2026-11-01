import { z } from 'zod';
import { defineTool } from '../types';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';

const inputSchema = z.object({
  query: z.string().trim().min(1).max(300),
});

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
}

async function searchBrave(query: string): Promise<BraveWebResult[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', '5');

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': env.WEB_SEARCH_API_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`Brave Search API returned ${res.status}`);
  }

  const json = (await res.json()) as { web?: { results?: BraveWebResult[] } };
  return json.web?.results ?? [];
}

/**
 * Web search abstraction. Currently backed by the Brave Search API when
 * WEB_SEARCH_PROVIDER=brave and WEB_SEARCH_API_KEY are configured; otherwise this tool always
 * returns a clear "not configured" result rather than fabricating search results, per the
 * project rule that the agent must never pretend a tool succeeded when it did not.
 */
export const webSearchTool = defineTool({
  name: 'web_search',
  description: 'Search the public web for up-to-date information. Only available when a web search provider is configured on the backend.',
  inputSchema,
  permissionLevel: 'restricted',
  async execute(input) {
    if (!env.WEB_SEARCH_PROVIDER || !env.WEB_SEARCH_API_KEY) {
      return {
        success: false,
        message: 'Web search is not configured on this server yet. No search was performed.',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    if (env.WEB_SEARCH_PROVIDER !== 'brave') {
      return {
        success: false,
        message: `Web search provider "${env.WEB_SEARCH_PROVIDER}" is configured but not implemented. Only "brave" is supported.`,
        errorCode: 'NOT_IMPLEMENTED',
      };
    }

    try {
      const results = await searchBrave(input.query);
      return {
        success: true,
        message: results.length ? `Found ${results.length} results.` : 'No results found.',
        data: { results: results.map((r) => ({ title: r.title, url: r.url, snippet: r.description })) },
      };
    } catch (err) {
      logger.error({ err }, 'Brave web search failed');
      return {
        success: false,
        message: 'Web search failed while contacting the search provider.',
        errorCode: 'PROVIDER_ERROR',
      };
    }
  },
});
