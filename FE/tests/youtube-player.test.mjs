import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);
const feRoot = path.resolve(import.meta.dirname, '..');

function loadTsModule(entry, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.isAbsolute(file) ? file : path.resolve(feRoot, file);
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    vm.runInNewContext(code, {
      URLSearchParams,
      AbortController,
      setTimeout,
      clearTimeout,
      ...globals,
      exports,
      require: (id) =>
        id.startsWith('.')
          ? load(path.resolve(path.dirname(file), id + '.ts'))
          : nodeRequire(id),
    });
    return exports;
  }
  return load(entry);
}

test('extractYoutubeVideoId handles youtubeVideoId and watch/youtu.be/embed URLs safely', () => {
  const yt = loadTsModule('src/lib/youtube.ts');

  assert.equal(
    yt.extractYoutubeVideoId({
      youtubeVideoId: 'M7lc1UVf-VE',
      audioUrl: '/audio/song-1.wav',
    }),
    'M7lc1UVf-VE',
  );
  assert.equal(
    yt.extractYoutubeVideoId({
      audioUrl: 'https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=42',
    }),
    'dQw4w9WgXcQ',
  );
  assert.equal(
    yt.extractYoutubeVideoId('https://youtu.be/kXYiU_JCYtU?si=test'),
    'kXYiU_JCYtU',
  );
  assert.equal(
    yt.extractYoutubeVideoId('https://www.youtube.com/embed/3JZ_D3ELwOQ?rel=0'),
    '3JZ_D3ELwOQ',
  );
  assert.equal(yt.extractYoutubeVideoId('/audio/song-1.wav'), null);
  assert.equal(yt.extractYoutubeVideoId({ audioUrl: '/audio/song-2.wav' }), null);
  assert.equal(yt.extractYoutubeVideoId(null), null);
  assert.equal(yt.extractYoutubeVideoId(''), null);
});

test('loadYouTubeIframeApi guards SSR and resolves singleton YT namespace in browser', async () => {
  const ssrYt = loadTsModule('src/lib/youtube.ts');
  assert.equal(await ssrYt.loadYouTubeIframeApi(), null);

  const appended = [];
  const fakeWindow = {};
  const fakeDocument = {
    head: {
      appendChild: (node) => appended.push(node),
    },
    querySelector: () => null,
    createElement: (tag) => ({ tag, src: '', async: false }),
  };
  const mockYT = {
    Player: function MockPlayer() {},
    PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
  };

  const browserYt = loadTsModule('src/lib/youtube.ts', {
    window: fakeWindow,
    document: fakeDocument,
  });

  const firstPromise = browserYt.loadYouTubeIframeApi();
  const secondPromise = browserYt.loadYouTubeIframeApi();
  assert.equal(appended.length, 1);
  assert.equal(appended[0].src, 'https://www.youtube.com/iframe_api');

  fakeWindow.YT = mockYT;
  fakeWindow.onYouTubeIframeAPIReady();

  const [resolvedFirst, resolvedSecond] = await Promise.all([
    firstPromise,
    secondPromise,
  ]);
  assert.equal(resolvedFirst, mockYT);
  assert.equal(resolvedSecond, mockYT);
});

