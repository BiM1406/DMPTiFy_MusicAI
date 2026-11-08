# API Documentation

## REST API

### Runtime Root Endpoint

- **Method**: GET
- **Path**: `/api`
- **Purpose**: scaffold response only.
- **Request**: no body or parameters.
- **Response**: plain text `Hello World!` with HTTP 200.
- **Limitations**: no versioning, DTO, validation, authentication, OpenAPI, health semantics, or domain contract.

## Test/Runtime Contract Mismatch

The E2E test creates `AppModule` directly and requests `/`, while production bootstrap adds the `/api` prefix. The test therefore does not exercise production bootstrap configuration.

## Frontend Internal Interfaces

### Sidebar

- `isMobileOpen: boolean`
- `onMobileClose(): void`

### TopNav

- `onMenuClick(): void`

### Audio Store Playback API

- `playSong(song: Song): void`
- `togglePlay(): void`
- `pause(): void`
- `resume(): void`
- `nextSong(): void`
- `prevSong(): void`
- `seekTo(time: number): void`
- `clearSeekTarget(): void`

### Audio Store Preferences and UI API

- `setVolume(volume: number): void`
- `toggleMute(): void`
- `toggleShuffle(): void`
- `toggleRepeat(): void`
- `toggleLike(songId: string): void`
- `setMoodFilter(mood: string): void`
- `setSearchQuery(query: string): void`
- `toggleLyrics(): void`
- `toggleAiDrawer(): void`

## Data Models

### Song

- `id`, `title`, `artist`, `album`: string metadata.
- `duration`, `bpm`: numeric metadata.
- `audioUrl`, `coverUrl`, optional `lyricsUrl`: asset locations.
- `mood`: `chill | sad | energetic | focus | acoustic`.
- `moodLabel`: display label.
- `liked`: optional in-memory preference.

### Playlist

- `id`, `title`, `description`, `coverUrl`.
- `songsCount`: display-only count.
- optional `mood` and `isAiGenerated`.
- No song membership, owner, visibility, or persistence fields.

### LyricLine

- `time: number` in seconds.
- `text: string`.

## Missing Target Contracts

No implemented API contract exists for catalog, playlists, likes, history, recommendations, identity, subscription, payment, webhook, media, or email. These must be defined during Requirements and Application Design rather than inferred from README labels alone.
