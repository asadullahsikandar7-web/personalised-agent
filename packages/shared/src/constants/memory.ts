export const MEMORY_CATEGORIES = [
  'preference',
  'personal_information',
  'project',
  'goal',
  'routine',
  'important_date',
  'instruction',
  'temporary_context',
] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
