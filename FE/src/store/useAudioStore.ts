'use client';

import { create } from 'zustand';
import { Song, Playlist } from '../types/music';
import { MOCK_SONGS, MOCK_PLAYLISTS } from '../lib/mock-songs';
import {
  createBackendPlaylist,
  recordSongPlay,
  toggleSongLike,
} from '../lib/api-client';

export type LibraryView = 'discover' | 'charts' | 'library';

interface AudioStore {
  // Playback state
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  seekTarget: number | null;
  volume: number;
  lastVolume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: Song[];
  catalog: Song[];
  chartsCatalog: Song[] | null;
  playlists: Playlist[];
  activePlaylistId: string | null;
  view: LibraryView;
  likedSectionActive: boolean;
  playbackError: string | null;
  playbackRequest: number;
  setPlaybackError: (error: string | null) => void;
  setView: (view: LibraryView, likedSection?: boolean) => void;
  selectPlaylist: (id: string) => void;
  createPlaylist: (title: string) => void;
  hydrateFromBackend: (payload: {
    songs: Song[];
    playlists: Playlist[];
    charts?: Song[];
  }) => void;
  resetFilters: () => void;

  // UI state
  isLyricsOpen: boolean;
  isAiDrawerOpen: boolean;
  selectedMood: string;
  searchQuery: string;
  isSearchingRemote: boolean;
  remoteSearchResults: Song[] | null;
  autoPipEnabled: boolean;
  crossfadeEnabled: boolean;
  crossfadeDuration: number;
  isCrossfading: boolean;

  // Actions
  setCurrentSong: (song: Song) => void;
  playSong: (song: Song) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (time: number) => void;
  clearSeekTarget: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  nextSong: () => void;
  prevSong: () => void;
  toggleLike: (songId: string) => void;
  toggleAutoPip: () => void;
  toggleCrossfade: () => void;
  setCrossfadeDuration: (seconds: number) => void;
  setIsCrossfading: (isCrossfading: boolean) => void;

