'use client';

import { useEffect } from 'react';
import { fetchSongs } from '../lib/api-client';
import { useAudioStore } from '../store/useAudioStore';

/**
 * Debounced live backend/YouTube song search synced with `searchQuery` and `selectedMood`.
 */
export function useLiveSongSearch(): void {
  const searchQuery = useAudioStore((s) => s.searchQuery);
  const selectedMood = useAudioStore((s) => s.selectedMood);
  const setRemoteSearchState = useAudioStore((s) => s.setRemoteSearchState);
  const mergeSongsIntoCatalog = useAudioStore((s) => s.mergeSongsIntoCatalog);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setRemoteSearchState(false, null);
      return;
    }

    let cancelled = false;
    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;

    setRemoteSearchState(true, null);

    const timerId = setTimeout(() => {
      if (cancelled) {
        return;
      }

      void fetchSongs({
        q: trimmed,
        mood: selectedMood,
        signal: controller?.signal,
      })
        .then((songs) => {
          if (cancelled || controller?.signal.aborted) {
            return;
          }
          if (songs && songs.length > 0) {
            mergeSongsIntoCatalog(songs);
          }
          setRemoteSearchState(false, songs ?? []);
        })
        .catch(() => {
          if (!cancelled && !controller?.signal.aborted) {
            setRemoteSearchState(false, []);
          }
        });
    }, 380);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      controller?.abort();
    };
  }, [searchQuery, selectedMood, setRemoteSearchState, mergeSongsIntoCatalog]);
}
