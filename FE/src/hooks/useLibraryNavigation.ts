'use client';

import { useEffect } from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { readLibraryRoute, writeLibraryRoute } from '../lib/navigation';

export function useLibraryNavigation() {
  useEffect(() => {
    const store = useAudioStore;
    const key = 'dmptify-session-playlists';
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]');
      if (Array.isArray(saved)) {
        const catalog = store.getState().catalog;
        const restored = saved.slice(0, 100).flatMap(p => {
          if (!p || typeof p.id !== 'string' || !p.id.startsWith('local-') || typeof p.title !== 'string' || !p.title.trim() || !Array.isArray(p.songIds)) return [];
          const songIds = [...new Set<string>(p.songIds.filter((id: unknown): id is string => typeof id === 'string' && catalog.some(s => s.id === id)))];
          return [{ id: p.id.slice(0, 100), title: p.title.trim().slice(0, 80), description: 'Danh sách của bạn · lưu trong phiên này', coverUrl: '/covers/cover-1.svg', songIds, songsCount: songIds.length }];
        });
        const builtIn = store.getState().playlists.filter(p => !p.id.startsWith('local-'));
        store.setState({ playlists: [...builtIn, ...restored.filter((p, i) => restored.findIndex(x => x.id === p.id) === i)] });
      }
    } catch { /* Session storage is optional; browsing still works when blocked. */ }

    let restoring = false;
    const apply = () => {
      restoring = true;
      const s = store.getState();
      const route = readLibraryRoute(location.search, s.playlists.map(p => p.id));
      const selected = s.playlists.find(p => p.id === route.playlist);
      store.setState({ view: selected ? 'discover' : route.view, activePlaylistId: selected?.id ?? null,
        selectedMood: route.mood, searchQuery: route.query,
        queue: selected ? selected.songIds.flatMap(id => s.catalog.filter(song => song.id === id)) : route.view === 'library' ? s.catalog.filter(song => song.liked) : route.view === 'charts' ? [...s.catalog].reverse() : s.catalog });
      restoring = false;
    };
    apply();
    const unsubscribe = store.subscribe((s, prev) => {
      if (s.playlists !== prev.playlists) {
        try { sessionStorage.setItem(key, JSON.stringify(s.playlists.filter(p => p.id.startsWith('local-')))); } catch { /* Optional persistence. */ }
      }
      if (restoring) return;
      const navChanged = s.view !== prev.view || s.activePlaylistId !== prev.activePlaylistId;
      if (!navChanged && s.selectedMood === prev.selectedMood && s.searchQuery === prev.searchQuery) return;
      const search = writeLibraryRoute({ view: s.view, playlist: s.activePlaylistId, mood: s.selectedMood, query: s.searchQuery }, location.search);
      const url = `${location.pathname}${search}${location.hash}`;
      if (navChanged) {
        history.replaceState({ ...history.state, dmptifyScroll: document.getElementById('main-content')?.scrollTop ?? 0 }, '');
        history.pushState({ ...history.state, dmptifyScroll: 0 }, '', url);
        requestAnimationFrame(() => { const main = document.getElementById('main-content'); if (main) { main.scrollTop = 0; main.focus({ preventScroll: true }); } });
      } else history.replaceState(history.state, '', url);
    });
    const onBack = () => {
      apply();
      requestAnimationFrame(() => { const main = document.getElementById('main-content'); if (main) { main.scrollTop = history.state?.dmptifyScroll ?? 0; main.focus({ preventScroll: true }); } });
    };
    window.addEventListener('popstate', onBack);
    return () => { unsubscribe(); window.removeEventListener('popstate', onBack); };
  }, []);
}