  // Modals & search sync
  toggleLyrics: () => void;
  toggleAiDrawer: () => void;
  setMoodFilter: (mood: string) => void;
  setSearchQuery: (query: string) => void;
  setRemoteSearchState: (searching: boolean, results: Song[] | null) => void;
  mergeSongsIntoCatalog: (songs: Song[]) => void;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  currentSong: MOCK_SONGS[0],
  isPlaying: false,
  currentTime: 0,
  duration: MOCK_SONGS[0]?.duration ?? 240,
  seekTarget: null,
  volume: 0.8,
  lastVolume: 0.8,
  isMuted: false,
  isShuffle: false,
  repeatMode: 'all',
  queue: MOCK_SONGS,
  catalog: MOCK_SONGS,
  chartsCatalog: null,
  playlists: MOCK_PLAYLISTS,
  activePlaylistId: null,
  view: 'discover',
  likedSectionActive: false,
  playbackError: null,
  playbackRequest: 0,
  autoPipEnabled: true,
  crossfadeEnabled: true,
  crossfadeDuration: 5,
  isCrossfading: false,
  setPlaybackError: (playbackError) => set({ playbackError, ...(playbackError ? { isPlaying: false } : {}) }),
  setView: (view, likedSection = false) => set((s) => ({
    view,
    likedSectionActive: view === 'library' && Boolean(likedSection),
    activePlaylistId: null,
    selectedMood: 'all',
    searchQuery: '',
    isSearchingRemote: false,
    remoteSearchResults: null,
    queue: view === 'library'
      ? s.catalog.filter(x => x.liked)
      : view === 'charts'
        ? (s.chartsCatalog ?? [...s.catalog].reverse())
        : s.catalog,
  })),
  selectPlaylist: (id) => set((s) => {
    const playlist = s.playlists.find(p => p.id === id);
    if (!playlist) return {};
    return {
      activePlaylistId: id,
      view: 'discover',
      likedSectionActive: false,
      selectedMood: 'all',
      searchQuery: '',
      isSearchingRemote: false,
      remoteSearchResults: null,
      queue: playlist.songIds.flatMap(songId => s.catalog.filter(song => song.id === songId)),
    };
  }),
  createPlaylist: (title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const normalizedTitle = trimmed.slice(0, 80);
    const id = `local-${Date.now()}-${get().playlists.length}`;
    const initialSong = get().currentSong;
    const initialSongIds = initialSong ? [initialSong.id] : [];

    set((s) => ({
      playlists: [
        ...s.playlists,
        {
          id,
          title: normalizedTitle,
          description: 'Danh sách cá nhân',
          coverUrl: s.currentSong?.coverUrl ?? s.catalog[0]?.coverUrl ?? '',
          songIds: s.currentSong ? [s.currentSong.id] : [],
          songsCount: s.currentSong ? 1 : 0,
        },
      ],
      activePlaylistId: id,
      view: 'discover',
      likedSectionActive: false,
      selectedMood: 'all',
      searchQuery: '',
      queue: s.currentSong ? [s.currentSong] : [],
    }));

    if (typeof fetch === 'function') {
      void createBackendPlaylist({
        title: normalizedTitle,
        songIds: initialSongIds,
      })
        .then((created) => {
          if (!created) return;
          set((state) => ({
            playlists: state.playlists.map((p) => (p.id === id ? created : p)),
            activePlaylistId:
              state.activePlaylistId === id ? created.id : state.activePlaylistId,
          }));
        })
        .catch(() => undefined);
    }
  },
  hydrateFromBackend: (payload) => set((s) => {
    const songs = payload.songs.length > 0 ? payload.songs : s.catalog;
    const charts =
      payload.charts && payload.charts.length > 0 ? payload.charts : null;
    const backendIds = new Set(payload.playlists.map((p) => p.id));
    const localPlaylists = s.playlists.filter(
      (p) => p.id.startsWith('local-') && !backendIds.has(p.id),
    );
    const playlists = [...payload.playlists, ...localPlaylists];
    const activePlaylist = s.activePlaylistId
      ? playlists.find((p) => p.id === s.activePlaylistId)
      : undefined;
    const currentSong = s.currentSong
      ? (songs.find((song) => song.id === s.currentSong?.id) ??
        (!s.isPlaying ? (songs[0] ?? null) : s.currentSong))
      : (songs[0] ?? null);
    const nextDuration = currentSong?.duration ?? s.duration;
    const queue = activePlaylist
      ? activePlaylist.songIds.flatMap((id) =>
          songs.filter((song) => song.id === id),
        )
      : s.view === 'library'
        ? songs.filter((x) => x.liked)
        : s.view === 'charts'
          ? (charts ?? [...songs].reverse())
          : songs;

    return {
      catalog: songs,
      chartsCatalog: charts,
      playlists,
      currentSong,
      duration: nextDuration,
      queue,
    };
  }),

  isLyricsOpen: false,
  isAiDrawerOpen: false,
  selectedMood: 'all',
  searchQuery: '',
  isSearchingRemote: false,
  remoteSearchResults: null,

  setCurrentSong: (song) => set({ currentSong: song }),

