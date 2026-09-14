import type { TaskPriority, TaskStatus } from '../constants/tasks';

export interface TaskDTO {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  tags: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
