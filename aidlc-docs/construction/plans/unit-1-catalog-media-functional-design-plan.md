# Unit 1 Functional Design Plan

## Unit

**Catalog, Playlists, and Audio Streaming Foundation**  
**Stories**: US1.1-US1.4

## Objective

Define the technology-agnostic catalog, playlist-membership, media-delivery, error, and frontend-integration behavior for Unit 1 before NFR decisions or code generation. Preserve the existing UI while replacing mock catalog ownership with persisted backend data.

## Approved Constraints

- Keep the current frontend appearance and playback interaction.
- Persist five approved songs, four playlists, and real ordered membership.
- Expose catalog/playlists and stable song media URLs under `/api`.
- Support local byte-range delivery and environment-selected Cloudinary delivery.
- Use explicit local/provider modes with no silent fallback.
- Treat likes and authentication outside Unit 1 unless explicitly approved below.
- Apply behavior-first TDD through public interfaces during Code Generation.

## Applicability Review

| Category | Applicability | Design focus |
|---|---|---|
| Business logic modeling | Applicable | catalog hydration, playlist selection, playback resolution |
| Domain model | Applicable | Song, Playlist, PlaylistSong and stable identity |
| Business rules | Applicable | ordering, derived counts, supported ranges, provider selection |
| Data flow | Applicable | database to API to Zustand queue/player |
| Integration points | Applicable | PostgreSQL, local media, Cloudinary, Next.js client |
| Error handling | Applicable | catalog failure, missing song, invalid range, unavailable media |
| Business scenarios | Applicable | empty playlist, retry, seeking, deterministic seed replay |
| Frontend components | Applicable | store hydration, playlist filtering, player/karaoke URLs |

## Clarification Questions

### Question 1 - Stable Song and Playlist Identity

How should the current fixture identities be migrated into persistence?

A) Preserve `song-1` through `song-5` and current playlist IDs as stable public string IDs; seed by idempotent upsert (recommended)

B) Generate UUIDs and maintain a separate legacy-ID mapping

C) Replace them with auto-incrementing numeric IDs

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 2 - Playlist Membership and Selection

What should selecting a persisted playlist do?

A) Store ordered PlaylistSong membership, derive count from membership, and show exactly those songs in the existing catalog area (recommended)

B) Keep the current approximation that filters songs only by playlist mood

C) Start immediate playback of the first playlist song without filtering the catalog

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 3 - Catalog Filtering Boundary

Where should the current text and mood filtering occur in Unit 1?

A) Hydrate the full small catalog once; keep text/mood filtering in Zustand/UI, while playlist selection uses persisted membership from the API (recommended)

B) Send every text/mood change to server-side query parameters

C) Remove filters until the AI slice is implemented

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 4 - Anonymous Liked Songs

What happens to the current heart/liked behavior before authentication arrives in Unit 3?

A) Keep it as client session state in Zustand; do not add anonymous persistence to Unit 1 (recommended)

B) Persist likes in browser localStorage

C) Add an anonymous likes table and device identifier to the backend

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 5 - Local HTTP Range Contract

Which local-media request policy should the design adopt?

A) No Range returns full `200`; one satisfiable byte range returns `206`; malformed, multiple, or unsatisfiable ranges return safe `416` with `Content-Range: bytes */<size>` (recommended)

B) Require Range for every media request and reject full downloads

C) Accept multipart multi-range responses as well as single ranges

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 6 - Media Provider and Failure Semantics

How should stable media URLs resolve across provider modes?

A) Always expose `/api/audio/:songId`; local mode streams bytes, Cloudinary mode returns a short-lived signed redirect; unknown songs return `404`, known-but-unavailable media returns safe `503`, and modes never silently fall back (recommended)

B) Return raw local/Cloudinary URLs directly in catalog responses

C) Proxy Cloudinary bytes through NestJS for every request

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 7 - Cover and Lyrics Assets

How much asset migration belongs to Unit 1?

A) Move audio ownership behind the backend media route, retain current cover and `/lyrics/*.lrc` presentation URLs as catalog metadata, and defer a dedicated lyrics API (recommended)

B) Move audio, covers, and lyrics behind new NestJS binary endpoints now

C) Keep all current static asset URLs, including audio, and only demonstrate the streaming endpoint in tests

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 8 - Initial Catalog Failure UX

What should happen when the catalog API cannot load?

A) Do not silently restore mock data; expose a safe recoverable load error and retry action using the existing empty/loading visual language (recommended)

B) Fall back silently to the bundled mock catalog

C) Block the entire page with a technical error response

D) Other - describe after `[Answer]:`

[Answer]: A

## Generation Checklist

- [x] Read Unit 1 definition, story map, requirements, application design, and existing catalog/player seams.
- [x] Evaluate all Functional Design question categories.
- [x] Identify only unresolved business and interaction decisions.
- [x] Collect and validate all eight answers.
- [x] Resolve any ambiguous or conflicting answer through focused follow-up questions.
- [x] Generate `business-logic-model.md`.
- [x] Generate `business-rules.md`.
- [x] Generate `domain-entities.md`.
- [x] Generate `frontend-components.md`.
- [x] Validate US1.1-US1.4 traceability and Security/Resiliency/PBT constraints.
- [x] Request explicit Functional Design artifact approval before NFR Requirements.

## Status

All answers are A and internally consistent. Functional Design artifacts were generated and validated; the stage is paused at explicit artifact approval before NFR Requirements.
