# Unit 1 Business Logic Model

## Business Outcome

DMPTiFy replaces its bundled catalog as the source of truth with a persisted five-song/four-playlist catalog while keeping the current discovery, playlist, player, seeking, and karaoke interactions. Every playable song exposes a stable backend media URL regardless of whether bytes come from local storage or Cloudinary.

## Boundary

Unit 1 owns catalog reads, ordered playlist membership, media-delivery decisions, deterministic seed behavior, and frontend catalog hydration. It does not own authenticated likes, user libraries, AI recommendations, payment, or email.

## Catalog Loading Flow

1. The frontend enters `loading` and requests the song catalog plus playlist summaries through one typed client boundary.
2. The catalog service reads active songs in deterministic `catalogOrder`, maps validated records to public Song views, and constructs `/api/audio/{songId}` as each `audioUrl`.
3. Playlist summaries derive `songsCount` from persisted PlaylistSong membership; no stored display count is trusted.
4. The frontend replaces the initial catalog queue with the returned Song views and stores playlist summaries.
5. The frontend enters `ready`; text and mood filters operate on the hydrated catalog without another request.
6. A safe request failure enters `error` with retry capability. Bundled mock data is not silently restored.

## Playlist Selection Flow

1. A listener selects a playlist in the existing Sidebar or playlist cards.
2. The client requests playlist detail by stable playlist ID if its ordered membership has not already been loaded.
3. The backend returns playlist metadata plus Song views ordered by PlaylistSong `position`.
4. The frontend sets `activePlaylistId` and derives its visible queue from exact membership, not the playlist mood.
5. An empty playlist produces an empty visible queue and reuses the existing empty-state presentation.
6. Selecting Discover clears `activePlaylistId` and restores the hydrated full catalog before applying text/mood filters.

## Anonymous Like Flow

`liked` is a client-only overlay for Unit 1. Toggling a heart updates the canonical hydrated queue and current-song projection for the browser session. The field is neither read from nor written to PostgreSQL. Authenticated persistence may be designed in a later unit without changing Song identity.

## Local Media Delivery Flow

1. The controller receives a stable song ID and optional `Range` header.
2. Catalog lookup either resolves one active Song with its opaque server-owned `mediaKey` or returns `404`.
3. The local adapter obtains trusted content type and total byte length for the resolved media object.
4. With no Range, the service returns a full-stream result: `200`, `Accept-Ranges: bytes`, total `Content-Length`, and media `Content-Type`.
5. With one satisfiable Range, the parser normalizes start/end and returns a bounded partial-stream result: `206`, `Content-Range`, `Accept-Ranges`, exact `Content-Length`, and content type.
6. A malformed, multiple, empty, inverted, or unsatisfiable range returns `416` with `Content-Range: bytes */{totalBytes}` and no file bytes.
7. Streams are opened only after range validation and are bounded to the approved byte interval.

## Cloudinary Media Delivery Flow

1. The same catalog lookup resolves the stable song and opaque `mediaKey`.
2. Explicit Cloudinary mode asks the adapter for a short-lived signed delivery URL.
3. The service returns a redirect result; the CDN serves full or ranged bytes.
4. Missing provider configuration fails application startup. Runtime provider failure returns a safe `503`; it never falls back to local storage.

## Failure Model

| Condition | Observable result |
|---|---|
| Unknown/inactive song or playlist | `404` safe API error |
| Invalid catalog record at serialization boundary | Record is rejected; technical values are not leaked |
| Known song with missing/unreadable media | `503` safe media-unavailable error with correlation ID |
| Malformed/multiple/unsatisfiable Range | `416` with total-size Content-Range when size is known |
| Catalog API unavailable in browser | Existing visual language shows recoverable error and retry |
| Empty playlist/filter result | Existing empty state, not an API failure |

## State Models

```text
Catalog UI: idle -> loading -> ready
                    |          |
                    v          v
                   error <- retry

Media result: song lookup -> local full | local partial | redirect
                     |             |
                     v             v
                    404       416 or safe 503
```

Text alternative: catalog hydration moves from idle to loading and then ready or error; retry returns from error to loading. A resolved song produces a local full stream, local partial stream, or Cloudinary redirect, while missing songs produce 404 and invalid ranges/provider failures produce 416 or safe 503.

## Story Traceability

| Story | Designed behavior |
|---|---|
| US1.1 | Persisted catalog hydration, stable Song views, safe retry state |
| US1.2 | Derived counts, ordered membership, exact playlist selection, empty playlist |
| US1.3 | Full/partial local streams, seeking, headers, 416 safety, signed redirect |
| US1.4 | Stable IDs, idempotent seed outcome, explicit provider modes, no fallback |
