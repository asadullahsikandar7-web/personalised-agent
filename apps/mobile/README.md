# Personal Agent Mobile

Expo Router app (Android-first, iOS-compatible). Talks only to the Personal Agent backend - it
never calls an AI provider directly and never bundles a secret. See the root `docs/` for full
documentation, especially `docs/mobile-simulator.md` and `docs/known-platform-limitations.md`.

## Run

```bash
cp .env.example .env   # then edit EXPO_PUBLIC_API_BASE_URL if your backend isn't at the default
pnpm start              # Expo dev server - press `a` for Android, `i` for iOS, `w` for web
pnpm android            # shortcut for `start --android`
pnpm typecheck
pnpm lint
pnpm test               # Jest + React Native Testing Library
```

The backend (`apps/api`) must be running and reachable - see the root README's quick start.
Android emulators reach your host machine via `10.0.2.2`, not `localhost` (already the default
in `.env.example`).

## Voice input

Real on-device speech recognition (`expo-speech-recognition`) requires a development build - it
does **not** work in Expo Go, which cannot load third-party native modules. Running via Expo Go
is still fully useful for everything else (every screen, all CRUD flows, the approval flow, chat,
music, settings): the Assistant screen detects that voice is unavailable and falls back to a
text input automatically. See `docs/known-platform-limitations.md`.

## Layout

`app/` is routes only (Expo Router, file-based) - no business logic lives there. `src/hooks` has
one TanStack Query hook file per backend resource; `src/stores` is Zustand for session/theme only
(everything else is server state, not client state); `src/components` are the shared UI
primitives every screen is built from. See `docs/architecture.md`.
