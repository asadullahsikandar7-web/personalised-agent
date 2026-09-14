import { MemoryModel } from '../../db/models';

/**
 * Retrieves memory context to inject into the model's system message: all pinned memories plus
 * the most recently updated ones, capped to keep the prompt small. A future iteration could use
 * embedding similarity search instead of recency - see docs/architecture.md.
 */
export async function getRelevantMemoriesText(userId: string, limit = 15): Promise<string> {
  const memories = await MemoryModel.find({ userId }).sort({ isPinned: -1, updatedAt: -1 }).limit(limit);
  if (memories.length === 0) return 'No saved memories yet.';
  return memories.map((m) => `- [${m.category}] ${m.key}: ${m.value}`).join('\n');
}
