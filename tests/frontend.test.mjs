import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);

// Run the real TypeScript store with Node's test runner; no browser or internal mocks.
function loadStore(entry = 'src/store/useAudioStore.ts', globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    vm.runInNewContext(code, { ...globals, exports, require: (id) => id.startsWith('.')
      ? load(path.resolve(path.dirname(file), id + '.ts')) : nodeRequire(id) });
    return exports;
  }
  const loaded = load(entry);
  return loaded.useAudioStore ?? loaded.useThemeStore ?? loaded;
}

test('repeat off stops a one-song queue', () => {
  const s = loadStore();
  const song = s.getState().queue[0];
  s.setState({ queue: [song], currentSong: song, isPlaying: true, repeatMode: 'off' });
  s.getState().nextSong();
  assert.equal(s.getState().isPlaying, false);
});

test('shuffle does not bypass repeat off at the end', () => {
  const s = loadStore();
  const queue = s.getState().queue;
  s.setState({ currentSong: queue.at(-1), isShuffle: true, repeatMode: 'off', isPlaying: true });
  s.getState().nextSong();
  assert.equal(s.getState().isPlaying, false);
});

test('playlist selection defines the playback queue and preserves likes', () => {
  const s = loadStore();
  s.getState().selectPlaylist('pl-2');
  assert.equal(s.getState().queue.map(x => x.id).join(','), 'song-1,song-3');
  s.getState().toggleLike('song-1');
  const liked = s.getState().queue[0].liked;
  s.getState().setView('discover');
  assert.equal(s.getState().queue.find(x => x.id === 'song-1').liked, liked);
});

test('playback errors stop the player and replay clears the error', () => {
  const s = loadStore();
  s.getState().playSong(s.getState().queue[0]);
  s.getState().setPlaybackError('Audio unavailable');
  assert.equal(s.getState().isPlaying, false);
  s.getState().playSong(s.getState().currentSong);
  assert.equal(s.getState().playbackError, null);
  assert.equal(s.getState().currentTime, 0);
  assert.equal(s.getState().seekTarget, 0);
  assert.equal(s.getState().playbackRequest, 2);
});

test('library removes an unliked track and a created playlist has real membership', () => {
  const s = loadStore();
  s.getState().setView('library');
  const song = s.getState().queue[0];
  s.getState().toggleLike(song.id);
  assert.equal(s.getState().queue.some(x => x.id === song.id), false);
  s.getState().createPlaylist('  Nhạc của anh  ');
  const playlist = s.getState().playlists.at(-1);
  assert.equal(playlist.title, 'Nhạc của anh');
  assert.equal(playlist.songIds[0], s.getState().currentSong.id);
  assert.equal(playlist.songsCount, playlist.songIds.length);
});

test('system theme uses OS preference and cleans up subscriptions', () => {
  const classes = new Set();
  const listeners = new Set();
  const media = { matches: false, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  const s = loadStore('src/store/useThemeStore.ts', {
    window: { matchMedia: () => media }, localStorage: { getItem: () => null },
    document: { documentElement: { classList: { add: x => classes.add(x), remove: x => classes.delete(x) } } },
  });
  const cleanup = s.getState().initTheme();
  assert.equal(s.getState().theme, 'system');
  assert.equal(s.getState().resolvedTheme, 'light');
  assert.equal(listeners.size, 1);
  cleanup();
  assert.equal(listeners.size, 0);
});

test('liking the playing song adds it to the open library', () => {
  const s = loadStore();
  const song = s.getState().catalog.find(x => !x.liked);
  s.getState().playSong(song);
  s.getState().setView('library');
  s.getState().toggleLike(song.id);
  assert.equal(s.getState().queue.some(x => x.id === song.id), true);
});

test('playing a recommendation outside a playlist clears its display context', () => {
  const s = loadStore();
  s.getState().selectPlaylist('pl-3');
  s.getState().playSong(s.getState().catalog[0]);
  assert.equal(s.getState().activePlaylistId, null);
  assert.equal(s.getState().view, 'discover');
});

test('skipping clears a stale audio error', () => {
  const s = loadStore();
  s.getState().setPlaybackError('Failed');
  s.getState().nextSong();
  assert.equal(s.getState().playbackError, null);
});

test('resetting filters retains the selected library and playlist context', () => {
  const s = loadStore();
  s.getState().selectPlaylist('pl-3');
  s.getState().setSearchQuery('missing');
  s.getState().setMoodFilter('sad');
  s.getState().resetFilters();
  assert.equal(s.getState().activePlaylistId, 'pl-3');
  assert.equal(s.getState().queue[0].id, 'song-5');
  assert.equal(s.getState().searchQuery, '');
  assert.equal(s.getState().selectedMood, 'all');
});

test('navigation URLs round-trip playlist, mood and Unicode search', () => {
  const nav = loadStore('src/lib/navigation.ts', { URLSearchParams });
  const route = { view: 'discover', playlist: 'pl-2', mood: 'chill', query: 'Chuyện đôi ta & mưa' };
  const search = nav.writeLibraryRoute(route, '?campaign=demo');
  const restored = nav.readLibraryRoute(search, ['pl-2']);
  assert.equal(JSON.stringify(restored), JSON.stringify(route));
  assert.equal(new URLSearchParams(search).get('campaign'), 'demo');
});

test('unknown navigation values fall back without changing playback', () => {
  const nav = loadStore('src/lib/navigation.ts', { URLSearchParams });
  const route = nav.readLibraryRoute('?view=unknown&playlist=missing&mood=unknown', ['pl-1']);
  assert.equal(route.view, 'discover');
  assert.equal(route.playlist, null);
  assert.equal(route.mood, 'all');
});

test('reduced motion disables programmatic smooth scrolling', () => {
  const reduced = loadStore('src/lib/motion.ts', { window: { matchMedia: () => ({ matches: true }) } });
  const regular = loadStore('src/lib/motion.ts', { window: { matchMedia: () => ({ matches: false }) } });
  assert.equal(reduced.preferredScrollBehavior(), 'instant');
  assert.equal(regular.preferredScrollBehavior(), 'smooth');
});

test('chart playback follows the displayed demo ranking order', () => {
  const s = loadStore();
  const ids = s.getState().catalog.map(song => song.id).reverse();
  s.getState().setView('charts');
  assert.equal(s.getState().queue[0].id, ids[0]);
  s.getState().playSong(s.getState().queue[0]);
  s.getState().nextSong();
  assert.equal(s.getState().currentSong.id, ids[1]);
});
