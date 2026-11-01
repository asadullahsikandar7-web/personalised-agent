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
      'search_music_catalog',
      'get_activity',
      'send_message',
      'get_robot_status',
      'get_robot_battery',
      'get_robot_sensors',
      'get_robot_distance',
      'move_robot',
      'turn_robot',
      'stop_robot',
      'set_robot_speed',
      'capture_robot_image',
      'get_robot_camera_status',
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

  it('marks robot movement tools restricted and read-only/stop tools safe', () => {
    const registry = getToolRegistry();
    expect(registry.get('move_robot')?.permissionLevel).toBe('restricted');
    expect(registry.get('turn_robot')?.permissionLevel).toBe('restricted');
    expect(registry.get('set_robot_speed')?.permissionLevel).toBe('restricted');
    expect(registry.get('stop_robot')?.permissionLevel).toBe('safe');
    expect(registry.get('get_robot_status')?.permissionLevel).toBe('safe');
    expect(registry.get('get_robot_battery')?.permissionLevel).toBe('safe');
    expect(registry.get('capture_robot_image')?.permissionLevel).toBe('safe');
  });
});
