import type { FastifyRequest } from 'fastify';
import { AppError } from '../utils/errors';

/** Extracts the authenticated user's id from the verified JWT payload attached by the auth plugin. */
export function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw AppError.unauthorized();
  }
  return user.sub;
}
