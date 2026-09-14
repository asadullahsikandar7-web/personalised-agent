import pino from 'pino';
import { env, isProduction, isTest } from '../config/env';

/** Fields that must never be logged, even accidentally. */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.apiKey',
  '*.OPENAI_API_KEY',
];

export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  transport: isProduction || isTest ? undefined : { target: 'pino-pretty', options: { colorize: true } },
});
