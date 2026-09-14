import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),

  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/personal_agent'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-change-me-please-32chars'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-change-me-please-32chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  AI_PROVIDER: z.enum(['openai', 'mock', 'ollama']).default('mock'),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen3:4b'),

  MOBILE_APP_SCHEME: z.string().default('personalagent'),
  CORS_ORIGINS: z.string().default('*'),

  PUSH_NOTIFICATION_PROVIDER: z.string().default(''),

  WEB_SEARCH_API_KEY: z.string().default(''),
  WEB_SEARCH_PROVIDER: z.string().default(''),

  LOG_LEVEL: z.string().default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
