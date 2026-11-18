import type { LibraryView } from '../store/useAudioStore';

export interface LibraryRoute { view: LibraryView; playlist: string | null; mood: string; query: string }
const moods = ['all', 'chill', 'sad', 'acoustic', 'energetic', 'focus'];

export function readLibraryRoute(search: string, playlistIds: string[]): LibraryRoute {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  const playlist = params.get('playlist');
  const mood = params.get('mood') ?? 'all';
  return {
    view: view === 'library' || view === 'charts' ? view : 'discover',
    playlist: playlist && playlistIds.includes(playlist) ? playlist : null,
    mood: moods.includes(mood) ? mood : 'all',
    query: (params.get('q') ?? '').slice(0, 2000),
  };
}

export function writeLibraryRoute(route: LibraryRoute, currentSearch = ''): string {
  const params = new URLSearchParams(currentSearch);
  for (const name of ['view', 'playlist', 'mood', 'q']) params.delete(name);
  if (route.playlist) params.set('playlist', route.playlist);
  else if (route.view !== 'discover') params.set('view', route.view);
  if (route.mood !== 'all') params.set('mood', route.mood);
  if (route.query) params.set('q', route.query);
  return params.size ? `?${params}` : '';
}
