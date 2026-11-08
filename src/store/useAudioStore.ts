'use client';

import { create } from 'zustand';
import { Song, LyricLine, Playlist } from '../types/music';
import { MOCK_SONGS, MOCK_PLAYLISTS } from '../lib/mock-songs';

export type LibraryView = 'discover' | 'charts' | 'library';

interface AudioStore {
  // Playback state
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  seekTarget: number | null;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: Song[];
  catalog: Song[];
  playlists: Playlist[];
  activePlaylistId: string | null;
  view: LibraryView;
  playbackError: string | null;
  playbackRequest: number;
  setPlaybackError: (error: string | null) => void;
  setView: (view: LibraryView) => void;
  selectPlaylist: (id: string) => void;
  createPlaylist: (title: string) => void;
  resetFilters: () => void;
  
  // UI state
  isLyricsOpen: boolean;
  isAiDrawerOpen: boolean;
  selectedMood: string;
  searchQuery: string;
  lyrics: LyricLine[];

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
  
  // Modals
  toggleLyrics: () => void;
  toggleAiDrawer: () => void;
  setMoodFilter: (mood: string) => void;
  setSearchQuery: (query: string) => void;
  setLyrics: (lyrics: LyricLine[]) => void;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  currentSong: MOCK_SONGS[0],
  isPlaying: false,
  currentTime: 0,
  duration: 30,
  seekTarget: null,
  volume: 0.8,
  isMuted: false,
  isShuffle: false,
  repeatMode: 'all',
  queue: MOCK_SONGS,
  catalog: MOCK_SONGS,
  playlists: MOCK_PLAYLISTS,
  activePlaylistId: null,
  view: 'discover',
  playbackError: null,
  playbackRequest: 0,
  setPlaybackError: (playbackError) => set({ playbackError, ...(playbackError ? { isPlaying: false } : {}) }),
  setView: (view) => set((s) => ({ view, activePlaylistId: null, selectedMood: 'all', searchQuery: '', queue: view === 'library' ? s.catalog.filter(x => x.liked) : view === 'charts' ? [...s.catalog].reverse() : s.catalog })),
  selectPlaylist: (id) => set((s) => {
    const playlist = s.playlists.find(p => p.id === id);
    if (!playlist) return {};
    return { activePlaylistId: id, view: 'discover', selectedMood: 'all', searchQuery: '',
      queue: playlist.songIds.flatMap(id => s.catalog.filter(song => song.id === id)) };
  }),
  createPlaylist: (title) => set((s) => {
    if (!title.trim()) return {};
    const id = `local-${Date.now()}-${s.playlists.length}`;
    return { playlists: [...s.playlists, { id, title: title.trim().slice(0, 80), description: 'Danh sách của bạn · lưu trong phiên này', coverUrl: '/covers/cover-1.svg', songIds: s.currentSong ? [s.currentSong.id] : [], songsCount: s.currentSong ? 1 : 0 }], activePlaylistId: id, view: 'discover', selectedMood: 'all', searchQuery: '', queue: s.currentSong ? [s.currentSong] : [] };
  }),
  
  isLyricsOpen: false,
  isAiDrawerOpen: false,
  selectedMood: 'all',
  searchQuery: '',
  lyrics: [],

  setCurrentSong: (song) => set({ currentSong: song }),
  
  playSong: (song) => {
    set((state) => ({
      currentSong: state.catalog.find((s) => s.id === song.id) ?? song,
      isPlaying: true,
      playbackError: null,
      playbackRequest: state.playbackRequest + 1,
      queue: state.queue.some(s => s.id === song.id) ? state.queue : state.catalog,
      ...(!state.queue.some(s => s.id === song.id) ? { activePlaylistId: null, view: 'discover' as const, selectedMood: 'all', searchQuery: '' } : {}),
      currentTime: 0,
      seekTarget: 0,
    }));
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying, playbackError: null })),
  
  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  
  seekTo: (time) => set({ currentTime: time, seekTarget: time }),
  clearSeekTarget: () => set({ seekTarget: null }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration: duration }),
  
  setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  
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
    const prevIdx = (currentIdx - 1 + queue.length) % queue.length;
    set({ currentSong: queue[prevIdx], isPlaying: true, currentTime: 0, seekTarget: 0 });
  },

  toggleLike: (songId) => {
    set((state) => {
      const catalog = state.catalog.map(s => s.id === songId ? { ...s, liked: !s.liked } : s);
      return {
      catalog,
      queue: state.view === 'library' ? catalog.filter(s => s.liked) : state.queue.map((s) =>
        s.id === songId ? { ...s, liked: !s.liked } : s
      ),
      currentSong:
        state.currentSong?.id === songId
          ? { ...state.currentSong, liked: !state.currentSong.liked }
          : state.currentSong,
    }; });
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
    if (mood === 'liked') { get().setView('library'); return; }
    set({ selectedMood: mood });
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () => set({ searchQuery: '', selectedMood: 'all' }),
  setLyrics: (lyrics) => set({ lyrics }),
}));
