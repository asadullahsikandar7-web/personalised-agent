import type { ZodType } from 'zod';
import { AppError } from '../utils/errors';

/**
 * Parses `input` against `schema`, throwing a normalized AppError.validation on failure.
 * Typed as ZodType<T, any, any> (rather than ZodSchema<T>, which pins Input === Output) so that
 * T is correctly inferred as the schema's *output* type even for schemas with `.default(...)`
 * fields, where the parsed output (defaults applied) differs from the raw input shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate: see comment above
export function parseOrThrow<T>(schema: ZodType<T, any, any>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw AppError.validation('Request validation failed', result.error.flatten());
  }
  return result.data;
}
