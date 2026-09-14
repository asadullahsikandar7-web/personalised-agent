import type { AIModelProvider, AIRequest, AIResponse, AIToolCall } from './types';
import { randomUUID } from 'node:crypto';

/**
 * Deterministic, offline provider used for local development, CI, and unit/integration tests
 * where no OpenAI API key is configured. It performs light pattern-matching over the latest
 * user message to decide whether to answer directly or propose tool calls, so the full
 * orchestration -> tool-registry -> approval pipeline can be exercised end-to-end without any
 * network access or vendor API key.
 */
export class MockProvider implements AIModelProvider {
  getProviderName(): string {
    return 'mock';
  }

  supportsToolCalling(): boolean {
    return true;
  }

  async generateResponse(input: AIRequest): Promise<AIResponse> {
    // Synthesis pass: the orchestrator appends tool-role messages after executing tool calls and
    // asks the provider for a final natural-language reply. A real LLM reads those results and
    // writes prose; the mock provider summarizes them directly instead.
    const lastMessage = input.messages[input.messages.length - 1];
    if (lastMessage?.role === 'tool') {
      const toolMessages = [...input.messages].reverse();
      const trailing: typeof input.messages = [];
      for (const m of toolMessages) {
        if (m.role !== 'tool') break;
        trailing.unshift(m);
      }
      return {
        content: summarizeToolResults(trailing),
        toolCalls: [],
        finishReason: 'stop',
        providerName: this.getProviderName(),
      };
    }

    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user');
    const text = (lastUser?.content ?? '').trim();
    const lower = text.toLowerCase();
    const availableTools = new Set((input.tools ?? []).map((t) => t.name));

    const toolCalls: AIToolCall[] = [];
    let content = '';

    const has = (name: string) => availableTools.has(name);

    if (has('get_current_datetime') && /\b(what.*time|what.*date|current time|today'?s date)\b/i.test(lower)) {
      toolCalls.push(makeCall('get_current_datetime', {}));
    } else if (has('create_reminder') && /\bremind me\b|\bset a reminder\b|\breminder\b.*\bat\b/i.test(lower)) {
      toolCalls.push(makeCall('create_reminder', extractReminder(text)));
    } else if (has('list_reminders') && /\bwhat.*scheduled\b|\bupcoming reminders\b|\bmy reminders\b/i.test(lower)) {
      toolCalls.push(makeCall('list_reminders', {}));
    } else if (has('create_task') && /\bcreate a task\b|\badd a task\b|\bnew task\b/i.test(lower)) {
      toolCalls.push(makeCall('create_task', extractTask(text)));
    } else if (has('list_tasks') && /\bpending tasks\b|\bmy tasks\b|\bsummarize.*tasks\b/i.test(lower)) {
      toolCalls.push(makeCall('list_tasks', {}));
    } else if (has('remember_memory') && /\bremember that\b|\bremember my\b|\bremember i\b/i.test(lower)) {
      toolCalls.push(makeCall('remember_memory', extractMemory(text)));
    } else if (has('list_memories') && /\bwhat did i ask you to remember\b|\bmy memories\b/i.test(lower)) {
      toolCalls.push(makeCall('list_memories', {}));
    } else if (has('calculator') && /^[\s\d+\-*/().]+$|\bcalculate\b|\bwhat is\b.*[\d]/i.test(lower) && /[\d]/.test(lower)) {
      const expr = extractMathExpression(text);
      if (expr) toolCalls.push(makeCall('calculator', { expression: expr }));
    } else if (has('music_play') && /\bplay\b.*\bmusic\b|\bplay my\b|\bplay a?\s*playlist\b/i.test(lower)) {
      toolCalls.push(makeCall('music_play', {}));
    } else if (has('music_pause') && /\bpause\b(.*music)?\b|\bstop the music\b/i.test(lower)) {
      toolCalls.push(makeCall('music_pause', {}));
    } else if (has('get_activity') && /\brecent (agent )?activity\b/i.test(lower)) {
      toolCalls.push(makeCall('get_activity', {}));
    } else if (has('send_message') && /\bsend (this|a) message\b/i.test(lower)) {
      toolCalls.push(makeCall('send_message', { body: text }));
    } else if (has('web_search') && /\bsearch (the web|online) for\b/i.test(lower)) {
      toolCalls.push(makeCall('web_search', { query: text.replace(/.*search (the web|online) for/i, '').trim() }));
    } else {
      content = buildFallbackReply(text);
    }

    return {
      content,
      toolCalls,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      providerName: this.getProviderName(),
    };
  }

  async streamResponse(input: AIRequest, onToken: (token: string) => void): Promise<AIResponse> {
    const result = await this.generateResponse(input);
    if (result.content) {
      for (const word of result.content.split(' ')) {
        onToken(word + ' ');
      }
    }
    return result;
  }
}

function makeCall(name: string, args: unknown): AIToolCall {
  return { id: randomUUID(), name, arguments: args };
}

function summarizeToolResults(toolMessages: { content: string; name?: string }[]): string {
  const parts = toolMessages.map((m) => {
    try {
      const parsed = JSON.parse(m.content) as { success?: boolean; message?: string };
      return parsed.message ?? m.content;
    } catch {
      return m.content;
    }
  });
  return parts.join(' ');
}

function buildFallbackReply(text: string): string {
  if (!text) return "I didn't catch that - could you say it again?";
  return `I heard: "${text}". I can create tasks and reminders, remember information, check your schedule, control basic music playback, or just chat. What would you like me to do?`;
}

function extractReminder(text: string): { title: string; scheduledAtText: string } {
  const atMatch = text.match(/\bat\s+([\d: apmAPM]+)/);
  const forMatch = text.match(/(?:remind me to|reminder to)\s+(.*?)(?:\s+at\s+|\s+tomorrow|\s+today|$)/i);
  return {
    title: forMatch?.[1]?.trim() || text,
    scheduledAtText: atMatch?.[1]?.trim() || 'unspecified',
  };
}

function extractTask(text: string): { title: string } {
  const match = text.match(/(?:create a task(?: called| for| to)?|add a task(?: called| for| to)?)\s+(.*)/i);
  return { title: match?.[1]?.trim().replace(/^["']|["']$/g, '') || text };
}

function extractMemory(text: string): { key: string; value: string } {
  const match = text.match(/remember (?:that\s+)?(.*)/i);
  const value = match?.[1]?.trim() || text;
  return { key: value.slice(0, 60), value };
}

function extractMathExpression(text: string): string | null {
  const match = text.match(/[\d.\s+\-*/()]{2,}/);
  return match ? match[0].trim() : null;
}
