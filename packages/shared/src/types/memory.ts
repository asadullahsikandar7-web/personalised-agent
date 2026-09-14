import type { MemoryCategory } from '../constants/memory';

export interface MemoryDTO {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  source: 'user' | 'agent';
  confidence: number;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}
