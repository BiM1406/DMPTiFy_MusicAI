'use client';

import { create } from 'zustand';
import {
  JamRoomDto,
  createJamRoomApi,
  joinJamRoomApi,
  leaveJamRoomApi,
  sendJamActionApi,
} from '../lib/api-client';
import { useAudioStore } from './useAudioStore';
import { Song } from '../types/music';

interface JamStore {
  room: JamRoomDto | null;
  isModalOpen: boolean;
  myMemberId: string;
  myName: string;
  initialCode: string;
  isConnecting: boolean;
  error: string | null;

  openModal: (code?: string) => void;
  closeModal: () => void;
  setMyName: (name: string) => void;
  createRoom: () => Promise<JamRoomDto | null>;
  joinRoom: (code: string, name?: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  broadcastPlay: (song: Song, time: number) => Promise<void>;
  broadcastPause: (time: number) => Promise<void>;
  broadcastSeek: (time: number) => Promise<void>;
  broadcastTrackChange: (song: Song) => Promise<void>;
  broadcastReaction: (emoji: string) => Promise<void>;
  broadcastQueueAdd: (song: Song) => Promise<void>;
}

let eventSourceInstance: EventSource | null = null;
let lastSyncedSongId: string | null = null;

function connectRoomStream(code: string, setRoom: (r: JamRoomDto) => void) {
  if (eventSourceInstance) {
    eventSourceInstance.close();
    eventSourceInstance = null;
  }

  if (typeof window === 'undefined') return;

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const url = `${base}/v1/jam/rooms/${encodeURIComponent(code)}/stream`;

  const es = new EventSource(url);
  eventSourceInstance = es;

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.code) {
        const room = data as JamRoomDto;
        setRoom(room);

        // Auto-sync playback if we are not the host
        const myId = useJamStore.getState().myMemberId;
        const isHost = room.hostId === myId;

        if (!isHost && room.currentSong) {
          const audioState = useAudioStore.getState();

          // Song changed
          if (room.currentSong.id !== lastSyncedSongId) {
            lastSyncedSongId = room.currentSong.id;
            audioState.playSong(room.currentSong as Song);
            if (typeof room.currentTime === 'number' && room.currentTime > 0) {
              audioState.seekTo(room.currentTime);
            }
          } else {
            // Play/Pause sync
            if (room.isPlaying !== audioState.isPlaying) {
              if (room.isPlaying) audioState.resume();
              else audioState.pause();
            }

            // Seek sync on noticeable drift (> 2.5s)
            if (
              typeof room.currentTime === 'number' &&
              Math.abs(audioState.currentTime - room.currentTime) > 2.5
            ) {
              audioState.seekTo(room.currentTime);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Jam SSE parse error:', e);
    }
  };

  es.onerror = () => {
    // SSE will automatically reconnect
  };
}

export const useJamStore = create<JamStore>((set, get) => {
  const defaultMemberId = typeof window !== 'undefined'
    ? localStorage.getItem('dmptify-jam-member-id') || `mem-${Date.now().toString(36)}`
    : `mem-${Date.now().toString(36)}`;

  if (typeof window !== 'undefined') {
    localStorage.setItem('dmptify-jam-member-id', defaultMemberId);
  }

  return {
    room: null,
    isModalOpen: false,
    myMemberId: defaultMemberId,
    myName: 'Anh Đạt',
    initialCode: '',
    isConnecting: false,
    error: null,

    openModal: (code = '') => set({ isModalOpen: true, initialCode: code, error: null }),
    closeModal: () => set({ isModalOpen: false }),
    setMyName: (name) => set({ myName: name }),

    createRoom: async () => {
      set({ isConnecting: true, error: null });
      const audioState = useAudioStore.getState();
      const myName = get().myName || 'Nguyễn Tuấn Đạt';
      const myId = get().myMemberId;

      const res = await createJamRoomApi({
        hostName: myName,
        hostId: myId,
        initialSong: audioState.currentSong,
        isPlaying: audioState.isPlaying,
        currentTime: audioState.currentTime,
      });

      set({ isConnecting: false });

      if (res.ok) {
        set({ room: res.data, isModalOpen: true });
        lastSyncedSongId = res.data.currentSong?.id ?? null;
        connectRoomStream(res.data.code, (r) => set({ room: r }));
        return res.data;
      } else {
        set({ error: res.error });
        return null;
      }
    },

    joinRoom: async (code, name) => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) return false;

      set({ isConnecting: true, error: null });
      const memberName = name || get().myName || 'Bạn bè';
      const memberId = get().myMemberId;

      const res = await joinJamRoomApi(trimmed, {
        memberName,
        memberId,
      });

      set({ isConnecting: false });

      if (res.ok) {
        set({ room: res.data, isModalOpen: true });
        lastSyncedSongId = res.data.currentSong?.id ?? null;
        connectRoomStream(res.data.code, (r) => set({ room: r }));

        // Sync initial room playback immediately
        if (res.data.currentSong) {
          useAudioStore.getState().playSong(res.data.currentSong as Song);
          if (res.data.currentTime > 0) {
            useAudioStore.getState().seekTo(res.data.currentTime);
          }
        }
        return true;
      } else {
        set({ error: res.error || 'Mã phòng không tồn tại.' });
        return false;
      }
    },

    leaveRoom: async () => {
      const room = get().room;
      if (!room) return;

      if (eventSourceInstance) {
        eventSourceInstance.close();
        eventSourceInstance = null;
      }

      await leaveJamRoomApi(room.code, get().myMemberId);
      set({ room: null, isModalOpen: false });
    },

    broadcastPlay: async (song, time) => {
      const room = get().room;
      if (!room) return;
      await sendJamActionApi(
        room.code,
        { type: 'PLAY', time, song, senderName: get().myName },
        get().myMemberId,
      );
    },

    broadcastPause: async (time) => {
      const room = get().room;
      if (!room) return;
      await sendJamActionApi(
        room.code,
        { type: 'PAUSE', time, senderName: get().myName },
        get().myMemberId,
      );
    },

    broadcastSeek: async (time) => {
      const room = get().room;
      if (!room) return;
      await sendJamActionApi(
        room.code,
        { type: 'SEEK', time, senderName: get().myName },
        get().myMemberId,
      );
    },

    broadcastTrackChange: async (song) => {
      const room = get().room;
      if (!room) return;
      await sendJamActionApi(
        room.code,
        { type: 'TRACK_CHANGE', song, senderName: get().myName },
        get().myMemberId,
      );
    },

    broadcastReaction: async (emoji) => {
      const room = get().room;
      if (!room) return;
      await sendJamActionApi(
        room.code,
        { type: 'REACTION', emoji, senderName: get().myName },
        get().myMemberId,
      );
    },

    broadcastQueueAdd: async (song) => {
      const room = get().room;
      if (!room) return;
      await sendJamActionApi(
        room.code,
        { type: 'QUEUE_ADD', song, senderName: get().myName },
        get().myMemberId,
      );
    },
  };
});
