'use client';

import { create } from 'zustand';
import { Song, LyricLine } from '../types/music';
import { MOCK_SONGS } from '../lib/mock-songs';

interface AudioStore {
  // Playback state
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: Song[];
  
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
  volume: 0.8,
  isMuted: false,
  isShuffle: false,
  repeatMode: 'all',
  queue: MOCK_SONGS,
  
  isLyricsOpen: false,
  isAiDrawerOpen: false,
  selectedMood: 'all',
  searchQuery: '',
  lyrics: [],

  setCurrentSong: (song) => set({ currentSong: song }),
  
  playSong: (song) => {
    set({
      currentSong: song,
      isPlaying: true,
      currentTime: 0,
    });
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  
  seekTo: (time) => set({ currentTime: time }),
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
    const { queue, currentSong, isShuffle } = get();
    if (!queue.length) return;
    
    if (isShuffle) {
      const randomIdx = Math.floor(Math.random() * queue.length);
      set({ currentSong: queue[randomIdx], isPlaying: true, currentTime: 0 });
      return;
    }

    const currentIdx = queue.findIndex((s) => s.id === currentSong?.id);
    const nextIdx = (currentIdx + 1) % queue.length;
    set({ currentSong: queue[nextIdx], isPlaying: true, currentTime: 0 });
  },

  prevSong: () => {
    const { queue, currentSong, currentTime } = get();
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }
    if (!queue.length) return;
    const currentIdx = queue.findIndex((s) => s.id === currentSong?.id);
    const prevIdx = (currentIdx - 1 + queue.length) % queue.length;
    set({ currentSong: queue[prevIdx], isPlaying: true, currentTime: 0 });
  },

  toggleLike: (songId) => {
    set((state) => ({
      queue: state.queue.map((s) =>
        s.id === songId ? { ...s, liked: !s.liked } : s
      ),
      currentSong:
        state.currentSong?.id === songId
          ? { ...state.currentSong, liked: !state.currentSong.liked }
          : state.currentSong,
    }));
  },

  toggleLyrics: () => set((state) => ({ isLyricsOpen: !state.isLyricsOpen })),
  toggleAiDrawer: () => set((state) => ({ isAiDrawerOpen: !state.isAiDrawerOpen })),
  setMoodFilter: (mood) => set({ selectedMood: mood }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLyrics: (lyrics) => set({ lyrics }),
}));
