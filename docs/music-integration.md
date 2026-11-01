# Music Integration

> This doc covers *playback* (one active provider, play/pause/next/queue). For search-only,
> multi-provider catalog lookup with no playback (used for reference/browsing, normalized across
> providers), see `docs/music-search-module.md`.

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

Three implementations are shipped, tried in this priority order (`providers/factory.ts`):

- **`YoutubeMusicProvider`** (used when `YOUTUBE_API_KEY` is set - highest priority): real search
  against the YouTube Data API v3 (`search.list` + `videos.list` for duration/artwork), with
  per-user playback state persisted in MongoDB (`MusicPlayback`). Chosen as the default over
  Jamendo because it has real mainstream/commercial catalog coverage - Jamendo's catalog is
  Creative-Commons-only by design and will never include label artists. The Data API only
  returns metadata - it cannot stream audio, and extracting raw audio/video streams outside the
  official player (including via third-party "extraction as a service" APIs) violates YouTube's
  Terms of Service and is not something this build does. Actual playback happens on-device via
  the official YouTube IFrame Player, embedded in a `WebView` (`src/components/YoutubePlayer.tsx`,
  using `react-native-webview`) that mirrors `currentTrack.id` (a YouTube video ID) and `state`
  from this provider. Two real-world caveats found in practice: the free API key has a **daily
  quota** (~10,000 units; each search costs ~100-140) after which search honestly fails rather
  than silently returning nothing (enabling billing on the Google Cloud project raises this
  substantially), and individual videos can have **embedding disabled by their owner** (common
  for label-uploaded "- Topic" auto-generated channel tracks; the embedded player reports a clear
  `onError` code in that case rather than pretending to play - pick a different search result).
- **`JamendoMusicProvider`** (used when only `JAMENDO_CLIENT_ID` is set): real full-track search
  and streaming via the [Jamendo API](https://developer.jamendo.com/v3.0), no OAuth required (a
  free `client_id` is enough). Every track in Jamendo's catalog is Creative-Commons-licensed
  independent music, so there are no per-track embedding restrictions and no quota surprises -
  but no mainstream/commercial artists either, ever. `search()` returns a direct MP3 `streamUrl`
  per track; playback on the mobile client is a real native audio player
  (`src/components/JamendoAudioPlayer.tsx`, using `expo-audio`'s `useAudioPlayer`) - no embedded
  video view needed at all, since Jamendo serves the audio file directly.
- **`MockMusicProvider`** (default, used when neither key is set): a small fixed catalog, with
  the same per-user playback state persistence. Every action (`play`, `pause`, `next`, ...) is a
  real, working, persisted state transition - not a stub - it's just playing from a demo catalog
  rather than a real streaming service.

All three implement the same `MusicProvider` interface, so `next`/`previous` walk the same
per-user `history` queue (Jamendo/YouTube have no fixed catalog to fall back to, so both honestly
fail with a clear message when there's nothing queued yet), and the `music_*` agent tools and the
mobile Music screen work unchanged against any of them.

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

`app/(app)/music.tsx`: current track, play/pause/next/previous, a search box, and an explicit
note in the empty state naming which provider is active (mock demo catalog, real Jamendo, or
real YouTube) - the app never claims otherwise. When the active provider is `jamendo`, the
headless `JamendoAudioPlayer` drives real playback; when it's `youtube`, the embedded
`YoutubePlayer` renders above the track info instead. A search failure (e.g. YouTube's quota, or
a Jamendo rate limit) surfaces as a real error with a Retry button, not a silent empty list.
