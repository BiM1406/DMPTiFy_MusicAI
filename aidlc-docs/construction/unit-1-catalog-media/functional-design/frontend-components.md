# Unit 1 Frontend Component Design

## Scope

The current visual hierarchy remains unchanged. Unit 1 adds a typed data boundary and state needed to hydrate existing components; it does not redesign pages or introduce a new catalog screen.

## Typed Client Boundary

```ts
interface CatalogApiClient {
  listSongs(): Promise<SongView[]>;
  listPlaylists(): Promise<PlaylistSummaryView[]>;
  getPlaylist(playlistId: string): Promise<PlaylistDetailView>;
}
```

The common API client owns base URL, JSON decoding, safe-error mapping, and later credential support. Components never construct provider URLs or parse backend error internals.

## Store Additions

```ts
type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

interface CatalogState {
  catalog: Song[];
  queue: Song[];
  playlists: PlaylistSummary[];
  activePlaylistId: string | null;
  catalogStatus: CatalogStatus;
  catalogError: SafeUiError | null;
  hydrateCatalog(): Promise<void>;
  retryCatalog(): Promise<void>;
  selectPlaylist(playlistId: string): Promise<void>;
  clearPlaylist(): void;
}
```

- `catalog` is the hydrated full catalog and filter source.
- `queue` is the active playback/visible collection and continues to own transient `liked` overlays.
- Successful hydration selects the first song only when no valid current song exists; it must not interrupt an already valid playback selection.
- Playlist selection replaces `queue` with exact ordered membership. Discover clears the playlist and restores the catalog.
- Text/mood filtering remains selector-derived client behavior over the appropriate base collection.

## Component Responsibilities

| Component | Unit 1 behavior |
|---|---|
| Home/page composition | Starts catalog hydration once and preserves current layout |
| MainContent | Reads hydrated songs/playlists; displays loading, retry, or existing empty state; keeps current cards and filters |
| Sidebar | Renders persisted playlists and selects by playlist ID; Discover clears selection |
| BottomPlayer/audio element | Uses derived backend `audioUrl`; current seek/playback controls remain unchanged |
| KaraokeLyricsModal | Continues loading the catalog-provided `/lyrics/*.lrc` URL |
| API client | Centralizes contracts and safe error mapping |

## Interaction Flows

### Initial Load

1. Page requests hydration.
2. Existing content shell remains visible with a minimal loading state.
3. Songs and playlists succeed together into canonical state or fail into one safe retry state.
4. No hidden mock fallback occurs.

### Select Playlist

1. Sidebar/card sends stable playlist ID.
2. Store obtains/caches detail through the client.
3. Queue and visible cards become ordered membership.
4. Empty membership displays the existing empty-state pattern.

### Like Song

1. Heart click stops card playback propagation.
2. Store toggles the session overlay by stable song ID.
3. Queue and currentSong stay consistent.

### Playback and Seek

1. Song card passes the persisted Song view to existing `playSong`.
2. Audio element loads `/api/audio/{songId}`.
3. Browser Range requests are handled transparently by the backend/CDN.
4. Existing `seekTarget`, repeat, shuffle, lyrics, and player behavior remains unchanged.

## Error and Empty States

- Catalog transport/server failure: safe message plus retry; never technical stack/provider details.
- No search/mood matches: existing empty state and reset-filter action.
- Empty playlist: existing empty state with playlist context.
- Playback delivery failure: stop/retain current selection and surface a small recoverable playback error using existing visual language; catalog data remains available.

## Automation and Testability

Interactive integration seams receive stable `data-testid` values during implementation, including catalog retry, playlist selection, song play, and like actions. Frontend tests observe public store/component behavior and mock only the HTTP boundary, not Zustand internals.

## Explicit Non-Goals

- Persisting likes or user libraries.
- Changing the Sidebar/MainContent/BottomPlayer visual design.
- Moving covers or lyrics behind new NestJS endpoints.
- Adding Gemini, authentication, VIP payment, or invoice behavior.
