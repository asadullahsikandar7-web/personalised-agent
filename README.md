# Personal Agent

A private, voice-first personal AI assistant. Speak or type naturally; the agent understands
what you want, remembers what matters, and executes only what you explicitly approve for
sensitive actions.

```
"Remind me to study Data Structures at 7 PM."
"Create a task for finishing my Acadexa dashboard."
"What do I have scheduled today?"
"Remember that my preferred programming language is TypeScript."
"Play my study playlist."
```

## What's in this repo

```
apps/mobile      Expo Router mobile app (Android-first, iOS-compatible)
apps/api         Fastify + TypeScript backend - the only thing that talks to the AI provider
packages/shared  Zod schemas, TypeScript types, and the API contract shared by both apps
infra/           Docker Compose + Dockerfiles for Mongo/Redis/API/worker
docs/            Architecture, setup, API reference, and every other doc listed below
```

## Quick start

```bash
pnpm install
pnpm --filter @personal-agent/shared build
cp .env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env

# Start MongoDB + Redis (natively, or `pnpm docker:up` for everything in containers)
pnpm dev:api        # http://localhost:4000 - AI_PROVIDER=mock works with no API key
pnpm dev:worker      # reminder scheduler, separate terminal
pnpm dev:mobile      # Expo dev server - press `a` for the Android emulator
```

Full walkthrough, including how to point it at real OpenAI or a local Ollama model: `docs/setup.md`.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) - how the pieces fit together and why
- [`docs/setup.md`](docs/setup.md) - install, configure, run, seed, test
- [`docs/environment.md`](docs/environment.md) - every environment variable, backend and mobile
- [`docs/api.md`](docs/api.md) - full REST endpoint reference
- [`docs/ai-provider.md`](docs/ai-provider.md) - the `AIModelProvider` abstraction; OpenAI/Mock/Ollama
- [`docs/tool-development.md`](docs/tool-development.md) - how to add a new agent capability
- [`docs/scheduling.md`](docs/scheduling.md) - how reminders and recurrence actually work
- [`docs/music-integration.md`](docs/music-integration.md) - what's real vs. what a real
  third-party integration would require
- [`docs/permissions-and-security.md`](docs/permissions-and-security.md) - auth, ownership,
  approval flow, what the agent is barred from doing
- [`docs/mobile-simulator.md`](docs/mobile-simulator.md) - Android emulator walkthrough and results
- [`docs/testing.md`](docs/testing.md) - what's tested and how to run it
- [`docs/future-local-ai.md`](docs/future-local-ai.md) - swapping OpenAI for a self-hosted model
- [`docs/known-platform-limitations.md`](docs/known-platform-limitations.md) - what doesn't work
  yet, and why, in plain terms

## Status at a glance

- Backend: builds, typechecks (strict TS), **76/76 automated tests passing**, and was
  live-smoke-tested against real local MongoDB, Redis, and both the Mock and (real) Ollama AI
  providers.
- Mobile: builds, typechecks (strict TS), Jest suite passing; see `docs/mobile-simulator.md` for
  the actual emulator run and its results.
- See `docs/known-platform-limitations.md` for an honest list of what's foundation-only.

## License

Not specified - add one if you intend to distribute this.
