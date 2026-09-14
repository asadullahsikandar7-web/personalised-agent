# Setup

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm` if you don't have it)
- MongoDB (local install, Docker, or `mongodb-memory-server` for tests only)
- Redis (local install or Docker)
- For the mobile app: an Expo-compatible setup - see `docs/mobile-simulator.md` for the Android
  emulator specifics
- Optional: Docker + Docker Compose, if you'd rather run Mongo/Redis/API/worker in containers
  instead of natively

## 1. Install dependencies

```bash
pnpm install
```

This installs every workspace package (`apps/api`, `apps/mobile`, `packages/shared`) in one pass.

## 2. Build the shared package once

The API and mobile app both consume `@personal-agent/shared` as a *compiled* package (so Metro
and `tsc` both resolve plain JS, not raw TypeScript across a workspace boundary):

```bash
pnpm --filter @personal-agent/shared build
```

Re-run this (or `pnpm --filter @personal-agent/shared dev` to watch) whenever you change anything
under `packages/shared/src`.

## 3. Configure environment variables

```bash
cp .env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Edit `apps/api/.env`:
- Leave `AI_PROVIDER=mock` to run everything without any API key (the Mock provider understands
  the example commands from the product brief - task/reminder/memory creation, music control,
  approval flows - well enough to exercise the whole pipeline for development and tests).
- To use real OpenAI, see `docs/ai-provider.md`.
- Generate real secrets for `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` for anything beyond local
  dev: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

Edit `apps/mobile/.env` if your backend isn't at the default address. The Android emulator reaches
your host machine's `localhost` via `10.0.2.2`, not `localhost` - that's already the default.

## 4. Start MongoDB and Redis

Natively (macOS + Homebrew, matching what this project was built against):

```bash
brew services start mongodb-community
brew services start redis
# or, without brew services:
mongod --dbpath /path/to/your/data/dir
redis-server
```

Or with Docker Compose (starts Mongo + Redis + the API + the worker together):

```bash
pnpm docker:up
```

## 5. Run the backend

```bash
pnpm dev:api      # Fastify API on http://localhost:4000, docs at /docs
pnpm dev:worker   # BullMQ reminder worker (separate process, separate terminal)
```

Verify it's healthy:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/ready   # checks Mongo + Redis connectivity
```

## 6. Seed demo data (optional)

```bash
pnpm db:seed
```

Creates one demo account with sample conversations, memories, tasks, reminders, activity, and
music history. **Local development only, not a real account:**

```
email:    demo@personalagent.local
password: DemoPass123!
```

## 7. Run the mobile app

```bash
pnpm dev:mobile
```

Then either scan the QR code with Expo Go on a physical device on the same network, or press `a`
to launch it on a running Android emulator. See `docs/mobile-simulator.md` for the full emulator
walkthrough, including what does and doesn't work in Expo Go versus a development build.

## 8. Run the tests

```bash
pnpm test              # everything
pnpm --filter @personal-agent/api test        # backend only (needs Redis running; Mongo is
                                               # an ephemeral in-memory instance, started
                                               # automatically by the test suite)
pnpm --filter @personal-agent/mobile test     # mobile component/hook tests (Jest, no device needed)
```

See `docs/testing.md` for what's covered and how.
