import type { FastifyReply } from 'fastify';
import type { ApiResponse } from '@personal-agent/shared';

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200): void {
  const requestId = (reply.request.id as string) ?? 'unknown';
  const body: ApiResponse<T> = { success: true, data, requestId };
  reply.status(statusCode).send(body);
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const requestId = (reply.request.id as string) ?? 'unknown';
  const body: ApiResponse<never> = { success: false, error: { code, message, details }, requestId };
  reply.status(statusCode).send(body);
}
