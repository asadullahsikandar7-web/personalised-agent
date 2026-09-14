# Music Integration

## What's real today

`MusicProvider` (`apps/api/src/modules/music/providers/types.ts`) is the abstraction:

```ts
interface MusicProvider {
  getPlaybackState(userId): Promise<PlaybackState>;
  play(userId) / pause(userId) / resume(userId) / next(userId) / previous(userId): Promise<MusicResult>;
  search(userId, query): Promise<MusicTrack[]>;
  playTrack?(userId, trackId): Promise<MusicResult>;
  getProviderName(): MusicProviderName;
}
```

The only implementation shipped is `MockMusicProvider`: a small fixed catalog, with per-user
playback state (current track, position, volume, history) persisted in MongoDB
(`MusicPlayback`). Every action (`play`, `pause`, `next`, ...) is a real, working, persisted state
transition - not a stub - it's just playing from a demo catalog rather than a real streaming
service. This is what the mobile Music screen and the `music_*` agent tools actually exercise.

## What controlling a real third-party app would require

Directly controlling an already-installed app like Spotify or YouTube Music from another app is
not something Android or iOS grant to arbitrary third-party apps:

- **Android**: the officially supported mechanism is
  [`MediaSession`/`MediaController`](https://developer.android.com/guide/topics/media/media-session)
  - an app that owns playback exposes a `MediaSession`; another app can discover active sessions
    and send transport commands (play/pause/next) through a `MediaController`, *if* the target
    app has published a session and the OS grants notification-listener access to read the list
    of active sessions. This requires a native Android module (Kotlin/Java) - there is no
    JS-only, Expo-Go-compatible way to do this. It is not implemented in this build.
  - Search and "play this specific track" inside another app's catalog is not exposed this way
    at all; that requires that app's own API (e.g. the Spotify Web API) and its own OAuth flow.
- **iOS**: `MPRemoteCommandCenter`/`MPNowPlayingInfoCenter` let an app control *its own* audio
  session's remote-control events (lock screen, headphone buttons) but do not let one app drive
  another app's playback. Cross-app control on iOS is effectively limited to a small set of
  system-level features (AirPlay, Control Center's "now playing" card, which is the *current*
  now-playing app, not a target you choose) or the target app's own API, same as Android.

## Documented fallback

Given the above, the honest, officially-supported path to "play my Spotify playlist" without a
native module is: **open the target app via its documented deep link or URL scheme**
(`open_url` tool + `Linking.openURL` on the client), handing control to the user rather than
pretending the agent silently drove playback inside an app it has no access to. This is not yet
wired into a dedicated `music_open_external_app` tool, but the `open_url` tool and the mobile
app's `Linking` usage are the building blocks for it - see `docs/tool-development.md` for how to
add it.

## Roadmap for a real integration

1. A native Android module wrapping `MediaSessionManager`/`MediaController` (Kotlin), exposed to
   JS through an Expo Module, would let the app enumerate active media sessions and send
   transport commands to whichever one is playing - this is the most "real" cross-app control
   Android allows without the target app's cooperation, and would need
   `android.permission.BINDER_NOTIFICATION_LISTENER` (a "notification listener" special
   permission the user must grant manually in system settings - Android does not allow this to
   be requested via a normal runtime permission dialog).
2. Per-service integrations (Spotify Web API, Apple MusicKit) for anything beyond basic
   transport control - each with its own OAuth and API quota, added as additional
   `MusicProvider` implementations behind the same interface, so the mobile screen and the
   `music_*` tools don't change.

## Mobile screen

`app/(app)/music.tsx`: current track, play/pause/next/previous, a search box against the mock
catalog, and an explicit note in the empty state that this uses a local demo catalog - the app
never claims otherwise.
