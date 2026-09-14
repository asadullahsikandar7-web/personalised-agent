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

- The `web_search` tool always returns `NOT_CONFIGURED` unless `WEB_SEARCH_PROVIDER` and
  `WEB_SEARCH_API_KEY` are both set - no provider was approved/available for this build, so it
  was never wired up beyond the "not configured" honest response. See `docs/tool-development.md`
  for how to add one.

## Sending messages

- `send_message` always requires approval, and once approved, honestly reports that nothing was
  actually delivered - no email/SMS/chat provider is configured in this build. The approval flow
  itself (create -> review -> approve/reject -> execute) is fully real and tested; only the final
  delivery step is a documented gap, not a fake success.

## Push notifications

- In-app notifications (shown on the Notifications screen, backed by the `Notification` model)
  work end-to-end today for every triggered reminder.
- Actual OS push notifications (a reminder firing while the app is closed) require: (a) the
  mobile app registering for an Expo push token (`expo-notifications`' `getExpoPushTokenAsync`,
  which itself requires a physical device or specific emulator/Play-Services setup - it does not
  work on an emulator without Google Play Services correctly configured) and sending it to
  `PATCH /api/users/me/preferences`, and (b) the reminder worker calling Expo's push API with
  that token when a reminder triggers. The `pushToken` field and `PUSH_NOTIFICATION_PROVIDER` env
  var exist as the foundation; the worker does not yet make that push call. Local notifications
  scheduled directly on-device via `expo-notifications` (which work without any of the above) are
  also not yet wired into the reminder screens - today, "did I get reminded" surfaces through the
  in-app Notifications screen, which requires the app to be open (or backgrounded with polling)
  to see promptly.

## Custom recurrence

- `recurrenceRule.type: 'custom'` accepts and stores a `cronExpression`, but it is not evaluated
  - such a reminder currently behaves as one-time. `daily`/`weekly`/`monthly` are fully
  implemented and timezone-aware.

## Password reset email delivery

- `POST /api/auth/forgot-password` generates and stores a real, single-use, time-limited reset
  token, but no email provider is configured to deliver it. In non-production environments the
  response includes `devResetToken` specifically so this can be tested locally without email -
  see `docs/setup.md`. In production this would need a transactional email provider wired into
  that route.

## OpenAI provider

- Implemented against the official SDK's documented types, but not exercised against a live
  API key in the environment this was built in (none was available/approved to test with). See
  `docs/ai-provider.md`.

## Emulator vs. physical device

- Local (in-app) reminder/approval notifications work in the emulator.
- Anything requiring Google Play Services (real push tokens, some `expo-notifications`
  behaviors) should be verified on a physical device or an emulator image with Play Services,
  not assumed from emulator testing - see `docs/mobile-simulator.md`.
