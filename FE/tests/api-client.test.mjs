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

const SAMPLE_SONGS = [
  {
    id: 'song-a',
    title: 'Mưa Tháng Sáu',
    artist: 'Văn Mai Hương',
    album: 'Single',
    duration: 30,
    audioUrl: '/audio/song-2.wav',
    coverUrl: '/covers/cover-2.svg',
    mood: 'sad',
    moodLabel: 'U buồn & Hoài niệm',
    bpm: 68,
    liked: true,
  },
  {
    id: 'song-b',
    title: 'Chuyện Đôi Ta',
    artist: 'Emcee L',
    album: 'Acoustic',
    duration: 30,
    audioUrl: '/audio/song-1.wav',
    coverUrl: '/covers/cover-1.svg',
    mood: 'chill',
    moodLabel: 'Thư giãn & Chill',
    bpm: 78,
    liked: false,
  },
];

const SAMPLE_PLAYLISTS = [
  {
    id: 'pl-backend-1',
    title: 'Backend Playlist',
    description: 'Synced from NestJS',
    coverUrl: '/covers/cover-1.svg',
    songIds: ['song-a', 'song-b'],
    songsCount: 2,
    mood: 'chill',
    isAiGenerated: false,
  },
];

test('api-client fetches songs, charts, playlists and posts play/like/playlist/chat with mocked fetch', async () => {
  const calls = [];
  const mockFetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.includes('/v1/songs/charts')) {
      return {
        ok: true,
        json: async () => ({ success: true, data: [SAMPLE_SONGS[1], SAMPLE_SONGS[0]] }),
      };
    }
    if (url.includes('/v1/songs/song-a/play')) {
      return {
        ok: true,
        json: async () => ({ success: true, data: { ...SAMPLE_SONGS[0], playCount: 99 } }),
      };
    }
    if (url.includes('/v1/songs/song-a/like')) {
      return {
        ok: true,
        json: async () => ({ success: true, data: { songId: 'song-a', liked: false } }),
      };
    }
    if (url.includes('/v1/songs')) {
      return {
        ok: true,
        json: async () => ({ success: true, data: SAMPLE_SONGS }),
      };
    }
    if (url.includes('/v1/playlists') && init.method === 'POST') {
      const parsed = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pl-created-1',
            title: parsed.title,
            description: 'Danh sách phát cá nhân',
            coverUrl: '/covers/cover-1.svg',
            songIds: parsed.songIds ?? [],
            songsCount: (parsed.songIds ?? []).length,
          },
        }),
      };
    }
    if (url.includes('/v1/playlists')) {
      return {
        ok: true,
        json: async () => ({ success: true, data: SAMPLE_PLAYLISTS }),
      };
    }
    if (url.includes('/v1/ai/chat')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            replyText: 'Nghe nhạc êm dịu nhé anh',
            detectedMood: 'U Buồn & Hoài Niệm',
            moodCode: 'sad',
            targetBpm: 68,
            provider: 'fallback-engine',
            recommendedSongs: [SAMPLE_SONGS[0]],
            generatedPlaylist: null,
          },
        }),
      };
    }
    return { ok: false, json: async () => ({ success: false }) };
  };

  const api = loadTsModule('src/lib/api-client.ts', {
    fetch: mockFetch,
    process: { env: { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3001/api/' } },
  });

  assert.equal(api.getApiBaseUrl(), 'http://127.0.0.1:3001/api');

  const songs = await api.fetchSongs({ mood: 'sad', q: 'Mưa', view: 'discover' });
  assert.equal(songs.length, 2);
  assert.ok(calls[0].url.includes('http://127.0.0.1:3001/api/v1/songs?'));
  assert.ok(calls[0].url.includes('mood=sad'));
  assert.ok(calls[0].url.includes('view=discover'));

  const charts = await api.fetchCharts();
  assert.equal(charts[0].id, 'song-b');

  const playlists = await api.fetchPlaylists();
  assert.equal(playlists[0].id, 'pl-backend-1');

  const played = await api.recordSongPlay('song-a');
  assert.equal(played.id, 'song-a');

  const liked = await api.toggleSongLike('song-a');
  assert.deepEqual(liked, { songId: 'song-a', liked: false });

  const createdPl = await api.createBackendPlaylist({
    title: 'My Mix',
    songIds: ['song-a'],
  });
  assert.equal(createdPl.id, 'pl-created-1');
  assert.equal(createdPl.title, 'My Mix');

  const chat = await api.sendAiMoodChat('Mưa buồn quá');
  assert.equal(chat.moodCode, 'sad');
  assert.equal(chat.targetBpm, 68);
  assert.equal(chat.recommendedSongs[0].id, 'song-a');
});

