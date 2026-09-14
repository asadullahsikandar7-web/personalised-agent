import { z } from 'zod';
import { defineTool } from '../types';
import * as memoryService from '../../../modules/memory/service';
import { MEMORY_CATEGORIES } from '@personal-agent/shared';

export const rememberMemoryTool = defineTool({
  name: 'remember_memory',
  description: 'Save a piece of information the user wants remembered for later (preferences, personal info, projects, goals, routines, important dates, instructions).',
  inputSchema: z.object({
    key: z.string().trim().min(1).max(120),
    value: z.string().trim().min(1).max(2000),
    category: z.enum(MEMORY_CATEGORIES).optional(),
  }),
  permissionLevel: 'normal',
  describeAction: (input) => `Remember: ${input.key} = ${input.value}`,
  async execute(input, context) {
    const memory = await memoryService.createMemory(
      context.userId,
      { category: input.category ?? 'instruction', key: input.key, value: input.value, isPinned: false },
      'agent',
    );
    return { success: true, message: `Got it, I'll remember that: ${input.key}.`, data: memoryService.toMemoryDTO(memory) };
  },
});

export const listMemoriesTool = defineTool({
  name: 'list_memories',
  description: 'List or search the user\'s saved memories.',
  inputSchema: z.object({ search: z.string().trim().max(200).optional(), category: z.enum(MEMORY_CATEGORIES).optional() }),
  permissionLevel: 'safe',
  async execute(input, context) {
    const result = await memoryService.listMemories(context.userId, {
      search: input.search,
      category: input.category,
      page: 1,
      limit: 50,
    });
    return {
      success: true,
      message: result.items.length ? `Found ${result.items.length} memor${result.items.length === 1 ? 'y' : 'ies'}.` : 'No memories found.',
      data: result.items,
    };
  },
});

export const updateMemoryTool = defineTool({
  name: 'update_memory',
  description: 'Update an existing memory by id.',
  inputSchema: z.object({ memoryId: z.string().min(1), key: z.string().trim().max(120).optional(), value: z.string().trim().max(2000).optional() }),
  permissionLevel: 'normal',
  async execute(input, context) {
    const memory = await memoryService.updateMemory(context.userId, input.memoryId, { key: input.key, value: input.value });
    return { success: true, message: 'Memory updated.', data: memoryService.toMemoryDTO(memory) };
  },
});

export const deleteMemoryTool = defineTool({
  name: 'delete_memory',
  description: 'Delete a saved memory by id. Requires user approval.',
  inputSchema: z.object({ memoryId: z.string().min(1) }),
  permissionLevel: 'approval_required',
  describeAction: (input) => `Forget memory ${input.memoryId}`,
  async execute(input, context) {
    await memoryService.deleteMemory(context.userId, input.memoryId);
    return { success: true, message: 'Memory deleted.' };
  },
});
