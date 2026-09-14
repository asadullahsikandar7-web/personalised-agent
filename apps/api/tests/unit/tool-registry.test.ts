import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../../src/ai/tools/registry';
import { getToolRegistry } from '../../src/ai/tools';
import { defineTool } from '../../src/ai/tools/types';
import { z } from 'zod';

describe('ToolRegistry', () => {
  it('registers and retrieves a tool by name', () => {
    const registry = new ToolRegistry();
    const tool = defineTool({
      name: 'noop',
      description: 'does nothing',
      inputSchema: z.object({}),
      permissionLevel: 'safe',
      async execute() {
        return { success: true, message: 'ok' };
      },
    });
    registry.register(tool);
    expect(registry.get('noop')).toBe(tool);
    expect(registry.has('noop')).toBe(true);
    expect(registry.names()).toContain('noop');
  });

  it('throws when registering a duplicate tool name', () => {
    const registry = new ToolRegistry();
    const tool = defineTool({
      name: 'dup',
      description: 'd',
      inputSchema: z.object({}),
      permissionLevel: 'safe',
      async execute() {
        return { success: true, message: 'ok' };
      },
    });
    registry.register(tool);
    expect(() => registry.register(tool)).toThrow();
  });

  it('returns undefined for an unknown tool', () => {
    const registry = new ToolRegistry();
    expect(registry.get('does-not-exist')).toBeUndefined();
  });
});

describe('default application tool registry', () => {
  it('includes every documented initial tool', () => {
    const names = getToolRegistry().names();
    const expected = [
      'get_current_datetime',
      'calculator',
      'web_search',
      'open_url',
      'create_note',
      'list_notes',
      'update_note',
      'delete_note',
      'remember_memory',
      'list_memories',
      'update_memory',
      'delete_memory',
      'create_task',
      'list_tasks',
      'update_task',
      'complete_task',
      'delete_task',
      'create_reminder',
      'list_reminders',
      'update_reminder',
      'cancel_reminder',
      'snooze_reminder',
      'complete_reminder',
      'music_play',
      'music_pause',
      'music_resume',
      'music_next',
      'music_previous',
      'music_search',
      'get_activity',
      'send_message',
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('marks destructive/sensitive tools as approval_required', () => {
    const registry = getToolRegistry();
    expect(registry.get('delete_task')?.permissionLevel).toBe('approval_required');
    expect(registry.get('delete_note')?.permissionLevel).toBe('approval_required');
    expect(registry.get('delete_memory')?.permissionLevel).toBe('approval_required');
    expect(registry.get('send_message')?.permissionLevel).toBe('approval_required');
  });
});
