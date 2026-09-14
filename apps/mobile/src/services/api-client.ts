import type { ApiResponse } from '@personal-agent/shared';
import { env } from '../utils/env';
import { secureStorage } from './secure-storage';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Invoked when a refresh attempt fails so the auth store can log the user out. Wired in app/_layout.tsx. */
let onSessionExpired: (() => void) | null = null;
export function registerSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${env.apiBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
      if (!res.ok || !json.success) {
        await secureStorage.clearTokens();
        onSessionExpired?.();
        return null;
      }
      await secureStorage.setTokens(json.data.accessToken, json.data.refreshToken);
      return json.data.accessToken;
    } catch {
      return null;
    }
  })();

  const result = await refreshPromise;
  refreshPromise = null;
  return result;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Skip attaching the Authorization header (login/register/refresh). */
  skipAuth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${env.apiBaseUrl}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function rawRequest<T>(path: string, options: RequestOptions, accessToken: string | null): Promise<T> {
  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(accessToken && !options.skipAuth ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!json) {
    throw new ApiError('The server returned an unexpected response.', 'INTERNAL_ERROR', res.status);
  }
  if (!json.success) {
    throw new ApiError(json.error.message, json.error.code, res.status, json.error.details);
  }
  return json.data;
}

/**
 * Central API client used by every typed hook in src/hooks. Automatically attaches the access
 * token, and on a 401 (UNAUTHORIZED), transparently refreshes once and retries before giving up.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const accessToken = options.skipAuth ? null : await secureStorage.getAccessToken();

  try {
    return await rawRequest<T>(path, options, accessToken);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401 && !options.skipAuth) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return rawRequest<T>(path, options, newToken);
      }
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    apiRequest<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown, options: Partial<RequestOptions> = {}) =>
    apiRequest<T>(path, { method: 'POST', body, ...options }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
