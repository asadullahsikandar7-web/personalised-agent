# Robot Integration

Status: **backend foundation only** (models, gateway, REST, agent tools, tests). No hardware has
been used to validate this - there is no Raspberry Pi or ESP32 available in this environment.
Nothing here has been tested against a real robot; it's tested against a fake WebSocket standing
in for one (`tests/integration/robots.test.ts`). Mobile UI, the Pi-side `robot-agent`, the
Pi↔ESP32 serial protocol, and autonomous behaviors (patrol/follow/navigate) are **not built yet**
- see "Deferred" below.

## Why a new module, not an extension of an existing one

Robots are a genuinely different domain from everything else in this app (tasks, reminders,
music, notes): they need a **persistent bidirectional connection** (a Pi stays connected and
pushes telemetry; the app sends time-sensitive commands), not request/response REST. The app had
**no realtime infrastructure at all** before this (confirmed by inspection - no WebSocket/
Socket.IO/SSE anywhere), so a WebSocket gateway is new infrastructure. Everything else - auth,
the tool/permission system, ActivityLog, the Mongoose/Fastify conventions - is reused unchanged.

## Domain model

Two new Mongoose collections (`src/db/models/`), following the same shape as every existing
model (`userId` + `timestamps`, DTOs mapped in `service.ts`):

- **`Robot`**: one document per registered robot. Live telemetry (`battery`, `distanceCm`,
  `status`, `lastSeenAt`) is stored directly on this document rather than a separate time-series
  collection - only the *latest* reading is actually used by the app or the agent today, and an
  unbounded telemetry-history collection would grow for no current benefit. `pairingTokenHash`
  (never the raw token) authenticates the Pi's WebSocket connection - same `hashToken`/
  `generateOpaqueToken` utilities as refresh tokens and password-reset tokens.
- **`RobotCommand`**: one document per command sent to a robot - the robot analog of
  `ToolExecution`. Tracks `pending -> sent -> acked -> completed/failed/timeout`.

**No separate `robot_events` collection.** Robot lifecycle/telemetry-derived events (connected,
disconnected, battery low) are recorded through the *existing* `ActivityLog` system
(`category: 'system'`, `metadata: { robotId }`) rather than a duplicate feed - this was an
explicit design choice per "integrate with the existing Activity system, don't duplicate it."

**No `robot_tasks` collection yet.** Scheduled/autonomous behaviors (patrol, etc.) need real
design work (BullMQ job semantics, safety review) beyond the initial tool set - deferred, see
below.

## The gateway (`modules/robots/gateway.ts`)

