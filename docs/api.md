# API Reference

Base URL: `http://localhost:4000` (or your deployed host). Interactive Swagger UI is served at
`/docs` in non-test environments (`GET /docs`), generated from the same route definitions.

## Response envelope

Every endpoint returns the same shape:

```ts
// success
{ "success": true, "data": <T>, "requestId": "<uuid>" }
// failure
{ "success": false, "error": { "code": "...", "message": "...", "details": <optional> }, "requestId": "<uuid>" }
```

`requestId` echoes the `x-request-id` request header (or a generated UUID) - send it back to us
when reporting a bug. Common `error.code` values: `VALIDATION_ERROR`, `UNAUTHORIZED`,
`FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `APPROVAL_REQUIRED`, `APPROVAL_EXPIRED`,
`PROVIDER_ERROR`, `TOOL_ERROR`, `INTERNAL_ERROR`.

Paginated list endpoints return `data: { items, page, limit, total, totalPages }`.

## Authentication

All routes except `/api/auth/*` and `/api/health`, `/api/ready` require
`Authorization: Bearer <accessToken>`. Access tokens expire quickly (15m default); the mobile
API client refreshes them transparently on a 401 using the refresh token - see
`docs/permissions-and-security.md`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | - | `{ email, password, name }` -> user + token pair |
| POST | `/api/auth/login` | - | `{ email, password }` -> user + token pair |
| POST | `/api/auth/refresh` | - | `{ refreshToken }` -> new token pair (rotates the refresh token; reusing an old one fails) |
| POST | `/api/auth/logout` | - | `{ refreshToken }` -> revokes it |
| GET | `/api/auth/me` | ✓ | current user |
| POST | `/api/auth/forgot-password` | - | `{ email }` -> always the same response (no email enumeration). In non-production, also returns `devResetToken` since no email provider is configured - see `docs/known-platform-limitations.md` |
| POST | `/api/auth/reset-password` | - | `{ token, password }` -> resets password, revokes all sessions |

## Users

| Method | Path | Notes |
|---|---|---|
| PATCH | `/api/users/me` | `{ name?, timezone? }` |
| GET | `/api/users/me/preferences` | theme, voice/TTS/notification toggles, default reminder channel |
| PATCH | `/api/users/me/preferences` | partial update of the above |

## Conversations & messages

| Method | Path | Notes |
|---|---|---|
| GET | `/api/conversations` | paginated, newest first |
| POST | `/api/conversations` | `{ title? }` |
| GET | `/api/conversations/:id` | |
| GET | `/api/conversations/:id/messages` | paginated, oldest first |
| DELETE | `/api/conversations/:id` | soft delete |

## Agent

| Method | Path | Notes |
|---|---|---|
| POST | `/api/agent/message` | `{ conversationId?, message }` -> runs the full orchestration pipeline (see `docs/architecture.md`), returns `{ conversationId, userMessage, assistantMessage, pendingApprovalIds }` |
| POST | `/api/agent/voice` | Same shape, `{ conversationId?, transcript }` - identical pipeline, only the source label differs |
| GET | `/api/agent/approvals` | list this user's approval requests (`?status=pending`) |
| POST | `/api/agent/approve` | `{ approvalId }` -> executes the tool if still pending and unexpired |
| POST | `/api/agent/reject` | `{ approvalId }` -> marks rejected, never executes |

## Memories

| Method | Path | Notes |
|---|---|---|
| GET | `/api/memories` | `?category=&search=&pinned=&page=&limit=` |
| POST | `/api/memories` | `{ category, key, value, isPinned?, expiresAt? }` - rejected with 400 if it looks like a credential (password/API key/etc.) |
| PATCH | `/api/memories/:id` | partial update |
| DELETE | `/api/memories/:id` | |

## Tasks

| Method | Path | Notes |
|---|---|---|
| GET | `/api/tasks` | `?status=&priority=&tag=&page=&limit=` |
| POST | `/api/tasks` | `{ title, description?, priority?, dueDate?, tags? }` |
| PATCH | `/api/tasks/:id` | partial update, including `status` |
| POST | `/api/tasks/:id/complete` | shortcut for `status: 'completed'` |
| DELETE | `/api/tasks/:id` | |

## Reminders

| Method | Path | Notes |
|---|---|---|
| GET | `/api/reminders` | `?status=&from=&to=&page=&limit=` |
| POST | `/api/reminders` | `{ title, scheduledAt (ISO datetime), timezone, recurrenceRule?, notificationChannel? }` - schedules a real BullMQ job |
| PATCH | `/api/reminders/:id` | reschedules the underlying job |
| DELETE | `/api/reminders/:id` | cancels (status `cancelled`, job removed) |
| POST | `/api/reminders/:id/snooze` | `{ minutes }` |
| POST | `/api/reminders/:id/complete` | |

## Tools

| Method | Path | Notes |
|---|---|---|
| GET | `/api/tools` | every registered tool: name, description, permission level, JSON-schema input |
| GET | `/api/tools/:name` | single tool descriptor |
| POST | `/api/tools/:name/execute` | direct invocation (bypassing the agent/LLM) - still goes through the same validation + permission gate + audit trail. Returns 202 if the tool requires approval, 422 on invalid input, 200 on success/failure |

## Music

| Method | Path | Notes |
|---|---|---|
| GET | `/api/music/state` | current provider/state/track/position/volume |
| POST | `/api/music/play` \| `/pause` \| `/resume` \| `/next` \| `/previous` | |
| POST | `/api/music/play-track` | `{ trackId }` |
| GET | `/api/music/search` | `?query=` |

## Activity & notifications

| Method | Path | Notes |
|---|---|---|
| GET | `/api/activity` | paginated audit feed of everything the agent/tools have done |
| GET | `/api/notifications` | `?unreadOnly=&page=&limit=` |
| PATCH | `/api/notifications/:id/read` | |

## Notes

| Method | Path | Notes |
|---|---|---|
| GET | `/api/notes` | `?search=` |
| POST | `/api/notes` | `{ title, body? }` |
| PATCH | `/api/notes/:id` | |
| DELETE | `/api/notes/:id` | |

## Health

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | liveness - always 200 once the process is up |
| GET | `/api/ready` | readiness - 200 only if Mongo and Redis are both reachable, otherwise 503 |
