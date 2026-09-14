import OpenAI from 'openai';
import type {
  AIModelProvider,
  AIRequest,
  AIResponse,
  AIToolCall,
  AIMessage,
} from './types';
import { AIProviderError } from './types';
import { logger } from '../../utils/logger';

interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  /** Milliseconds before an OpenAI call is aborted. */
  timeoutMs?: number;
  maxRetries?: number;
}

/**
 * OpenAI implementation of AIModelProvider using the Chat Completions API with function
 * (tool) calling. Kept isolated behind AIModelProvider so orchestration code never touches
 * the OpenAI SDK directly - see docs/ai-provider.md.
 */
export class OpenAIProvider implements AIModelProvider {
  private client: OpenAI;
  private model: string;

  constructor(options: OpenAIProviderOptions) {
    if (!options.apiKey) {
      throw new Error('OpenAIProvider requires an API key (set OPENAI_API_KEY)');
    }
    this.client = new OpenAI({
      apiKey: options.apiKey,
      timeout: options.timeoutMs ?? 30_000,
      maxRetries: options.maxRetries ?? 2,
    });
    this.model = options.model;
  }

  getProviderName(): string {
    return 'openai';
  }

  supportsToolCalling(): boolean {
    return true;
  }

  async generateResponse(input: AIRequest): Promise<AIResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: input.temperature ?? 0.4,
        max_tokens: input.maxOutputTokens ?? 800,
        messages: input.messages.map(toOpenAIMessage),
        tools: input.tools?.length
          ? input.tools.map((tool) => ({
              type: 'function' as const,
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              },
            }))
          : undefined,
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new AIProviderError('OpenAI returned no choices', this.getProviderName());
      }

      const toolCalls: AIToolCall[] = (choice.message.tool_calls ?? []).map((call) => ({
        id: call.id,
        name: call.function.name,
        arguments: safeJsonParse(call.function.arguments),
      }));

      return {
        content: choice.message.content ?? '',
        toolCalls,
        finishReason: mapFinishReason(choice.finish_reason),
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
        providerName: this.getProviderName(),
      };
    } catch (err) {
      logger.error({ err }, 'OpenAI provider request failed');
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError(
        err instanceof Error ? err.message : 'Unknown OpenAI error',
        this.getProviderName(),
        err,
      );
    }
  }

  async streamResponse(
    input: AIRequest,
    onToken: (token: string) => void,
  ): Promise<AIResponse> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        temperature: input.temperature ?? 0.4,
        max_tokens: input.maxOutputTokens ?? 800,
        messages: input.messages.map(toOpenAIMessage),
        tools: input.tools?.length
          ? input.tools.map((tool) => ({
              type: 'function' as const,
              function: { name: tool.name, description: tool.description, parameters: tool.parameters },
            }))
          : undefined,
        stream: true,
      });

      let content = '';
      const toolCallBuffers = new Map<number, { id: string; name: string; args: string }>();
      let finishReason: AIResponse['finishReason'] = 'stop';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          content += delta.content;
          onToken(delta.content);
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = toolCallBuffers.get(tc.index) ?? { id: '', name: '', args: '' };
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) existing.args += tc.function.arguments;
            toolCallBuffers.set(tc.index, existing);
          }
        }
        const rawFinish = chunk.choices[0]?.finish_reason;
        if (rawFinish) finishReason = mapFinishReason(rawFinish);
      }

      const toolCalls: AIToolCall[] = Array.from(toolCallBuffers.values()).map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: safeJsonParse(tc.args),
      }));

      return { content, toolCalls, finishReason, providerName: this.getProviderName() };
    } catch (err) {
      logger.error({ err }, 'OpenAI provider stream failed');
      throw new AIProviderError(
        err instanceof Error ? err.message : 'Unknown OpenAI streaming error',
        this.getProviderName(),
        err,
      );
    }
  }
}

function toOpenAIMessage(message: AIMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      content: message.content,
      tool_call_id: message.toolCallId ?? '',
    };
  }
  if (message.role === 'assistant' && message.toolCalls?.length) {
    return {
      role: 'assistant',
      content: message.content || null,
      tool_calls: message.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
      })),
    };
  }
  return { role: message.role as 'system' | 'user' | 'assistant', content: message.content };
}

function mapFinishReason(reason: string | null): AIResponse['finishReason'] {
  switch (reason) {
    case 'tool_calls':
      return 'tool_calls';
    case 'length':
      return 'length';
    case 'stop':
    default:
      return 'stop';
  }
}

function safeJsonParse(raw: string): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
