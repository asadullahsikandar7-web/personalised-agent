/**
 * Public, non-secret runtime configuration. Expo only inlines env vars prefixed with
 * EXPO_PUBLIC_ into the JS bundle - this is the ONLY way the mobile app is configured, and it
 * must never carry secrets (OpenAI keys, JWT secrets, etc). Only the backend talks to OpenAI;
 * see docs/environment.md and docs/permissions-and-security.md.
 */
export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:4000',
  appScheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? 'personalagent',
};
