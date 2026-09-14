export interface ActivityLogDTO {
  id: string;
  action: string;
  category: 'agent' | 'tool' | 'auth' | 'system';
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
