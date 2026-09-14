import { env } from '../../config/env';
import type { AIModelProvider } from './types';
import { OpenAIProvider } from './openai-provider';
import { MockProvider } from './mock-provider';
import { OllamaProvider } from './ollama-provider';
import { logger } from '../../utils/logger';

let cachedProvider: AIModelProvider | null = null;

/**
 * Single seam that decides which AIModelProvider implementation backs the whole application.
 * Everything else (orchestration, tool registry, routes) depends only on the AIModelProvider
 * interface returned here - swapping providers is a one-line env change, never a code change.
 */
export function getAIProvider(): AIModelProvider {
  if (cachedProvider) return cachedProvider;

  switch (env.AI_PROVIDER) {
    case 'openai':
      if (!env.OPENAI_API_KEY) {
        logger.warn('AI_PROVIDER=openai but OPENAI_API_KEY is empty - falling back to MockProvider');
        cachedProvider = new MockProvider();
      } else {
        cachedProvider = new OpenAIProvider({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL });
      }
      break;
    case 'ollama':
      cachedProvider = new OllamaProvider({ baseUrl: env.OLLAMA_BASE_URL, model: env.OLLAMA_MODEL });
      break;
    case 'mock':
    default:
      cachedProvider = new MockProvider();
      break;
  }

  logger.info({ provider: cachedProvider.getProviderName() }, 'AI provider initialized');
  return cachedProvider;
}

/** Test-only hook to reset the cached singleton between test files. */
export function __resetProviderCacheForTests(): void {
  cachedProvider = null;
}
