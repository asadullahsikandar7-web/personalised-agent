/**
 * Provider-independent AI abstraction. Nothing outside this `ai/` directory (the orchestration
 * engine, tool registry, or any route handler) may import the OpenAI SDK or any other vendor
 * SDK directly — everything talks to `AIModelProvider`. This is what lets us swap OpenAI for
 * Ollama or another local model later without touching mobile app, tools, memory, or
 * orchestration code (see docs/ai-provider.md and docs/future-local-ai.md).
 */

export type AIRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AIToolDefinition {
  name: string;
  description: string;
  /** JSON Schema (subset) describing the tool's input parameters. */
  parameters: Record<string, unknown>;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface AIMessage {
  role: AIRole;
  content: string;
  /** Present on assistant messages that requested tool calls. */
  toolCalls?: AIToolCall[];
  /** Present on tool-role messages: the id of the AIToolCall this result answers. */
  toolCallId?: string;
  /** Present on tool-role messages: the tool name, for providers that need it. */
  name?: string;
}

export interface AIRequest {
  messages: AIMessage[];
  tools?: AIToolDefinition[];
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIResponse {
  /** The assistant's natural-language reply. Empty string if the turn is tool-calls-only. */
  content: string;
  toolCalls: AIToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage?: AIUsage;
  providerName: string;
}

export interface AIModelProvider {
  generateResponse(input: AIRequest): Promise<AIResponse>;
  /** Optional: providers that support token streaming implement this. */
  streamResponse?(input: AIRequest, onToken: (token: string) => void): Promise<AIResponse>;
  supportsToolCalling(): boolean;
  getProviderName(): string;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly providerName: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}
