# Environment Variables

## Backend (`apps/api/.env`, from `.env.example` at the repo root)

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `4000` | HTTP port the API listens on |
| `API_BASE_URL` | `http://localhost:4000` | Used in a couple of log lines; not load-bearing |
| `MONGODB_URI` | `mongodb://localhost:27017/personal_agent` | |
| `REDIS_URL` | `redis://localhost:6379` | Used for both BullMQ and any future caching |
| `JWT_ACCESS_SECRET` | dev placeholder | **Change for anything beyond local dev.** Signs access tokens |
| `JWT_REFRESH_SECRET` | dev placeholder | **Change for anything beyond local dev.** Used to hash-compare stored refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Refresh token lifetime |
| `AI_PROVIDER` | `mock` | `mock` \| `openai` \| `ollama` - see `docs/ai-provider.md` |
| `OPENAI_API_KEY` | empty | Required only when `AI_PROVIDER=openai`. **Never put this in the mobile app.** |
| `OPENAI_MODEL` | `gpt-4o-mini` | Any Chat-Completions-compatible model with tool calling |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Required only when `AI_PROVIDER=ollama` |
| `OLLAMA_MODEL` | `qwen3:4b` | Must be a tool-calling-capable model pulled into your Ollama install |
| `MOBILE_APP_SCHEME` | `personalagent` | Deep link scheme, must match `apps/mobile/app.json`'s `expo.scheme` |
| `CORS_ORIGINS` | `*` | Comma-separated list in anything beyond local dev; `*` is fine for local Expo dev |
| `PUSH_NOTIFICATION_PROVIDER` | empty | Foundation only - see `docs/known-platform-limitations.md` |
| `WEB_SEARCH_PROVIDER` / `WEB_SEARCH_API_KEY` | empty | Optional; the `web_search` tool reports "not configured" until both are set and a real provider is wired in |
| `LOG_LEVEL` | `info` | pino log level |

All of the above are validated at startup with Zod (`src/config/env.ts`) - the server refuses to
start with a missing/invalid value rather than running with `undefined` silently.

## Mobile (`apps/mobile/.env`, from `apps/mobile/.env.example`)

Expo only inlines variables prefixed `EXPO_PUBLIC_` into the JS bundle. This is the entire
configuration surface of the app - there is nowhere else to put a secret, which is precisely
why no secret belongs here.

| Variable | Default | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `http://10.0.2.2:4000` | `10.0.2.2` is the Android emulator's alias for the host machine. Use your machine's LAN IP for a physical device, or `http://localhost:4000` for iOS simulator |
| `EXPO_PUBLIC_APP_SCHEME` | `personalagent` | Must match `apps/mobile/app.json`'s `expo.scheme` |

## Never commit `.env`

Both `.gitignore` files exclude `.env*` except the `.env.example` templates. If you ever commit a
real secret, rotate it - don't rely on removing it from history alone.