A `@fastify/websocket` route (`GET /ws/robot/:deviceId?token=...`, registered separately from the
authenticated REST routes since a Pi isn't a logged-in user) accepts one connection per robot,
authenticated by comparing the presented token's hash against `Robot.pairingTokenHash`.

Wire protocol (JSON messages over the socket) - extends the original design sketch with an
explicit `result` envelope for query-style commands (`get_battery` etc.), which the sketch didn't
cover:

```text
-> {"type":"command","id":"<RobotCommand _id>","command":"move","direction":"forward","speed":40,"durationMs":1000}
<- {"type":"ack","command_id":"<id>","status":"accepted"}
<- {"type":"result","command_id":"<id>","status":"ok"|"error","data"?:{...},"message"?:"..."}
<- {"type":"telemetry","battery":82,"distance_cm":65,"state":"idle"}      // unsolicited, periodic
<- {"type":"error","command_id":"<id>","code":"OBSTACLE_DETECTED","message":"..."}
```

`sendRobotCommand(userId, robotId, type, input)` is the single choke point every robot tool goes
through - directly analogous to `executeToolCall` for regular agent tools. It:

1. Throws immediately (`AppError.provider`, "Robot is offline") if there's no live connection -
   never queues or fakes success.
2. Creates a `RobotCommand` audit record, sends the command, and awaits a matching `result`/
   `error` message, racing against `ROBOT_SAFETY_LIMITS.COMMAND_TIMEOUT_MS` (8s).
3. Updates the `RobotCommand` record to `completed`/`failed`/`timeout` and returns or throws.

An unsolicited `telemetry` message updates `Robot.battery`/`distanceCm`/`lastSeenAt` directly (no
command round-trip needed), and logs a `robot.battery_low` activity entry at <=15%.

## Backend-enforced safety limits (independent of whatever the ESP32 also enforces)

`ROBOT_SAFETY_LIMITS` (`packages/shared/src/constants/robot.ts`): speed clamped to 0-100%, a
single move/turn command capped at 5000ms, and an 8s command timeout. These are validated in the
zod schemas the tools use (`packages/shared/src/schemas/robot.ts`), so an out-of-range value is
rejected before a command is ever sent - this is a defense-in-depth layer, **not** a substitute
for the ESP32's own hardware watchdog/emergency-stop, which must exist independently and must not
depend on the backend, the LLM, or network connectivity (not yet built - see Deferred).

## Agent tools (`ai/tools/definitions/robot.ts`)

Ten tools, registered in `ai/tools/index.ts` exactly like every other tool - the LLM never talks
to the robot directly, only through these predefined, schema-validated, permission-classified
tools, gated by the *existing, unmodified* permission system
(`ai/tool-calling/executor.ts`):

| Tool | Permission |
|---|---|
| `get_robot_status`, `get_robot_battery`, `get_robot_sensors`, `get_robot_distance` | `safe` |
| `stop_robot` | `safe` (stopping must never require approval - see safety notes) |
| `capture_robot_image`, `get_robot_camera_status` | `safe` |
| `move_robot`, `turn_robot`, `set_robot_speed` | `restricted` |

All ten accept an optional `robotId`; when omitted, `resolveRobotId` (`modules/robots/service.ts`)
falls back to the user's only robot, or fails honestly ("No robot is registered yet." / "you have
more than one robot - specify which one") rather than guessing.

**Important error-handling detail**: `sendRobotCommand`/`resolveRobotId` throw `AppError` (the
right shape for a REST route - the global error handler formats it). But the tool *executor*'s
catch-all discards a thrown error's message down to a generic "failed unexpectedly" - so every
robot tool catches internally and returns a normal `ToolResult` with the real message instead,
matching how `web-search.ts` and `send-message.ts` already handle their own provider failures.
Covered by a regression test (`robots.test.ts` > "fails honestly when the robot has no active
connection, without throwing out of a tool").

The mock AI provider (`ai/providers/mock-provider.ts`) has pattern matches for the example
commands from the spec ("move forward", "turn left", "stop", "what do you see" / "take a
picture", "battery level", "robot status") so the full agent pipeline is exercisable offline/in
tests exactly like every other tool.

## REST endpoints (`modules/robots/routes.ts`, prefix `/api/robots`, auth required)

- `POST /` - register a robot, returns `{ robot, pairingToken }` (the token is shown **once**,
  like a password - only its hash is ever stored).
- `GET /` - list the caller's robots.
- `GET /:id` / `DELETE /:id` - get / unpair, 404 if it belongs to someone else (same
  `findOne({_id, userId})` ownership pattern as every other module).

## What's genuinely new infrastructure vs. reused

Reused unchanged: JWT auth, the tool registry + permission gate + approval flow, Mongoose/Fastify
module conventions, `ActivityLog`, `AppError`/`sendSuccess` response helpers, `hashToken`/
`generateOpaqueToken`.

New: `@fastify/websocket` (no realtime existed before), the `Robot`/`RobotCommand` models, the
gateway/wire-protocol, the ten robot tools, and this doc.

## Deferred (explicitly out of scope for this pass)

- **Raspberry Pi `robot-agent`** and the **Pi↔ESP32 serial protocol** - can't be built against
  real hardware in this environment; the backend's wire protocol above is what a Pi agent would
  need to speak.
- **ESP32 firmware / hardware watchdog / emergency stop** - must exist independently of
  everything above; this backend cannot build or verify it.
- **Camera streaming (WebRTC/MediaMTX)** - `capture_robot_image`/`get_robot_camera_status` exist
  as commands, but no media pipeline is wired up; the backend would only ever broker
  auth/session metadata, never carry video itself.
- **Autonomous behaviors**: `navigate_robot`, `follow_person`, `patrol_area`, `dock_robot`, and
  BullMQ-scheduled robot tasks ("every day at 8 PM, patrol my room") - these need real design
  work (safe-area definition, `approval_required` UX, BullMQ job semantics) before implementation.
- **Mobile app UI** - no Robot screens/dashboard yet; the REST/WS API above is what they'd call.
