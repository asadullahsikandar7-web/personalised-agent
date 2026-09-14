import type { PermissionLevel } from '../constants/permissions';

export interface ToolDescriptor {
  name: string;
  description: string;
  permissionLevel: PermissionLevel;
  inputJsonSchema: Record<string, unknown>;
}

export interface ApprovalRequestDTO {
  id: string;
  toolName: string;
  input: unknown;
  summary: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expiresAt: string;
  createdAt: string;
}
