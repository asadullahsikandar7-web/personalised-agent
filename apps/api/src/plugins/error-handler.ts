import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { API_ERROR_CODES } from '@personal-agent/shared';
import { isProduction } from '../config/env';

export default fp(async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error({ err: error }, error.message);
      } else {
        request.log.warn({ code: error.code }, error.message);
      }
      sendError(reply, error.statusCode, error.code, error.message, error.details);
      return;
    }

    if (error instanceof ZodError) {
      sendError(reply, 400, API_ERROR_CODES.VALIDATION_ERROR, 'Validation failed', error.flatten());
      return;
    }

    // Fastify's own validation errors (from schema-based route validation)
    if (error.validation) {
      sendError(reply, 400, API_ERROR_CODES.VALIDATION_ERROR, error.message, error.validation);
      return;
    }

    if (error.statusCode === 429) {
      sendError(reply, 429, API_ERROR_CODES.RATE_LIMITED, 'Too many requests, please slow down');
      return;
    }

    request.log.error({ err: error }, 'Unhandled error');
    sendError(
      reply,
      500,
      API_ERROR_CODES.INTERNAL_ERROR,
      isProduction ? 'Internal server error' : error.message,
    );
  });

  app.setNotFoundHandler((request, reply) => {
    sendError(reply, 404, API_ERROR_CODES.NOT_FOUND, `Route ${request.method} ${request.url} not found`);
  });
});