test('api-client returns null cleanly when offline, HTTP error, or fetch/process missing', async () => {
  const offlineApi = loadTsModule('src/lib/api-client.ts', {
    fetch: async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:3001');
    },
  });

  assert.equal(offlineApi.getApiBaseUrl(), 'http://localhost:3001/api');
  assert.equal(await offlineApi.fetchSongs(), null);
  assert.equal(await offlineApi.fetchCharts(), null);
  assert.equal(await offlineApi.fetchPlaylists(), null);
  assert.equal(await offlineApi.recordSongPlay('song-1'), null);
  assert.equal(await offlineApi.toggleSongLike('song-1'), null);
  assert.equal(await offlineApi.createBackendPlaylist({ title: 'Test' }), null);
  assert.equal(await offlineApi.sendAiMoodChat('Buồn'), null);

  const errorApi = loadTsModule('src/lib/api-client.ts', {
    fetch: async () => ({
      ok: false,
      status: 500,
      json: async () => ({ success: false }),
    }),
  });
  assert.equal(await errorApi.fetchSongs(), null);
  assert.equal(await errorApi.sendAiMoodChat('Test'), null);

  const noFetchApi = loadTsModule('src/lib/api-client.ts', {});
  assert.equal(await noFetchApi.fetchSongs(), null);
  assert.equal(await noFetchApi.recordSongPlay('song-1'), null);
});

test('useAudioStore hydrateFromBackend updates catalog, chartsCatalog, playlists, and optimistic actions survive offline fetch', async () => {
  const postCalls = [];
  const { useAudioStore } = loadTsModule('src/store/useAudioStore.ts', {
    fetch: async (url, init = {}) => {
      postCalls.push({ url, method: init.method });
      if (url.includes('/v1/playlists') && init.method === 'POST') {
        const body = JSON.parse(init.body);
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pl-server-99',
              title: body.title,
              description: 'Synced playlist',
              coverUrl: '/covers/cover-1.svg',
              songIds: body.songIds ?? [],
              songsCount: (body.songIds ?? []).length,
            },
          }),
        };
      }
      throw new Error('Network offline');
    },
  });

  const store = useAudioStore;
  assert.equal(store.getState().chartsCatalog, null);

  // Create a local session playlist before backend hydration arrives
  store.getState().createPlaylist('Session Local');
  // Wait a microtask tick for createBackendPlaylist resolution
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(store.getState().playlists.at(-1).id, 'pl-server-99');

  const chartsOrder = [SAMPLE_SONGS[1], SAMPLE_SONGS[0]];
  store.getState().hydrateFromBackend({
    songs: SAMPLE_SONGS,
    playlists: SAMPLE_PLAYLISTS,
    charts: chartsOrder,
  });

  assert.equal(store.getState().catalog.length, 2);
  assert.equal(store.getState().chartsCatalog.map((s) => s.id).join(','), 'song-b,song-a');
  assert.equal(store.getState().playlists[0].id, 'pl-backend-1');

  store.getState().setView('charts');
  assert.equal(store.getState().queue.map((s) => s.id).join(','), 'song-b,song-a');

  // Optimistic playSong & toggleLike should update local state cleanly even if fetch rejects
  store.getState().playSong(SAMPLE_SONGS[0]);
  assert.equal(store.getState().currentSong.id, 'song-a');
  assert.equal(store.getState().isPlaying, true);

  store.getState().toggleLike('song-a');
  assert.equal(store.getState().catalog.find((s) => s.id === 'song-a').liked, false);
  assert.equal(store.getState().chartsCatalog.find((s) => s.id === 'song-a').liked, false);

  await new Promise((r) => setTimeout(r, 10));
  assert.ok(postCalls.some((c) => c.url.includes('/v1/songs/song-a/play')));
  assert.ok(postCalls.some((c) => c.url.includes('/v1/songs/song-a/like')));
});

