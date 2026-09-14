import { API_ERROR_CODES, type ApiErrorCode } from '@personal-agent/shared';

export class AppError extends Error {
  code: ApiErrorCode;
  statusCode: number;
  details?: unknown;

  constructor(code: ApiErrorCode, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static validation(message: string, details?: unknown) {
    return new AppError(API_ERROR_CODES.VALIDATION_ERROR, message, 400, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(API_ERROR_CODES.UNAUTHORIZED, message, 401);
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new AppError(API_ERROR_CODES.FORBIDDEN, message, 403);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(API_ERROR_CODES.NOT_FOUND, message, 404);
  }
  static conflict(message: string) {
    return new AppError(API_ERROR_CODES.CONFLICT, message, 409);
  }
  static approvalRequired(message: string, details?: unknown) {
    return new AppError(API_ERROR_CODES.APPROVAL_REQUIRED, message, 202, details);
  }
  static approvalExpired(message = 'Approval request has expired') {
    return new AppError(API_ERROR_CODES.APPROVAL_EXPIRED, message, 410);
  }
  static provider(message: string, details?: unknown) {
    return new AppError(API_ERROR_CODES.PROVIDER_ERROR, message, 502, details);
  }
  static tool(message: string, details?: unknown) {
    return new AppError(API_ERROR_CODES.TOOL_ERROR, message, 422, details);
  }
  static internal(message = 'Internal server error') {
    return new AppError(API_ERROR_CODES.INTERNAL_ERROR, message, 500);
  }
}
