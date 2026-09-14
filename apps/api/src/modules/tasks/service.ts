import { TaskModel, type TaskDoc } from '../../db/models';
import { AppError } from '../../utils/errors';
import { paginateResult } from '../../utils/pagination';
import type { CreateTaskInput, UpdateTaskInput, ListTasksQuery, TaskDTO } from '@personal-agent/shared';
import { logActivity } from '../activity/service';

export function toTaskDTO(doc: TaskDoc): TaskDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? null,
    priority: doc.priority as TaskDTO['priority'],
    status: doc.status as TaskDTO['status'],
    dueDate: doc.dueDate ? doc.dueDate.toISOString() : null,
    tags: doc.tags,
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<TaskDoc> {
  const doc = await TaskModel.create({
    userId,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority ?? 'medium',
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    tags: input.tags ?? [],
  });
  await logActivity(userId, { action: 'task.created', category: 'tool', description: `Task created: ${input.title}` });
  return doc;
}

export async function listTasks(userId: string, query: ListTasksQuery) {
  const filter: Record<string, unknown> = { userId, isDeleted: false };
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.tag) filter.tags = query.tag;

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    TaskModel.find(filter).sort({ dueDate: 1, createdAt: -1 }).skip(skip).limit(query.limit),
    TaskModel.countDocuments(filter),
  ]);
  return paginateResult(items.map(toTaskDTO), total, query.page, query.limit);
}

export async function getTaskOrThrow(userId: string, id: string): Promise<TaskDoc> {
  const doc = await TaskModel.findOne({ _id: id, userId, isDeleted: false });
  if (!doc) throw AppError.notFound('Task not found');
  return doc;
}

export async function updateTask(userId: string, id: string, input: UpdateTaskInput): Promise<TaskDoc> {
  const doc = await getTaskOrThrow(userId, id);
  if (input.title) doc.title = input.title;
  if (typeof input.description === 'string') doc.description = input.description;
  if (input.priority) doc.priority = input.priority;
  if (input.status) {
    doc.status = input.status;
    doc.completedAt = input.status === 'completed' ? new Date() : null;
  }
  if (input.dueDate !== undefined) doc.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.tags) doc.tags = input.tags;
  await doc.save();
  return doc;
}

export async function completeTask(userId: string, id: string): Promise<TaskDoc> {
  const doc = await getTaskOrThrow(userId, id);
  doc.status = 'completed';
  doc.completedAt = new Date();
  await doc.save();
  await logActivity(userId, { action: 'task.completed', category: 'tool', description: `Task completed: ${doc.title}` });
  return doc;
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  const doc = await getTaskOrThrow(userId, id);
  doc.isDeleted = true;
  await doc.save();
  await logActivity(userId, { action: 'task.deleted', category: 'tool', description: `Task deleted: ${doc.title}` });
}
