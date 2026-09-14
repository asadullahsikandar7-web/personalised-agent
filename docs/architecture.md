# Architecture

## Overview

Personal Agent is a pnpm/turborepo monorepo with three logical layers:

```
apps/mobile   - Expo Router mobile app (the only thing the user runs on-device)
apps/api      - Fastify backend: the only thing that talks to the AI provider
packages/shared - Zod schemas, TypeScript types, and the API response contract
                  shared verbatim by both apps (no duplicated type definitions)
```

The mobile app never calls OpenAI (or any AI provider) directly, and never holds an API key.
Every request goes through the backend, which is the sole owner of provider credentials,
tool execution, and data persistence.

## Request flow (text/voice message -> agent reply)

```
Mobile app
  -> POST /api/agent/message  (or /api/agent/voice with a transcript)
Backend (src/modules/agent/routes.ts)
  -> ai/orchestration/engine.ts: processAgentMessage()
       1. Load user + conversation (create one if this is the first message)
       2. Persist the user's message
       3. Load recent message history (last 20) + relevant memories
       4. Build the system prompt (ai/prompts/system-prompt.ts)
       5. Ask the configured AIModelProvider for a response, offering every
          registered tool's JSON-schema definition (ai/tool-calling/adapter.ts)
       6. If the model proposed tool calls, run each one through
          ai/tool-calling/executor.ts:
            - validate input against the tool's Zod schema
            - if the tool's permission level requires approval, create an
              ApprovalRequest and stop (no execution) instead of running it
            - otherwise execute it and record a ToolExecution audit row
       7. Feed the tool results back to the provider for a final natural-
          language reply (skipped if there were no tool calls)
       8. Persist the assistant's message (with each tool call's status)
       9. Log an ActivityLog entry
  <- { conversationId, userMessage, assistantMessage, pendingApprovalIds }
Mobile app renders the reply, and if pendingApprovalIds is non-empty, renders
an inline approval card (Approve/Reject -> POST /api/agent/approve|reject).
```

This is the same pipeline for text and voice input - voice only differs in
that the mobile app transcribes speech to text locally before sending it, and
optionally reads the reply aloud with TTS on the way back.

## Layers inside `apps/api/src`

| Directory | Responsibility |
|---|---|
| `config` | env parsing/validation (Zod), constants |
| `plugins` | Fastify plugins: mongo, redis, auth (JWT), error handler, request-id, swagger |
| `middleware` | small per-request helpers (current-user extraction, Zod-parse-or-throw) |
| `db/models` | Mongoose schemas - the only place documents are shaped |
| `modules/*` | one folder per feature: `service.ts` (business logic + DB access) and `routes.ts` (thin HTTP layer). Routes never touch Mongoose models directly - they call the service. |
| `ai/providers` | `AIModelProvider` interface + OpenAI/Mock/Ollama implementations (see `docs/ai-provider.md`) |
| `ai/tools` | `AgentTool` interface, the dynamic `ToolRegistry`, and every tool implementation (see `docs/tool-development.md`) |
| `ai/tool-calling` | converts tools to provider-agnostic JSON-schema definitions, and the single choke point (`executor.ts`) that validates, permission-gates, executes, and audits every tool call |
| `ai/orchestration` | the pipeline described above |
| `ai/prompts` | the system prompt |
| `queues` / `workers` | BullMQ reminder queue + the worker process that consumes it |

Every feature module (memory, tasks, reminders, notes, music, notifications, activity) follows
the same shape: a Mongoose model, a `service.ts` with pure business logic, a `routes.ts` for the
REST API, and (where relevant) a tool in `ai/tools/definitions` that calls the *same* service
functions the REST routes use - so "the agent creates a task" and "the user creates a task from
the UI" run through identical, single-audited code, not two parallel implementations.

## Why this shape

- **Swappable AI provider**: nothing outside `ai/providers` imports the OpenAI SDK. See
  `docs/ai-provider.md` and `docs/future-local-ai.md`.
- **Swappable/extensible tools**: adding a capability means writing one file in
  `ai/tools/definitions` and registering it - the orchestration engine, permission gate, and
  REST tool endpoints all pick it up automatically. See `docs/tool-development.md`.
- **One audit trail**: `ToolExecution` and `ActivityLog` are written from the same executor
  regardless of whether a tool ran via the agent, a direct `POST /api/tools/:name/execute`
  call, or (for approval-gated tools) after an explicit approval.
- **Ownership is enforced at the query, not the route**: every service function filters by
  `{ userId }` on every read/write, so a route bug can't leak another user's data - see the
  `ownership.test.ts` integration tests.

## Mobile app shape

```
apps/mobile/app/           - Expo Router file-based routes (screens only - no business logic)
apps/mobile/src/components - Reusable UI primitives (Button, Card, EmptyState, ...)
apps/mobile/src/hooks      - One TanStack Query hook file per resource (tasks, reminders, ...)
apps/mobile/src/services   - api-client (fetch + auto-refresh), secure-storage, query-client
apps/mobile/src/stores     - Zustand: auth-store (session), ui-store (theme)
apps/mobile/src/theme      - Design tokens (colors.ts) and NativeWind class tokens (tw.ts)
```

Screens are thin: they call a hook, and render one of loading/error/empty/data - see any
screen under `app/(app)/` for the pattern. All server state lives in TanStack Query; only
session and theme preference live in Zustand.
