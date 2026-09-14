import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '../constants/tasks';

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  tag: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
