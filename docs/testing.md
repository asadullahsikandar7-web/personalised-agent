# Testing

## Backend (`apps/api`)

```bash
pnpm --filter @personal-agent/api test        # run once
pnpm --filter @personal-agent/api test:watch  # watch mode
```

Requires a real local Redis (`redis-server`, default port) - BullMQ tests run against it for
real rather than mocking it. MongoDB is **not** required locally: `tests/global-setup.ts` boots
an ephemeral `mongodb-memory-server` instance once for the whole run and points `MONGODB_URI` at
it before any test file loads.

**76 tests across 13 files, all passing** as of this build (`vitest run`):

Unit (`tests/unit/`, no DB/network):
- `password.test.ts` - bcrypt hashing/verification, salting
- `jwt-utils.test.ts` - opaque token generation and hashing
- `ms.test.ts` - the duration-string parser used for JWT expiry config
- `calculator.test.ts` - arithmetic tool, including that it rejects non-arithmetic input rather
  than ever reaching `eval`
- `datetime.test.ts` - timezone-aware current-time tool
- `tool-registry.test.ts` - registration/lookup, duplicate-name rejection, and an assertion that
  every documented initial tool is actually registered with the right permission level
- `recurrence.test.ts` - daily/weekly/monthly recurrence math, timezone-aware
- `mock-provider.test.ts` - intent matching for every example command from the product brief,
  including that it never proposes a tool it wasn't offered, and the tool-result synthesis pass

Integration (`tests/integration/`, real Fastify app via `.inject()`, real Mongo/Redis):
- `auth.test.ts` - register/login/duplicate-email/wrong-password, protected-route rejection,
  refresh rotation, **reuse of an already-rotated refresh token is rejected**, logout
- `agent.test.ts` - plain Q&A with no tool calls, task/reminder/memory creation via natural
  language, multi-turn conversation continuity, the full approval flow (create -> list ->
  approve -> honestly-reported non-delivery since no message provider is configured -> reject ->
  a rejected request can never later be approved), and that another user cannot approve someone
  else's request
- `ownership.test.ts` - cross-user 404s on tasks/memories/reminders, and that list endpoints only
  ever return the caller's own data
- `reminders.test.ts` - creates a real BullMQ job and asserts it exists, invalid-datetime
  rejection, sort order, snooze moving the next trigger forward, cancel removing the job
- `tools.test.ts` - the `/api/tools` REST surface, direct execution of a safe tool, the 202
  `awaiting_approval` response for a gated tool, and 422 on invalid input

Two real bugs were caught and fixed by this suite during development (see the git history for
the fix commit): Fastify v5's `logger` option requiring `loggerInstance` for a pre-built pino
instance, and BullMQ rejecting `:` in job ids (idempotency keys now use `-`).

## Mobile (`apps/mobile`)

```bash
pnpm --filter @personal-agent/mobile test
```

Jest + `jest-expo` + React Native Testing Library. Covers:
- `components/`: `Button` (press/disabled/loading behavior), `TextField` (label, error display,
  change events), `EmptyState` (action button behavior)
- `stores/auth-store.test.ts`: session restore (success and failure), login, a failed login
  leaving the store unauthenticated with the server's error message surfaced, and logout clearing
  SecureStore
- `hooks/useVoiceRecognition.test.ts`: every state transition the voice state machine relies on -
  idle -> listening on a granted permission, `permission_denied` on a declined dialog, and
  critically, **`unavailable` when the native module throws** (the exact situation you hit
  running in Expo Go) - proving the Assistant screen's text-input fallback path is reachable and
  tested, not just assumed.

This is a representative slice, not full coverage of every screen - see
"Known limitations" in the final completion report for what's untested.

## What's not covered by an automated test

- The OpenAI provider has not been exercised against a live API key (see `docs/ai-provider.md`).
- No end-to-end test drives the actual Android emulator through Detox or a Playwright-style
  runner - the emulator was driven manually for the walkthrough in `docs/mobile-simulator.md`.
  See that document for the actual checklist and its results.
