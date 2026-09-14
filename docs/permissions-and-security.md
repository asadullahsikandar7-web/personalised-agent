# Permissions & Security

## Authentication

- Passwords hashed with bcrypt (12 rounds), never returned in any API response or logged (pino
  redaction paths cover `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`,
  `apiKey`, and the authorization/cookie headers - see `src/utils/logger.ts`).
- JWT access tokens (15m default) signed with `JWT_ACCESS_SECRET`; every protected route runs
  through the `authenticate` preHandler which verifies the token and rejects with 401 otherwise.
- Refresh tokens are opaque random strings, stored **hashed** (SHA-256) in `RefreshToken`
  documents - the raw token only ever exists in the response body and the mobile app's
  SecureStore, never in the database. Refreshing **rotates** the token: the old one is marked
  revoked and points at its replacement's hash, so reusing a stolen-but-already-used refresh
  token fails outright (tested in `tests/integration/auth.test.ts`).
- `POST /api/auth/logout` revokes the presented refresh token immediately. Password reset revokes
  *all* of a user's sessions.
- The mobile app never stores tokens in `AsyncStorage` or plain JS state that survives a reload -
  only `expo-secure-store` (Android Keystore / iOS Keychain backed). Theme preference (non-
  sensitive) is the only thing in `AsyncStorage`.

## Authorization / ownership

Every service function in `apps/api/src/modules/*/service.ts` that reads or writes a user-owned
document filters by `{ ..., userId }` - there is no endpoint that trusts a client-supplied user
id, and no "admin" bypass. `tests/integration/ownership.test.ts` asserts this directly: a second
user gets 404 (not 403, to avoid confirming the resource exists) when touching another user's
task, memory, or reminder.

## Rate limiting & request hygiene

- `@fastify/rate-limit` (200 req/min per IP by default, effectively disabled in tests).
- Every request body/query is parsed through a Zod schema (`middleware/validate.ts`) before
  touching a service - invalid input never reaches the database layer.
- `@fastify/helmet` for standard security headers, CORS restricted via `CORS_ORIGINS`.
- Errors are normalized through one handler (`plugins/error-handler.ts`): in production, unknown
  errors return a generic message and never leak a stack trace; `AppError`s always carry a stable
  `code` the client can branch on.

## Sensitive actions require approval

Tools are declared with a `permissionLevel` (`safe` / `normal` / `approval_required` /
`restricted` - see `docs/tool-development.md`). For anything `approval_required` or `restricted`:

1. The executor creates an `ApprovalRequest` (with a human-readable `summary` of exactly what
   would run) **instead of** running the tool, and the agent's reply says so.
2. The mobile app shows the pending approval inline (Assistant screen) and lists it under
   Approvals/Activity.
3. Only `POST /api/agent/approve` (owner-only, checked by `userId`) actually executes it - after
   re-checking the request is still `pending` and not past its 15-minute expiry
   (`APPROVAL_EXPIRY_MINUTES`).
4. `POST /api/agent/reject` marks it rejected; a rejected or expired request can never be
   approved later.
5. A hard-coded backstop (`HARD_APPROVAL_REQUIRED_TOOLS` in `config/constants.ts`) forces
   approval for specific tool names (currently `send_message`, `delete_all_data`) even if a
   future edit to that tool's own declared permission level were weakened by mistake.

Every execution - approved or immediate - writes a `ToolExecution` audit row with the input,
result, duration, and any error message, independent of whether it ran via the agent or a direct
`POST /api/tools/:name/execute` call.

## What the agent is explicitly instructed never to do

From the system prompt (`ai/prompts/system-prompt.ts`), reinforced by the tool
system's hard boundaries, not just a polite request to the model:

- Never invent a tool result or claim an action succeeded without a real successful tool call.
- Never execute arbitrary code or shell commands - the only thing the model can do is call one of
  the explicitly registered tools with schema-validated arguments. There is no "run this code"
  or "run this shell command" tool, and none is planned.
- Never bypass device lock screens, OS permissions, or another app's security. The `open_url`
  tool only validates and hands a URL to the client to open through the normal `Linking` API -
  it cannot open anything the OS itself would block.
- Never request or store passwords, API keys, or financial credentials - `remember_memory` and
  the memory REST endpoint both reject content that matches common credential patterns
  (`modules/memory/service.ts`'s `containsSensitiveContent`).

## Mobile-side permissions

The Permissions screen (`app/(app)/permissions.tsx`) reads and requests exactly two device
permissions, both only when the corresponding feature is used: microphone/speech-recognition
(for the voice assistant) and notifications (for reminder/approval alerts). Neither is requested
at app startup. See `docs/known-platform-limitations.md` for what's unavailable in Expo Go.
