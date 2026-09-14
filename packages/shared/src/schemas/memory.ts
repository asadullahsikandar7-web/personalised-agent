import { z } from 'zod';
import { MEMORY_CATEGORIES } from '../constants/memory';

export const createMemorySchema = z.object({
  category: z.enum(MEMORY_CATEGORIES),
  key: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(2000),
  isPinned: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
});
export type CreateMemoryInput = z.infer<typeof createMemorySchema>;

export const updateMemorySchema = createMemorySchema.partial();
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;

export const listMemoriesQuerySchema = z.object({
  category: z.enum(MEMORY_CATEGORIES).optional(),
  search: z.string().trim().max(200).optional(),
  pinned: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListMemoriesQuery = z.infer<typeof listMemoriesQuerySchema>;
