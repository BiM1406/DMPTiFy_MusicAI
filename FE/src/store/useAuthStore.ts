'use client';

import { create } from 'zustand';
import {
  fetchCharts,
  fetchCurrentUserDetailed,
  fetchPlaylists,
  fetchSongs,
  getStoredAccessToken,
  loginAccount,
  loginWithGoogleToken,
  registerAccount,
  setStoredAccessToken,
  type AuthUser,
} from '../lib/api-client';
import { useAudioStore } from './useAudioStore';

export type AuthModalMode = 'login' | 'register';

const DEFAULT_GOOGLE_SANDBOX_TOKEN =
  'mock-google:dat.nguyen@dtu.edu.vn:Nguyễn Tuấn Đạt';

async function refreshLibraryAfterAuth(): Promise<void> {
  if (typeof fetch !== 'function') {
    return;
  }
  const [songs, charts, playlists] = await Promise.all([
    fetchSongs(),
    fetchCharts(),
    fetchPlaylists(),
  ]);
  if (songs && songs.length > 0) {
    const currentPlaylists = useAudioStore.getState().playlists;
    useAudioStore.getState().hydrateFromBackend({
      songs,
      playlists: playlists ?? currentPlaylists,
      charts: charts ?? undefined,
    });
  }
}

interface AuthStore {
  user: AuthUser | null;
  isAuthModalOpen: boolean;
  authMode: AuthModalMode;
  isSubmitting: boolean;
  authError: string | null;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  setAuthMode: (mode: AuthModalMode) => void;
  clearAuthError: () => void;
  hydrateAuth: (signal?: AbortSignal) => Promise<AuthUser | null>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (fullName: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (idToken?: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthModalOpen: false,
  authMode: 'login',
  isSubmitting: false,
  authError: null,

  openAuthModal: (mode = 'login') =>
    set({ isAuthModalOpen: true, authMode: mode, authError: null }),

  closeAuthModal: () => set({ isAuthModalOpen: false, authError: null }),

  setAuthMode: (mode) => set({ authMode: mode, authError: null }),

  clearAuthError: () => set({ authError: null }),

  hydrateAuth: async (signal) => {
    const token = getStoredAccessToken();
    if (!token) {
      set({ user: null });
      return null;
    }

    const res = await fetchCurrentUserDetailed(signal);
    if (res.ok) {
      set({ user: res.data });
      return res.data;
    }

    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 404) {
      setStoredAccessToken(null);
      set({ user: null });
    }
    return null;
  },

  login: async (email, password) => {
    set({ isSubmitting: true, authError: null });
    const res = await loginAccount({ email, password });
    if (!res.ok) {
      set({ isSubmitting: false, authError: res.error });
      return false;
    }

    setStoredAccessToken(res.data.accessToken);
    set({
      user: res.data.user,
      isAuthModalOpen: false,
      isSubmitting: false,
      authError: null,
    });
    void refreshLibraryAfterAuth();
    return true;
  },

  register: async (fullName, email, password) => {
    set({ isSubmitting: true, authError: null });
    const res = await registerAccount({ fullName, email, password });
    if (!res.ok) {
      set({ isSubmitting: false, authError: res.error });
      return false;
    }

    setStoredAccessToken(res.data.accessToken);
    set({
      user: res.data.user,
      isAuthModalOpen: false,
      isSubmitting: false,
      authError: null,
    });
    void refreshLibraryAfterAuth();
    return true;
  },

  loginWithGoogle: async (idToken) => {
    set({ isSubmitting: true, authError: null });
    const res = await loginWithGoogleToken(idToken ?? DEFAULT_GOOGLE_SANDBOX_TOKEN);
    if (!res.ok) {
      set({ isSubmitting: false, authError: res.error });
      return false;
    }

    setStoredAccessToken(res.data.accessToken);
    set({
      user: res.data.user,
      isAuthModalOpen: false,
      isSubmitting: false,
      authError: null,
    });
    void refreshLibraryAfterAuth();
    return true;
  },

  logout: () => {
    setStoredAccessToken(null);
    set({ user: null, authError: null });
    void refreshLibraryAfterAuth();
  },
}));