test('fetchSongLyrics fetches parsed LRC lines from backend', async () => {
  const api = loadTsModule('src/lib/api-client.ts', {
    fetch: async (url) => {
      if (url.includes('/v1/songs/song-1/lyrics')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              songId: 'song-1',
              rawLrc: '[00:00.00]Chuyện Đôi Ta',
              lines: [{ time: 0, text: 'Chuyện Đôi Ta' }],
            },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({ success: false }) };
    },
  });

  const lyrics = await api.fetchSongLyrics('song-1');
  assert.equal(lyrics.songId, 'song-1');
  assert.deepEqual(lyrics.lines, [{ time: 0, text: 'Chuyện Đôi Ta' }]);
  assert.equal(await api.fetchSongLyrics('missing'), null);
});

test('useAuthStore handles login, register, Google OAuth, hydrateAuth, 401 cleanup, and logout', async () => {
  const storeMap = new Map();
  const mockStorage = {
    getItem: (k) => storeMap.get(k) ?? null,
    setItem: (k, v) => storeMap.set(k, String(v)),
    removeItem: (k) => storeMap.delete(k),
  };

  let authMeStatus = 200;
  const authRequests = [];
  const { useAuthStore } = loadTsModule('src/store/useAuthStore.ts', {
    window: { localStorage: mockStorage },
    localStorage: mockStorage,
    fetch: async (url, init = {}) => {
      authRequests.push({ url, headers: init.headers ?? {}, body: init.body });
      if (url.includes('/v1/auth/google')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              accessToken: 'jwt-google-123',
              user: {
                id: 'user-dat-01',
                email: 'dat.nguyen@dtu.edu.vn',
                fullName: 'Nguyễn Tuấn Đạt',
                role: 'USER',
                planTier: 'FREE',
                vipExpiresAt: null,
                avatarUrl: null,
              },
            },
          }),
        };
      }
      if (url.includes('/v1/auth/login')) {
        const parsed = JSON.parse(init.body);
        if (parsed.password !== 'secret123') {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              success: false,
              error: { statusCode: 401, message: 'Invalid email or password' },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              accessToken: 'jwt-login-456',
              user: {
                id: 'user-2',
                email: parsed.email,
                fullName: 'Nguyễn Văn A',
                role: 'USER',
                planTier: 'FREE',
                vipExpiresAt: null,
                avatarUrl: null,
              },
            },
          }),
        };
      }
      if (url.includes('/v1/auth/register')) {
        const parsed = JSON.parse(init.body);
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              accessToken: 'jwt-reg-789',
              user: {
                id: 'user-3',
                email: parsed.email,
                fullName: parsed.fullName,
                role: 'USER',
                planTier: 'FREE',
                vipExpiresAt: null,
                avatarUrl: null,
              },
            },
          }),
        };
      }
      if (url.includes('/v1/auth/me')) {
        if (authMeStatus !== 200) {
          return {
            ok: false,
            status: authMeStatus,
            json: async () => ({ success: false, error: { statusCode: authMeStatus } }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'user-dat-01',
              email: 'dat.nguyen@dtu.edu.vn',
              fullName: 'Nguyễn Tuấn Đạt',
              role: 'USER',
              planTier: 'FREE',
              vipExpiresAt: null,
              avatarUrl: null,
            },
          }),
        };
      }
      if (url.includes('/v1/songs/charts') || url.includes('/v1/songs')) {
        return { ok: true, json: async () => ({ success: true, data: SAMPLE_SONGS }) };
      }
      if (url.includes('/v1/playlists')) {
        return { ok: true, json: async () => ({ success: true, data: SAMPLE_PLAYLISTS }) };
      }
      return { ok: false, status: 404, json: async () => ({ success: false }) };
    },
  });

  useAuthStore.getState().openAuthModal('login');
  assert.equal(useAuthStore.getState().isAuthModalOpen, true);

  const badLogin = await useAuthStore.getState().login('dat@dtu.edu.vn', 'wrong');
  assert.equal(badLogin, false);
  assert.equal(useAuthStore.getState().authError, 'Invalid email or password');
  assert.equal(storeMap.has('dmptify_access_token'), false);

  const goodLogin = await useAuthStore.getState().login('nguyenvana@dtu.edu.vn', 'secret123');
  assert.equal(goodLogin, true);
  assert.equal(storeMap.get('dmptify_access_token'), 'jwt-login-456');
  assert.equal(useAuthStore.getState().isAuthModalOpen, false);
  assert.equal(useAuthStore.getState().user.fullName, 'Nguyễn Văn A');

  const regOk = await useAuthStore.getState().register('Nguyễn Văn B', 'b@dtu.edu.vn', 'secret123');
  assert.equal(regOk, true);
  assert.equal(storeMap.get('dmptify_access_token'), 'jwt-reg-789');

  const googleOk = await useAuthStore.getState().loginWithGoogle();
  assert.equal(googleOk, true);
  assert.equal(storeMap.get('dmptify_access_token'), 'jwt-google-123');
  assert.equal(useAuthStore.getState().user.email, 'dat.nguyen@dtu.edu.vn');

  const hydrated = await useAuthStore.getState().hydrateAuth();
  assert.equal(hydrated.fullName, 'Nguyễn Tuấn Đạt');

  authMeStatus = 401;
  const expired = await useAuthStore.getState().hydrateAuth();
  assert.equal(expired, null);
  assert.equal(storeMap.has('dmptify_access_token'), false);

  useAuthStore.getState().logout();
  assert.equal(useAuthStore.getState().user, null);
  assert.ok(authRequests.some((r) => r.url.includes('/v1/auth/me')));
});

