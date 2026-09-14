import type { AIModelProvider, AIRequest, AIResponse, AIToolCall, AIMessage } from './types';
import { AIProviderError } from './types';
import { logger } from '../../utils/logger';

interface OllamaProviderOptions {
  baseUrl: string;
  model: string;
  timeoutMs?: number;
}

interface OllamaChatMessage {
  role: string;
  content: string;
  tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }>;
}

/**
 * Local model provider talking to an Ollama server's native /api/chat endpoint. This is the
 * reference implementation for "replace OpenAI with a self-hosted model" (see
 * docs/future-local-ai.md) - the rest of the app depends only on AIModelProvider, so switching
 * AI_PROVIDER=ollama in the environment is the only change required.
 *
 * Tool calling support depends on the underlying model advertising it (e.g. qwen3, llama3.1+);
 * models without tool-calling support will simply never emit tool_calls and the orchestrator
 * will treat the reply as a direct answer.
 */
export class OllamaProvider implements AIModelProvider {
  constructor(private options: OllamaProviderOptions) {}

  getProviderName(): string {
    return 'ollama';
  }

  supportsToolCalling(): boolean {
    return true;
  }

  async generateResponse(input: AIRequest): Promise<AIResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 60_000);

    try {
      const res = await fetch(`${this.options.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.options.model,
          stream: false,
          messages: input.messages.map(toOllamaMessage),
          tools: input.tools?.length
            ? input.tools.map((tool) => ({
                type: 'function',
                function: { name: tool.name, description: tool.description, parameters: tool.parameters },
              }))
            : undefined,
          options: { temperature: input.temperature ?? 0.4 },
        }),
      });

      if (!res.ok) {
        throw new AIProviderError(`Ollama request failed with status ${res.status}`, this.getProviderName());
      }

      const data = (await res.json()) as { message: OllamaChatMessage; done_reason?: string };
      const toolCalls: AIToolCall[] = (data.message.tool_calls ?? []).map((call, i) => ({
        id: `ollama-${Date.now()}-${i}`,
        name: call.function.name,
        arguments: call.function.arguments,
      }));

      return {
        content: data.message.content ?? '',
        toolCalls,
        finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
        providerName: this.getProviderName(),
      };
    } catch (err) {
      logger.error({ err }, 'Ollama provider request failed');
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError(
        err instanceof Error ? err.message : 'Unknown Ollama error',
        this.getProviderName(),
        err,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function toOllamaMessage(message: AIMessage): OllamaChatMessage {
  if (message.role === 'tool') {
    return { role: 'tool', content: message.content };
  }
  return { role: message.role, content: message.content };
}
