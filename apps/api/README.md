# Personal Agent API

Fastify + TypeScript backend. The only part of this system that holds AI provider credentials or
talks to OpenAI/Ollama - see the root `docs/` for full documentation, especially
`docs/architecture.md` and `docs/api.md`.

## Run

```bash
cp ../../.env.example .env   # then edit as needed - see docs/environment.md
pnpm dev            # tsx watch, http://localhost:4000, Swagger UI at /docs
pnpm dev:worker      # reminder worker, separate process/terminal
pnpm build && pnpm start   # production build
pnpm db:seed         # demo data - see docs/setup.md for credentials
pnpm test            # vitest - needs local Redis; Mongo is ephemeral (mongodb-memory-server)
pnpm typecheck
pnpm lint
```

## Layout

See `docs/architecture.md` for the full breakdown. Short version: `db/models` are the only
Mongoose schemas, `modules/*/service.ts` hold business logic, `modules/*/routes.ts` are thin HTTP
adapters, and everything AI-related lives under `ai/` (`providers`, `tools`, `tool-calling`,
`orchestration`, `prompts`).