test('jam api methods handle create, get, join, and action', async () => {
  const requests = [];
  const api = loadTsModule('src/lib/api-client.ts', {
    fetch: async (url, init = {}) => {
      requests.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : null });
      if (url.includes('/v1/jam/rooms/DMPT-TEST/join')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 'room-1', code: 'DMPT-TEST', hostName: 'Host', members: [{ id: 'm1', name: 'Member' }] },
          }),
        };
      }
      if (url.includes('/v1/jam/rooms/DMPT-TEST/action')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 'room-1', code: 'DMPT-TEST', isPlaying: true, currentTime: 15 },
          }),
        };
      }
      if (url.includes('/v1/jam/rooms')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 'room-1', code: 'DMPT-TEST', hostName: 'Host', members: [] },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({ success: false }) };
    },
  });

  const created = await api.createJamRoomApi({ hostName: 'Host' });
  assert.equal(created.ok, true);
  assert.equal(created.data.code, 'DMPT-TEST');

  const joined = await api.joinJamRoomApi('DMPT-TEST', { memberName: 'Member' });
  assert.equal(joined.ok, true);
  assert.equal(joined.data.members.length, 1);

  const actionRes = await api.sendJamActionApi('DMPT-TEST', { type: 'PLAY', time: 15 });
  assert.equal(actionRes.ok, true);
  assert.equal(actionRes.data.isPlaying, true);
});
