'use client';

import { useEffect } from 'react';
import { fetchCharts, fetchPlaylists, fetchSongs } from '../lib/api-client';
import { useAudioStore } from '../store/useAudioStore';
import { useAuthStore } from '../store/useAuthStore';

export function useBackendSync() {
  useEffect(() => {
    let cancelled = false;
    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;

    void (async () => {
      await useAuthStore.getState().hydrateAuth(controller?.signal);
      if (cancelled) {
        return;
      }

      const [songs, charts, playlists] = await Promise.all([
        fetchSongs({ signal: controller?.signal }),
        fetchCharts(controller?.signal),
        fetchPlaylists(controller?.signal),
      ]);

      if (cancelled) {
        return;
      }

      if (songs && songs.length > 0) {
        const currentPlaylists = useAudioStore.getState().playlists;
        useAudioStore.getState().hydrateFromBackend({
          songs,
          playlists: playlists ?? currentPlaylists,
          charts: charts ?? undefined,
        });
      }
    })();

    return () => {
      cancelled = true;
      controller?.abort();
    };
  }, []);
}
