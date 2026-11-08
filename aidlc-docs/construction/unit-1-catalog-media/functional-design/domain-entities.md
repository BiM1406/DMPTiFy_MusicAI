# Unit 1 Domain Entities

## Song

| Field | Meaning | Invariant |
|---|---|---|
| `id` | Stable public identity | Non-empty approved string; immutable |
| `title` | Display title | Bounded, non-blank |
| `artist` | Display artist | Bounded, non-blank |
| `album` | Display album | Bounded, non-blank |
| `durationSeconds` | Expected playback duration | Positive bounded number |
| `mediaKey` | Opaque storage identity | Server-owned; never a request path |
| `mediaContentType` | Trusted audio MIME type | Approved audio type |
| `coverUrl` | Existing cover presentation URL | Safe relative/approved URL |
| `lyricsUrl` | Existing LRC presentation URL | Safe relative/approved URL |
| `mood` | Filter/recommendation category | Approved mood vocabulary |
| `moodLabel` | Localized display label | Bounded, non-blank |
| `bpm` | Tempo metadata | Positive bounded integer |
| `catalogOrder` | Deterministic catalog position | Unique/non-negative within active catalog |
| `isActive` | Catalog visibility | Inactive songs are not public/playable |

`audioUrl` is a derived public projection `/api/audio/{id}`. `liked` is a frontend session overlay and is not part of Song persistence.

## Playlist

| Field | Meaning | Invariant |
|---|---|---|
| `id` | Stable public identity | Non-empty approved string; immutable |
| `title` | Display title | Bounded, non-blank |
| `description` | Display description | Bounded |
| `coverUrl` | Existing cover URL | Safe relative/approved URL |
| `mood` | Presentation/category hint | Approved mood or null |
| `isAiGenerated` | Existing visual badge | Boolean |
| `displayOrder` | Deterministic playlist order | Unique/non-negative |
| `isActive` | Playlist visibility | Inactive playlists are not public |

`songsCount` is derived from PlaylistSong and is never independently editable.

## PlaylistSong

| Field | Meaning | Invariant |
|---|---|---|
| `playlistId` | Owning playlist | References an existing Playlist |
| `songId` | Member song | References an existing Song |
| `position` | Playback/display order | Non-negative and unique per playlist |

The pair `(playlistId, songId)` is unique. Removing a membership changes the derived count immediately; deleting catalog records follows explicit referential rules rather than leaving orphans.

## Value Objects and Results

### SongView

Contract-safe song metadata including derived `audioUrl`; it excludes `mediaKey`, storage configuration, and persisted `liked` state.

### PlaylistSummaryView

Playlist metadata plus membership-derived `songsCount`.

### PlaylistDetailView

Playlist summary plus ordered Song views. An empty `songs` array is valid.

### ByteRange

Inclusive `start` and `end` with derived `length = end - start + 1`. It can exist only after validation against a positive `totalBytes`.

### MediaDelivery

A discriminated result with exactly one case:

- local full stream;
- local partial stream;
- signed redirect;
- range not satisfiable.

Missing song and provider-unavailable errors are domain/application failures rather than MediaDelivery success cases.

## Relationships

```text
Playlist 1 --- 0..* PlaylistSong 0..* --- 1 Song
Song     1 --- 1 MediaReference
```

Text alternative: playlists and songs have a many-to-many relationship resolved by ordered PlaylistSong membership. Each active song has exactly one media reference represented by its opaque media key and trusted type.

## Seed Mapping

- Existing `song-1` to `song-5` metadata is preserved; audio paths become opaque local keys and public audio URLs are derived.
- Existing `pl-1` to `pl-4` display metadata is preserved.
- Existing hard-coded counts are discarded and replaced with explicit seeded memberships appropriate to the available five-song catalog.
- Re-running the seed converges to the approved records and membership order without duplication.
