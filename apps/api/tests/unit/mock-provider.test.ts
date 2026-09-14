import { describe, it, expect } from 'vitest';
import { MockProvider } from '../../src/ai/providers/mock-provider';
import type { AIToolDefinition } from '../../src/ai/providers/types';

const TOOLS: AIToolDefinition[] = [
  { name: 'create_reminder', description: 'd', parameters: {} },
  { name: 'create_task', description: 'd', parameters: {} },
  { name: 'remember_memory', description: 'd', parameters: {} },
  { name: 'get_current_datetime', description: 'd', parameters: {} },
  { name: 'music_play', description: 'd', parameters: {} },
];

describe('MockProvider', () => {
  const provider = new MockProvider();

  it('reports itself correctly', () => {
    expect(provider.getProviderName()).toBe('mock');
    expect(provider.supportsToolCalling()).toBe(true);
  });

  it('proposes create_reminder for a reminder-shaped request with a valid ISO datetime', async () => {
    const res = await provider.generateResponse({
      messages: [{ role: 'user', content: 'Remind me to study Data Structures at 7 PM.' }],
      tools: TOOLS,
    });
    expect(res.toolCalls).toHaveLength(1);
    expect(res.toolCalls[0]?.name).toBe('create_reminder');
    expect(res.finishReason).toBe('tool_calls');
    const args = res.toolCalls[0]?.arguments as { title: string; scheduledAt: string };
    // Must be a real ISO 8601 datetime the create_reminder tool schema will accept, not a raw
    // phrase like "7 PM" - a regression test for a bug caught during manual smoke testing.
    expect(() => new Date(args.scheduledAt).toISOString()).not.toThrow();
    expect(new Date(args.scheduledAt).getHours()).toBe(19);
    expect(args.title.toLowerCase()).toContain('data structures');
  });

  it('proposes create_task for a task-shaped request', async () => {
    const res = await provider.generateResponse({
      messages: [{ role: 'user', content: 'Create a task for finishing my Acadexa dashboard.' }],
      tools: TOOLS,
    });
    expect(res.toolCalls[0]?.name).toBe('create_task');
  });

  it('proposes remember_memory for a "remember that" request', async () => {
    const res = await provider.generateResponse({
      messages: [{ role: 'user', content: 'Remember that my preferred programming language is TypeScript.' }],
      tools: TOOLS,
    });
    expect(res.toolCalls[0]?.name).toBe('remember_memory');
  });

  it('never proposes a tool that was not offered', async () => {
    const res = await provider.generateResponse({
      messages: [{ role: 'user', content: 'Play my study playlist.' }],
      tools: [], // music_play withheld
    });
    expect(res.toolCalls).toHaveLength(0);
  });

  it('falls back to a direct answer with no matching intent', async () => {
    const res = await provider.generateResponse({
      messages: [{ role: 'user', content: 'How are you today?' }],
      tools: TOOLS,
    });
    expect(res.toolCalls).toHaveLength(0);
    expect(res.content.length).toBeGreaterThan(0);
    expect(res.finishReason).toBe('stop');
  });

  it('synthesizes a final reply from trailing tool-result messages', async () => {
    const res = await provider.generateResponse({
      messages: [
        { role: 'user', content: 'Create a task for X' },
        { role: 'assistant', content: '', toolCalls: [{ id: '1', name: 'create_task', arguments: {} }] },
        { role: 'tool', name: 'create_task', toolCallId: '1', content: JSON.stringify({ success: true, message: 'Task "X" created.' }) },
      ],
      tools: TOOLS,
    });
    expect(res.toolCalls).toHaveLength(0);
    expect(res.content).toContain('Task "X" created.');
  });
});
