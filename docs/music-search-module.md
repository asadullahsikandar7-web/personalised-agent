# Music Search Module

A search-only music catalog lookup, deliberately separate from `modules/music` (which controls
one active playback session - see `docs/music-integration.md`). This module never plays
anything; it returns normalized metadata so a playback system can be connected to it later.

## Why a separate module

`modules/music`'s `MusicProvider` is about *controlling* one active playback session (play,
pause, next, queue state) against whichever single provider is configured. This module is about
*finding* tracks across as many catalogs as are configured, independent of playback state. They
share no code and can evolve independently - a provider that's good at search (e.g. a
metadata-only catalog) doesn't need to also implement play/pause/queue semantics.

## Provider abstraction

`apps/api/src/modules/music-search/providers/types.ts`:

```ts
interface MusicSearchProvider {
  getProviderName(): MusicSearchProviderName;
  isConfigured(): boolean;
  search(query: string, limit: number): Promise<NormalizedTrackDTO[]>;
}
```

Two providers are shipped, both using officially documented endpoints only:

- **`YoutubeSearchProvider`** - YouTube Data API v3 `search.list` + `videos.list`. Configured via
  `YOUTUBE_API_KEY` (same key used by `modules/music`'s YouTube playback provider).
- **`JamendoSearchProvider`** - Jamendo API v3.0 `tracks/`. Configured via `JAMENDO_CLIENT_ID`
  (same id used by `modules/music`'s Jamendo playback provider).

Both intentionally set `sourceUrl` to the provider's **canonical webpage** for the track (a
YouTube watch URL, a Jamendo track page) rather than any stream/embed URL - this module never
returns anything playback-capable, by design, so it can't accidentally be used to route around
the ToS/licensing considerations documented for the playback providers in
`docs/music-integration.md`.

Adding a new provider (a future legitimate API): implement `MusicSearchProvider` in
`providers/<name>-search-provider.ts`, add it to `getAllProviders()` in `service.ts`, and add its
name to `MUSIC_SEARCH_PROVIDERS` in `packages/shared/src/constants/music-search.ts`. Nothing else
changes - the route, the agent tool, and the mobile screen are all provider-count-agnostic.

## Normalized result shape

```ts
interface NormalizedTrackDTO {
  title: string;
  artist: string;
  album: string | null;
  artwork: string | null;
  durationSeconds: number | null;
  provider: 'youtube' | 'jamendo';
  providerTrackId: string;
  sourceUrl: string;
}
```

## Query building

`buildCatalogSearchQuery` (`service.ts`) accepts either a single free-text `query`, or any
combination of `title`/`artist`/`album`/`genre`, which it joins into one text query per provider
(neither YouTube's nor Jamendo's search endpoint supports structured multi-field queries, so this
is the honest common denominator). At least one of the five fields is required - enforced by
`musicCatalogSearchQuerySchema` in `packages/shared/src/schemas/music-search.ts`.

## Handling missing keys, errors, rate limits, and fallback

`searchMusicCatalog` (`service.ts`) queries every provider matching the request's `provider`
filter (`youtube`, `jamendo`, or `all`) **in parallel**, and degrades per-provider rather than
failing the whole request:

- A provider with no API key configured is skipped and reported in `providersFailed` with
  reason `NOT_CONFIGURED` - never silently treated as "no results".
- A provider that errors (network failure, unexpected response) is reported with reason
  `PROVIDER_ERROR`.
- A provider that rate-limits (YouTube quota, Jamendo 429) is reported with reason
  `RATE_LIMITED`.
- Any other configured provider's results are still returned - one provider failing doesn't
  block the others (this is the "provider fallback" behavior: if YouTube's quota is exhausted,
  Jamendo results still come back, and vice versa).

The response is always `{ results, providersQueried, providersFailed }` - `results` is `[]`
rather than an error only when genuinely nothing was found or every provider is unconfigured, and
`providersFailed` always explains why, per this project's rule that the agent/API must never
present an empty or partial result as if it were complete.

## REST endpoint

`GET /api/music-search` (auth required, same as every other module):

| Query param | Type | Notes |
|---|---|---|
| `query` | string | Free-text; use this or the structured fields below |
| `title`, `artist`, `album`, `genre` | string | Combined into one query when `query` is omitted |
| `provider` | `youtube` \| `jamendo` \| `all` | Default `all` |
| `limit` | number (1-25) | Default 10 |

Returns `400` if none of `query`/`title`/`artist`/`album`/`genre` is given, `401` without auth,
otherwise `200` with the response shape above (including when every provider is unconfigured -
that's an honest empty result, not an error).

## Agent tool

`search_music_catalog` (`ai/tools/definitions/music-search.ts`, permission `safe`) wraps the same
service and is registered in the default tool registry alongside the existing `music_play` /
`music_search` (playback-catalog) tools - see `docs/tool-development.md`. It's distinct from the
existing `music_search` tool: that one searches only the single active playback provider's
catalog (for the "search then tap to play" flow on the Music screen); this one searches every
configured provider for reference/lookup purposes and never plays anything.

## Mobile screen

`app/(app)/music-search.tsx` - four text inputs (title/artist/album/genre), a results list
showing artwork, title, artist, album, duration, and a provider badge per result, plus an "Open"
link to the track's source page. Any `providersFailed` entries are shown as a small notice above
the results rather than hidden. Reached via a "Search all catalogs" link on the existing Music
screen (`app/(app)/music.tsx`), which stays focused on the single active playback provider.

## Environment variables

No new environment variables - this module reuses `YOUTUBE_API_KEY` and `JAMENDO_CLIENT_ID`,
already documented in `.env.example`. Neither key is ever sent to the mobile client; only the
normalized search results are.

## Tests

- `tests/unit/music-search.test.ts` - `buildCatalogSearchQuery`, and `searchMusicCatalog`
  aggregation/fallback/not-configured/rate-limit behavior with `fetch` mocked (no real network
  calls, no real API keys needed to run the suite).
- `tests/integration/music-search.test.ts` - the real route through the full app (auth
  requirement, validation, response shape, tool registration), with both providers forced
  unconfigured via a mocked `config/env` so the suite stays deterministic regardless of what a
  developer's local `.env` happens to contain.