  playSong: (song) => {
    set((state) => {
      const existing = state.catalog.find((s) => s.id === song.id);
      const resolvedSong = existing ? { ...existing, ...song } : song;
      const catalog = existing
        ? state.catalog.map((s) => (s.id === song.id ? resolvedSong : s))
        : [...state.catalog, resolvedSong];
      const chartsCatalog = state.chartsCatalog
        ? state.chartsCatalog.map((s) => (s.id === song.id ? { ...s, ...song } : s))
        : null;
      const remoteSearchResults = state.remoteSearchResults
        ? state.remoteSearchResults.map((s) => (s.id === song.id ? resolvedSong : s))
        : null;
      const inQueue = state.queue.some((s) => s.id === song.id);
      const isPlayingRemoteSearchResult =
        state.searchQuery.trim().length >= 2 &&
        Boolean(remoteSearchResults?.some((s) => s.id === song.id));
      const nextQueue = inQueue
        ? state.queue.map((s) => (s.id === song.id ? { ...s, ...song } : s))
        : isPlayingRemoteSearchResult && remoteSearchResults
          ? remoteSearchResults
          : catalog;

      return {
        catalog,
        chartsCatalog,
        remoteSearchResults,
        currentSong: resolvedSong,
        isPlaying: true,
        playbackError: null,
        playbackRequest: state.playbackRequest + 1,
        queue: nextQueue,
        ...(!inQueue
          ? isPlayingRemoteSearchResult
            ? {
                activePlaylistId: null,
                view: 'discover' as const,
                likedSectionActive: false,
              }
            : {
                activePlaylistId: null,
                view: 'discover' as const,
                likedSectionActive: false,
                selectedMood: 'all',
                searchQuery: '',
                isSearchingRemote: false,
                remoteSearchResults: null,
              }
          : {}),
        currentTime: 0,
        seekTarget: 0,
      };
    });

    if (typeof fetch === 'function') {
      void recordSongPlay(song.id).catch(() => undefined);
    }
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying, playbackError: null })),

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),

  seekTo: (time) => set({ currentTime: time, seekTarget: time }),
  clearSeekTarget: () => set({ seekTarget: null }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration: duration }),

  setVolume: (volume) => set((state) => ({
    volume,
    isMuted: volume === 0,
    ...(volume > 0 ? { lastVolume: volume } : { lastVolume: state.lastVolume }),
  })),
  toggleMute: () => set((state) => {
    if (state.isMuted) {
      const restored = state.volume > 0 ? state.volume : (state.lastVolume > 0 ? state.lastVolume : 0.8);
      return { isMuted: false, volume: restored };
    }
    return { isMuted: true };
  }),

  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleRepeat: () => set((state) => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(state.repeatMode) + 1) % modes.length;
    return { repeatMode: modes[nextIdx] };
  }),

  nextSong: () => {
    const { queue, currentSong, isShuffle, repeatMode } = get();
    if (!queue.length) return;
    set({ playbackError: null, playbackRequest: get().playbackRequest + 1 });

    const currentIdx = queue.findIndex((s) => s.id === currentSong?.id);
    if (currentIdx === queue.length - 1 && repeatMode === 'off') {
      set({ isPlaying: false, currentTime: 0, seekTarget: 0 });
      return;
    }

    // Xử lý riêng khi danh sách phát chỉ có đúng 1 bài
    if (queue.length === 1) {
      set({ currentSong: queue[0], isPlaying: true, currentTime: 0, seekTarget: 0 });
      return;
    }

    if (isShuffle) {
      const candidates = queue.filter((song) => song.id !== currentSong?.id);
      const randomSong = candidates[Math.floor(Math.random() * candidates.length)];
      set({ currentSong: randomSong, isPlaying: true, currentTime: 0, seekTarget: 0 });
      return;
    }

    const nextIdx = (currentIdx + 1) % queue.length;
    set({ currentSong: queue[nextIdx], isPlaying: true, currentTime: 0, seekTarget: 0 });
  },

  prevSong: () => {
    const { queue, currentSong, currentTime } = get();
    set({ playbackError: null, playbackRequest: get().playbackRequest + 1 });
    if (currentTime > 3) {
      set({ currentTime: 0, seekTarget: 0 });
      return;
    }
    if (!queue.length) return;
    const currentIdx = queue.findIndex((s) => s.id === currentSong?.id);
    const prevIdx = currentIdx === -1 ? 0 : (currentIdx - 1 + queue.length) % queue.length;
    set({ currentSong: queue[prevIdx], isPlaying: true, currentTime: 0, seekTarget: 0 });
  },

  toggleLike: (songId) => {
    set((state) => {
      const catalog = state.catalog.map(s => s.id === songId ? { ...s, liked: !s.liked } : s);
      const chartsCatalog = state.chartsCatalog
        ? state.chartsCatalog.map(s => s.id === songId ? { ...s, liked: !s.liked } : s)
        : null;
      const remoteSearchResults = state.remoteSearchResults
        ? state.remoteSearchResults.map(s => s.id === songId ? { ...s, liked: !s.liked } : s)
        : null;
      return {
        catalog,
        chartsCatalog,
        remoteSearchResults,
        queue: state.view === 'library' ? catalog.filter(s => s.liked) : state.queue.map((s) =>
          s.id === songId ? { ...s, liked: !s.liked } : s
        ),
        currentSong:
          state.currentSong?.id === songId
            ? { ...state.currentSong, liked: !state.currentSong.liked }
            : state.currentSong,
      };
    });

    if (typeof fetch === 'function') {
      void toggleSongLike(songId).catch(() => undefined);
    }
  },

  toggleLyrics: () =>
    set((state) => ({
      isLyricsOpen: !state.isLyricsOpen,
      isAiDrawerOpen: !state.isLyricsOpen ? false : state.isAiDrawerOpen,
    })),
  toggleAiDrawer: () =>
    set((state) => ({
      isAiDrawerOpen: !state.isAiDrawerOpen,
      isLyricsOpen: !state.isAiDrawerOpen ? false : state.isLyricsOpen,
    })),
  setMoodFilter: (mood) => {
    if (mood === 'liked') { get().setView('library', true); return; }
    set({ selectedMood: mood });
  },
  setSearchQuery: (query) =>
    set({
      searchQuery: query,
      ...(query.trim().length < 2
        ? { isSearchingRemote: false, remoteSearchResults: null }
        : {}),
    }),
  setRemoteSearchState: (isSearchingRemote, remoteSearchResults) =>
    set({ isSearchingRemote, remoteSearchResults }),
  mergeSongsIntoCatalog: (songs) => {
    if (!Array.isArray(songs) || songs.length === 0) {
      return;
    }
    set((state) => {
      const byId = new Map<string, Song>();
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        if (song && typeof song.id === 'string' && song.id) {
          byId.set(song.id, song);
        }
      }
      if (byId.size === 0) {
        return {};
      }

      const mergeSong = (existing: Song): Song => {
        const incoming = byId.get(existing.id);
        return incoming ? { ...existing, ...incoming } : existing;
      };

      const existingIds = new Set(state.catalog.map((s) => s.id));
      const catalog = state.catalog.map(mergeSong);
      byId.forEach((incoming) => {
        if (!existingIds.has(incoming.id)) {
          catalog.push(incoming);
        }
      });

      return {
        catalog,
        currentSong: state.currentSong ? mergeSong(state.currentSong) : null,
        queue: state.queue.map(mergeSong),
        chartsCatalog: state.chartsCatalog
          ? state.chartsCatalog.map(mergeSong)
          : null,
        remoteSearchResults: state.remoteSearchResults
          ? state.remoteSearchResults.map(mergeSong)
          : null,
      };
    });
  },
  toggleAutoPip: () => set((state) => ({ autoPipEnabled: !state.autoPipEnabled })),
  toggleCrossfade: () =>
    set((state) => {
      const nextEnabled = !state.crossfadeEnabled;
      return {
        crossfadeEnabled: nextEnabled,
        crossfadeDuration:
          nextEnabled && state.crossfadeDuration === 0
            ? 5
            : state.crossfadeDuration,
      };
    }),
  setCrossfadeDuration: (seconds: number) =>
    set(() => {
      const clamped = Math.max(0, Math.min(12, Math.round(Number(seconds) || 0)));
      return {
        crossfadeDuration: clamped,
        crossfadeEnabled: clamped > 0,
      };
    }),
  setIsCrossfading: (isCrossfading: boolean) => set({ isCrossfading }),
  resetFilters: () =>
    set({
      searchQuery: '',
      selectedMood: 'all',
      isSearchingRemote: false,
      remoteSearchResults: null,
    }),
}));
