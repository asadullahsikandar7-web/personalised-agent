import { z } from 'zod';
import { defineTool } from '../types';
import * as taskService from '../../../modules/tasks/service';
import { TASK_PRIORITIES, TASK_STATUSES } from '@personal-agent/shared';

export const createTaskTool = defineTool({
  name: 'create_task',
  description: 'Create a new task/to-do item, optionally with priority, due date, and tags.',
  inputSchema: z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    dueDate: z.string().datetime().optional(),
    tags: z.array(z.string()).optional(),
  }),
  permissionLevel: 'normal',
  async execute(input, context) {
    const task = await taskService.createTask(context.userId, {
      title: input.title,
      description: input.description,
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate,
      tags: input.tags ?? [],
    });
    return { success: true, message: `Task "${task.title}" created.`, data: taskService.toTaskDTO(task) };
  },
});

export const listTasksTool = defineTool({
  name: 'list_tasks',
  description: 'List the user\'s tasks, optionally filtered by status or priority.',
  inputSchema: z.object({ status: z.enum(TASK_STATUSES).optional(), priority: z.enum(TASK_PRIORITIES).optional() }),
  permissionLevel: 'safe',
  async execute(input, context) {
    const result = await taskService.listTasks(context.userId, { status: input.status, priority: input.priority, page: 1, limit: 50 });
    return {
      success: true,
      message: result.items.length ? `You have ${result.items.length} matching task(s).` : 'No matching tasks found.',
      data: result.items,
    };
  },
});

export const updateTaskTool = defineTool({
  name: 'update_task',
  description: 'Update a task\'s title, description, priority, status, due date, or tags.',
  inputSchema: z.object({
    taskId: z.string().min(1),
    title: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    dueDate: z.string().datetime().optional(),
    tags: z.array(z.string()).optional(),
  }),
  permissionLevel: 'normal',
  async execute(input, context) {
    const { taskId, ...rest } = input;
    const task = await taskService.updateTask(context.userId, taskId, rest);
    return { success: true, message: `Task "${task.title}" updated.`, data: taskService.toTaskDTO(task) };
  },
});

export const completeTaskTool = defineTool({
  name: 'complete_task',
  description: 'Mark a task as completed.',
  inputSchema: z.object({ taskId: z.string().min(1) }),
  permissionLevel: 'normal',
  async execute(input, context) {
    const task = await taskService.completeTask(context.userId, input.taskId);
    return { success: true, message: `Task "${task.title}" marked complete.`, data: taskService.toTaskDTO(task) };
  },
});

export const deleteTaskTool = defineTool({
  name: 'delete_task',
  description: 'Permanently delete a task. Requires user approval.',
  inputSchema: z.object({ taskId: z.string().min(1) }),
  permissionLevel: 'approval_required',
  describeAction: (input) => `Delete task ${input.taskId}`,
  async execute(input, context) {
    await taskService.deleteTask(context.userId, input.taskId);
    return { success: true, message: 'Task deleted.' };
  },
});
