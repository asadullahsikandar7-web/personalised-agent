/**
 * Canonical API response envelope used by every endpoint in the backend
 * and consumed by the mobile API client.
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Common error codes returned by the backend so the mobile client can branch on them. */
export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  APPROVAL_EXPIRED: 'APPROVAL_EXPIRED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  TOOL_ERROR: 'TOOL_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
