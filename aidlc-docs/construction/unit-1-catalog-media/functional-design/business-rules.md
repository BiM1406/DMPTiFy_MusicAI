# Unit 1 Business Rules

## Catalog Rules

- **CAT-01**: Public song IDs remain stable strings `song-1` through `song-5`; public playlist IDs remain `pl-1` through `pl-4`.
- **CAT-02**: Seeds are idempotent upserts keyed by stable public ID and produce the same five songs, four playlists, and memberships on every run.
- **CAT-03**: Only active, contract-valid songs and playlists are exposed.
- **CAT-04**: Catalog order is deterministic and defined by a persisted integer order, never database incidental order.
- **CAT-05**: Title, artist, album, mood label, cover URL, lyrics URL, and media URL must be display-safe strings within DTO/schema bounds.
- **CAT-06**: BPM and duration must be positive bounded values; mood must belong to the approved catalog vocabulary.
- **CAT-07**: `audioUrl` is derived as `/api/audio/{songId}` and is not a persisted provider URL.
- **CAT-08**: `liked` is not catalog data and must not appear as a persisted Song property in Unit 1.

## Playlist Rules

- **PL-01**: PlaylistSong membership is unique for each `(playlistId, songId)` pair.
- **PL-02**: Position is unique within a playlist and determines returned song order.
- **PL-03**: `songsCount` is calculated from current membership.
- **PL-04**: Playlist selection returns exact membership and must not approximate it using mood.
- **PL-05**: Empty playlists are valid and return an empty song collection.
- **PL-06**: Text and mood filtering remain client-side over the hydrated full catalog; they do not alter persisted membership.

## Media Rules

- **MED-01**: The client addresses media only through `/api/audio/:songId`.
- **MED-02**: A `mediaKey` comes only from a resolved Song record; request data can never become an arbitrary filesystem/provider path.
- **MED-03**: Local mode without Range returns `200` with full length, trusted media type, and `Accept-Ranges: bytes`.
- **MED-04**: Exactly one satisfiable range returns `206` and exactly the normalized inclusive bytes.
- **MED-05**: Start-end, open-ended, and suffix forms are supported. Normalized bounds satisfy `0 <= start <= end < totalBytes`.
- **MED-06**: Malformed, multiple, inverted, empty, zero-length suffix, or unsatisfiable ranges return `416`; no stream is opened for them.
- **MED-07**: A `416` response includes `Content-Range: bytes */{totalBytes}` when media size was resolved.
- **MED-08**: Cloudinary mode returns a short-lived signed redirect; secrets and unsigned transformation details never enter catalog responses.
- **MED-09**: Provider mode is explicit. Missing configuration fails fast and runtime failure never silently switches provider.
- **MED-10**: Unknown/inactive song is `404`; known song with inaccessible media is safe `503` with correlation ID.

## Frontend Rules

- **FE-01**: API data becomes the canonical queue after successful hydration; bundled mock songs are not a runtime fallback.
- **FE-02**: A catalog failure preserves a usable shell and presents a safe retry state in the existing visual language.
- **FE-03**: Session likes overlay canonical Song views by ID and update both queue and current-song projections.
- **FE-04**: Selecting a playlist constrains the visible/playing queue to its ordered membership; selecting Discover restores the full queue.
- **FE-05**: Existing search, mood, playback, seek, shuffle, repeat, karaoke, and player interactions retain their presentation and semantics.
- **FE-06**: Covers and `/lyrics/*.lrc` remain catalog metadata URLs in Unit 1; audio alone moves behind backend delivery.

## Security and Resiliency Rules

- Inputs are bounded and validated before repository or media access.
- Safe errors expose a stable code/message/correlation ID, not filesystem paths, stack traces, database details, or provider secrets.
- Database and media readiness are observable separately from liveness.
- Catalog requests and media metadata operations have bounded timeouts at implementation level.
- Range parser properties cover normalized bounds, exact length, never-out-of-bounds results, deterministic seed replay, and shrunk counterexamples.