test('useAudioStore mergeSongsIntoCatalog upserts catalog, currentSong, queue, chartsCatalog and playSong merges searched tracks', () => {
  const { useAudioStore } = loadTsModule('src/store/useAudioStore.ts');

  const initialSongs = useAudioStore.getState().catalog;
  useAudioStore.getState().hydrateFromBackend({
    songs: initialSongs,
    playlists: [
      { id: 'pl-2', title: 'Chill', songIds: ['vpop-1', 'vpop-3', 'vpop-5', 'vpop-8'], songsCount: 4 },
    ],
    charts: [...initialSongs].reverse(),
  });
  useAudioStore.getState().selectPlaylist('pl-2'); // vpop-1, vpop-3, vpop-5, vpop-8
  useAudioStore.getState().setCurrentSong(initialSongs[0]);

  const ytSearchTrack = {
    id: 'yt-lac-troi',
    title: 'Lạc Trôi',
    artist: 'Sơn Tùng M-TP',
    album: 'YouTube Music',
    duration: 242,
    audioUrl: 'https://www.youtube.com/watch?v=Llw9Q6akRo4',
    coverUrl: 'https://i.ytimg.com/vi/Llw9Q6akRo4/mqdefault.jpg',
    youtubeVideoId: 'Llw9Q6akRo4',
    mood: 'chill',
    moodLabel: 'Thư giãn & Chill',
    bpm: 95,
    liked: false,
  };

  useAudioStore.getState().mergeSongsIntoCatalog([
    { ...initialSongs[0], youtubeVideoId: 'updatedVid1' },
    ytSearchTrack,
  ]);

  const afterMerge = useAudioStore.getState();
  assert.equal(afterMerge.currentSong.youtubeVideoId, 'updatedVid1');
  assert.equal(afterMerge.queue.length, 4);
  assert.equal(afterMerge.queue[0].youtubeVideoId, 'updatedVid1');
  assert.equal(
    afterMerge.chartsCatalog.find((s) => s.id === initialSongs[0].id).youtubeVideoId,
    'updatedVid1',
  );
  assert.equal(afterMerge.catalog.some((s) => s.id === 'yt-lac-troi'), true);

  const directSearchedSong = {
    ...ytSearchTrack,
    id: 'yt-noi-nay-co-anh',
    title: 'Nơi Này Có Anh',
    youtubeVideoId: 'FN7ALfpGxiI',
  };
  useAudioStore.getState().setSearchQuery('Nơi Này Có Anh');
  useAudioStore.getState().setRemoteSearchState(false, [directSearchedSong]);
  useAudioStore.getState().playSong(directSearchedSong);

  const afterPlay = useAudioStore.getState();
  assert.equal(afterPlay.currentSong.id, 'yt-noi-nay-co-anh');
  assert.equal(afterPlay.isPlaying, true);
  assert.equal(afterPlay.catalog.some((s) => s.id === 'yt-noi-nay-co-anh'), true);
  assert.equal(afterPlay.queue.some((s) => s.id === 'yt-noi-nay-co-anh'), true);

  useAudioStore.getState().toggleLike('yt-noi-nay-co-anh');
  assert.equal(
    useAudioStore.getState().remoteSearchResults.find((s) => s.id === 'yt-noi-nay-co-anh').liked,
    true,
  );
});

test('resolveEmbeddableSong calls POST /v1/songs/:id/resolve-embeddable and handles failures safely', async () => {
  const requests = [];
  const api = loadTsModule('src/lib/api-client.ts', {
    fetch: async (url, init = {}) => {
      requests.push({ url, method: init.method });
      if (url.includes('/v1/songs/yt-101/resolve-embeddable')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'yt-101',
              title: 'Nàng Thơ',
              artist: 'Hoàng Dũng',
              album: '25',
              duration: 254,
              audioUrl: 'https://www.youtube.com/watch?v=Zzn9-ATB9aU',
              coverUrl: 'https://i.ytimg.com/vi/Zzn9-ATB9aU/hqdefault.jpg',
              youtubeVideoId: 'Zzn9-ATB9aU',
              mood: 'acoustic',
              moodLabel: 'Mộc mạc & Thư thái',
              bpm: 82,
              liked: false,
            },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({ success: false }) };
    },
  });

  const recovered = await api.resolveEmbeddableSong('yt-101');
  assert.equal(requests[0].method, 'POST');
  assert.ok(requests[0].url.endsWith('/v1/songs/yt-101/resolve-embeddable'));
  assert.equal(recovered.youtubeVideoId, 'Zzn9-ATB9aU');

  assert.equal(await api.resolveEmbeddableSong('  '), null);
  assert.equal(await api.resolveEmbeddableSong('missing-id'), null);
});

test('fetchSongLyrics distinguishes Tier-1 synced LRC and Tier-2 plain lyrics responses', async () => {
  const api = loadTsModule('src/lib/api-client.ts', {
    fetch: async (url) => {
      if (url.includes('/v1/songs/song-tier1/lyrics')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              songId: 'song-tier1',
              rawLrc: '[00:05.00]Câu hát đồng bộ',
              lines: [{ time: 5, text: 'Câu hát đồng bộ' }],
              isSynced: true,
              plainLyrics: null,
            },
          }),
        };
      }
      if (url.includes('/v1/songs/song-tier2/lyrics')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              songId: 'song-tier2',
              rawLrc: '',
              lines: [],
              isSynced: false,
              plainLyrics: 'Dòng lời thứ nhất\nDòng lời thứ hai',
            },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({ success: false }) };
    },
  });

  const tier1 = await api.fetchSongLyrics('song-tier1');
  assert.equal(tier1.isSynced, true);
  assert.equal(tier1.lines.length, 1);
  assert.equal(tier1.lines[0].time, 5);

  const tier2 = await api.fetchSongLyrics('song-tier2');
  assert.equal(tier2.isSynced, false);
  assert.equal(tier2.lines.length, 0);
  assert.equal(tier2.plainLyrics, 'Dòng lời thứ nhất\nDòng lời thứ hai');
});
