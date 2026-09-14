# Mobile Simulator / Emulator Testing

## Environment this was built and tested in

- macOS host with Android SDK already installed at `~/Library/Android/sdk`, two AVDs available
  (`Pixel_7`, `Tablet_36`), Java 17 (Temurin), and both emulators already running and fully
  booted (`adb devices` showed `emulator-5554` = Pixel_7, `emulator-5556` = Tablet_36).
- No Xcode (`xcrun simctl` unavailable) - iOS Simulator testing was not possible in this
  environment. The app is written to be iOS-compatible (no Android-only APIs used directly; see
  `docs/architecture.md`), but it has only actually been run on Android here.

## What was actually run

```bash
pnpm dev:api      # against real local MongoDB + Redis, AI_PROVIDER=mock
pnpm dev:worker
npx expo start --android   # from apps/mobile
```

`expo start --android` targets the already-booted `Pixel_7` emulator. Since Expo Go was not
already installed on that AVD, Expo's CLI needed to download and install it - the SDK 57 build
of Expo Go is a ~200MB APK, and the download in this sandboxed environment was measured at
roughly 90-150 KB/s, i.e. 25-40 minutes just to fetch Expo Go once. That download was started and
[is / was] tracked in this session; see the completion report for its outcome by the time this
document was finalized - if it did not finish in time, the honest status is "backend fully
verified live; mobile app verified via `tsc`, ESLint, and the Jest suite, but the on-emulator
click-through was not completed within this session's time budget," which is exactly what
section 26 of the brief asks to report rather than claim.

## Checklist (from the product brief, section 26)

| # | Step | Status |
|---|---|---|
| 1-8 | Node/pnpm/Expo installed, Android SDK verified, emulator detected, Mongo+Redis started, API+worker started | ✅ Done - see `docs/setup.md` |
| 9-11 | Start Expo, launch emulator, open the app | See note above on Expo Go install time |
| 12 | Register/login | ✅ Verified via curl against the live API (see below); UI-level tap-through pending Expo Go install |
| 13-14 | Send a text command, get a provider response | ✅ Verified live against the Mock provider *and* against a real local Ollama (`qwen3:4b`) - see `docs/ai-provider.md` |
| 15 | Create a task via voice/text | ✅ Verified live via the API (`create_task` through natural language) |
| 16 | Create a reminder | ✅ Verified live - a real BullMQ job was created and inspected |
| 17 | View the schedule | ✅ `GET /api/reminders` verified live |
| 18 | Memory creation | ✅ Verified live, including the sensitive-content rejection path |
| 19 | Music screen / supported controls | ✅ Verified live against the mock provider (play/state) |
| 20 | Notifications | Foundation verified (in-app `Notification` documents are created on trigger); OS push not implemented - see `docs/known-platform-limitations.md` |
| 21 | Approval flow | ✅ Verified live end-to-end: create -> pending -> approve -> honestly-reported non-delivery, and separately create -> reject -> permanently rejected |
| 22 | Logout / session restoration | ✅ Covered by the automated integration test suite (`tests/integration/auth.test.ts`) |

"Verified live" above means an actual running Fastify process against real local MongoDB and
Redis was driven with `curl`/automated tests - not just read from source. See the final
completion report for the precise commands and responses.

## If you don't have an emulator yet

```bash
# List/create an AVD (Android Studio's Device Manager works too)
sdkmanager --list
avdmanager create avd -n Pixel_7 -k "system-image;android-34;google_apis;arm64-v8a"
emulator -avd Pixel_7
```

Then `npx expo start --android` from `apps/mobile` once it's booted (`adb devices` shows
`device`, not `offline`).

## Physical device alternative

Scan the QR code `npx expo start` prints with Expo Go on a phone on the same Wi-Fi network as
your dev machine, and set `EXPO_PUBLIC_API_BASE_URL` to your machine's LAN IP (not `10.0.2.2`,
which is emulator-only) in `apps/mobile/.env`.
