# Known Platform Limitations

Honest accounting of what does and doesn't work today, and why. Nothing in this build fakes a
capability it doesn't have - where something can't be done, the tool/screen says so.

## Voice recognition

- **Not available in Expo Go.** `expo-speech-recognition` ships real native code; Expo Go cannot
  load third-party native modules. The Assistant screen detects this (the module throws when
  called) and falls back to a labeled text input with a visible explanation - it does not pretend
  voice is working. To get real on-device STT, build a development client
  (`npx expo run:android` or an EAS development build) instead of using Expo Go.
- Even in a development build, this is **foreground-only, push-to-talk** recognition - the user
  taps the mic, speaks, and it stops on silence or a manual stop. There is no always-listening
  wake-word mode, and none is planned - that would require a persistent foreground service with
  its own battery/privacy tradeoffs well beyond this build's scope, and iOS does not allow
  background microphone access for third-party apps at all outside narrow, declared use cases.
- Lock-screen or background voice activation is not supported on either platform for a normal
  app, full stop - this is an OS restriction, not a missing feature.

## Music control

- Only a local mock/demo catalog is actually controllable today. Real playback control of an
  already-installed third-party app (Spotify, YouTube Music, etc.) requires a native Android
  `MediaSession`/`MediaController` bridge (not built) or that app's own API - see
  `docs/music-integration.md` for exactly what's possible and what a real integration requires.

## Web search

- The `web_search` tool is wired to the real Brave Search API
  (`src/ai/tools/definitions/web-search.ts`) when `WEB_SEARCH_PROVIDER=brave` and
  `WEB_SEARCH_API_KEY` are both set (get a free-tier key at brave.com/search/api). Without both
  set, it honestly returns `NOT_CONFIGURED` rather than fabricating results. Any provider other
  than `brave` still returns `NOT_IMPLEMENTED` - see `docs/tool-development.md` to add one.

## Sending messages

- `send_message` always requires approval. Once approved, if the recipient is an email address
  and `RESEND_API_KEY` is set, it actually delivers the message via Resend
  (`src/modules/notifications/email.ts`). Non-email recipients (SMS/chat) and any request when
  Resend isn't configured still honestly report that nothing was sent - no SMS/chat provider is
  wired up in this build. Resend's shared `onboarding@resend.dev` sandbox sender only delivers to
  the Resend account's own verified email; sending to arbitrary recipients requires verifying a
  domain in Resend and setting `EMAIL_FROM` to an address on it.

## Push notifications

- In-app notifications (shown on the Notifications screen, backed by the `Notification` model)
  work end-to-end today for every triggered reminder.
- Actual OS push notifications (a reminder firing while the app is closed) are now fully wired:
  granting notification permission on the Permissions screen calls
  `registerForPushNotificationsAsync` (`src/services/push-notifications.ts`), which requests an
  Expo push token and saves it via `PATCH /api/users/me/preferences`; the reminder worker
  (`reminder-worker.ts`) calls Expo's push API (`src/modules/notifications/push.ts`) with that
  token whenever `defaultReminderChannel` is `push`. What this still depends on, honestly:
  - **An EAS `projectId`.** `getExpoPushTokenAsync` cannot mint a token without one configured in
    `app.json` (`extra.eas.projectId`), which requires an Expo account and running `eas init`.
    Without it, registration no-ops and logs a warning rather than faking a token.
  - **A physical device or an emulator image with Google Play Services correctly configured** -
    Android remote-notification support was removed from Expo Go as of SDK 53 either way, so this
    needs a development build regardless.
  - Local notifications scheduled directly on-device via `expo-notifications` (which would work
    without either of the above) are still not wired into the reminder screens - "did I get
    reminded" without a real push token still surfaces only through the in-app Notifications
    screen.

## Password reset email delivery

- `POST /api/auth/forgot-password` generates and stores a real, single-use, time-limited reset
  token, and now sends it via Resend (same `EMAIL_FROM`/`RESEND_API_KEY` config as `send_message`
  above) as a `personalagent://auth/reset-password?token=...` deep link when `RESEND_API_KEY` is
  set. Without it, no email is sent. In non-production environments the response also includes
  `devResetToken` regardless, so this can still be tested locally without email - see
  `docs/setup.md`.

## OpenAI provider

- Implemented against the official SDK's documented types. Set `AI_PROVIDER=openai` and
  `OPENAI_API_KEY` to use it instead of the deterministic mock provider.

## Emulator vs. physical device

- Local (in-app) reminder/approval notifications work in the emulator.
- Anything requiring Google Play Services (real push tokens, some `expo-notifications`
  behaviors) should be verified on a physical device or an emulator image with Play Services,
  not assumed from emulator testing - see `docs/mobile-simulator.md`.
