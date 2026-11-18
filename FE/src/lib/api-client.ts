import type { LyricLine, MoodType, Playlist, Song } from '../types/music';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  success: false;
  error?: {
    statusCode?: number;
    message?: string;
    code?: string;
  };
}

export interface FetchSongsParams {
  mood?: string;
  q?: string;
  view?: string;
  signal?: AbortSignal;
}

export interface CreateBackendPlaylistInput {
  title: string;
  description?: string;
  coverUrl?: string;
  mood?: MoodType;
  songIds?: string[];
}

export interface ToggleSongLikeResult {
  songId: string;
  liked: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  planTier: 'FREE' | 'VIP';
  vipExpiresAt: string | null;
  avatarUrl: string | null;
}

export interface AuthSessionResult {
  accessToken: string;
  user: AuthUser;
}

export interface SongLyricsResult {
  songId: string;
  rawLrc: string;
  lines: LyricLine[];
  isSynced?: boolean;
  plainLyrics?: string | null;
}

export type ApiMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; statusCode?: number };

export interface AiMoodChatResult {
  replyText: string;
  detectedMood: string;
  moodCode: MoodType;
  targetBpm: number;
  provider: 'gemini-2.5-flash' | 'fallback-engine';
  recommendedSongs: Song[];
  generatedPlaylist: Playlist | null;
}

const DEFAULT_API_BASE_URL = 'http://localhost:3001/api';
const ACCESS_TOKEN_STORAGE_KEY = 'dmptify_access_token';

export function getApiBaseUrl(): string {
  const envUrl =
    typeof process !== 'undefined' && process.env
      ? process.env.NEXT_PUBLIC_API_URL
      : undefined;
  const trimmed =
    typeof envUrl === 'string' ? envUrl.trim().replace(/\/+$/, '') : '';
  if (trimmed) {
    return trimmed;
  }

  if (typeof window !== 'undefined') {
    const winUrl = (
      window as unknown as { __DMPTIFY_API_URL__?: unknown }
    ).__DMPTIFY_API_URL__;
    if (typeof winUrl === 'string' && winUrl.trim()) {
      return winUrl.trim().replace(/\/+$/, '');
    }
  }

  return DEFAULT_API_BASE_URL;
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined') {
    try {
      return window.localStorage ?? null;
    } catch {
      return null;
    }
  }
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    try {
      return (globalThis as unknown as { localStorage?: Storage }).localStorage ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

export function getStoredAccessToken(): string | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  try {
    const token = storage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    return typeof token === 'string' && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token: string | null): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    if (token && token.trim()) {
      storage.setItem(ACCESS_TOKEN_STORAGE_KEY, token.trim());
    } else {
      storage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage access can fail in restricted browser contexts.
  }
}

function getOptionalAuthHeaders(): Record<string, string> {
  const token = getStoredAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildSongsPath(params?: FetchSongsParams): string {
  if (!params) {
    return '/v1/songs';
  }
  const entries: Array<[string, string]> = [];
  if (params.mood && params.mood !== 'all') {
    entries.push(['mood', params.mood]);
  }
  if (params.q && params.q.trim()) {
    entries.push(['q', params.q.trim()]);
  }
  if (params.view) {
    entries.push(['view', params.view]);
  }
  if (!entries.length) {
    return '/v1/songs';
  }
  if (typeof URLSearchParams !== 'undefined') {
    return `/v1/songs?${new URLSearchParams(entries).toString()}`;
  }
  const queryString = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `/v1/songs?${queryString}`;
}

async function requestApiDetailed<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH';
    body?: unknown;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<ApiMutationResult<T>> {
  if (typeof fetch !== 'function') {
    return { ok: false, error: 'Trình duyệt không hỗ trợ kết nối API.' };
  }
  if (options.signal?.aborted) {
    return { ok: false, error: 'Yêu cầu đã bị hủy.' };
  }

  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  const onExternalAbort = () => {
    controller?.abort();
  };

  if (controller && options.signal) {
    options.signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  if (controller && typeof setTimeout === 'function') {
    const timeoutMs = options.timeoutMs ?? 6000;
    timerId = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const headers: Record<string, string> = {
      ...getOptionalAuthHeaders(),
    };
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(controller ? { signal: controller.signal } : {}),
    });

    const payload = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: T;
      error?: ApiErrorEnvelope['error'];
    } | null;

    if (!response.ok) {
      const errorMsg =
        typeof payload?.error?.message === 'string' && payload.error.message.trim()
          ? payload.error.message
          : `Yêu cầu thất bại (HTTP ${response.status})`;
      return { ok: false, error: errorMsg, statusCode: response.status };
    }

    if (!payload || payload.success !== true || !('data' in payload)) {
      return { ok: false, error: 'Dữ liệu phản hồi từ máy chủ không hợp lệ.' };
    }

    return { ok: true, data: payload.data as T };
  } catch {
    return {
      ok: false,
      error: 'Không thể kết nối máy chủ Backend. Anh kiểm tra lại dịch vụ cổng 3001 nhé.',
    };
  } finally {
    if (timerId !== null && typeof clearTimeout === 'function') {
      clearTimeout(timerId);
    }
    if (controller && options.signal) {
      options.signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

async function requestApi<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH';
    body?: unknown;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<T | null> {
  const result = await requestApiDetailed<T>(path, options);
  return result.ok ? result.data : null;
}

export async function fetchSongs(
  params?: FetchSongsParams,
): Promise<Song[] | null> {
  const data = await requestApi<Song[]>(buildSongsPath(params), {
    signal: params?.signal,
    ...(params?.q?.trim() ? { timeoutMs: 10000 } : {}),
  });
  return Array.isArray(data) ? data : null;
}

export async function fetchCharts(
  signal?: AbortSignal,
): Promise<Song[] | null> {
  const data = await requestApi<Song[]>('/v1/songs/charts', { signal });
  return Array.isArray(data) ? data : null;
}

export async function fetchPlaylists(
  signal?: AbortSignal,
): Promise<Playlist[] | null> {
  const data = await requestApi<Playlist[]>('/v1/playlists', { signal });
  return Array.isArray(data) ? data : null;
}

export async function fetchSongLyrics(
  songId: string,
  signal?: AbortSignal,
): Promise<SongLyricsResult | null> {
  if (!songId.trim()) {
    return null;
  }
  return requestApi<SongLyricsResult>(
    `/v1/songs/${encodeURIComponent(songId)}/lyrics`,
    { signal },
  );
}

export async function resolveEmbeddableSong(
  songId: string,
): Promise<Song | null> {
  if (!songId.trim()) {
    return null;
  }
  return requestApi<Song>(
    `/v1/songs/${encodeURIComponent(songId)}/resolve-embeddable`,
    {
      method: 'POST',
      timeoutMs: 10000,
    },
  );
}

export async function recordSongPlay(songId: string): Promise<Song | null> {
  if (!songId.trim()) {
    return null;
  }
  return requestApi<Song>(`/v1/songs/${encodeURIComponent(songId)}/play`, {
    method: 'POST',
  });
}

export async function toggleSongLike(
  songId: string,
): Promise<ToggleSongLikeResult | null> {
  if (!songId.trim()) {
    return null;
  }
  return requestApi<ToggleSongLikeResult>(
    `/v1/songs/${encodeURIComponent(songId)}/like`,
    { method: 'POST' },
  );
}

export async function createBackendPlaylist(
  input: CreateBackendPlaylistInput,
): Promise<Playlist | null> {
  const title = input.title.trim();
  if (!title) {
    return null;
  }
  return requestApi<Playlist>('/v1/playlists', {
    method: 'POST',
    body: {
      title: title.slice(0, 80),
      ...(input.description ? { description: input.description } : {}),
      ...(input.coverUrl ? { coverUrl: input.coverUrl } : {}),
      ...(input.mood ? { mood: input.mood } : {}),
      ...(input.songIds ? { songIds: input.songIds } : {}),
    },
  });
}

export async function sendAiMoodChat(
  message: string,
  options?: { createPlaylist?: boolean; signal?: AbortSignal },
): Promise<AiMoodChatResult | null> {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }
  return requestApi<AiMoodChatResult>('/v1/ai/chat', {
    method: 'POST',
    body: {
      message: trimmed,
      ...(options?.createPlaylist !== undefined
        ? { createPlaylist: options.createPlaylist }
        : {}),
    },
    signal: options?.signal,
    timeoutMs: 10000,
  });
}

export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<ApiMutationResult<AuthSessionResult>> {
  return requestApiDetailed<AuthSessionResult>('/v1/auth/login', {
    method: 'POST',
    body: {
      email: input.email.trim(),
      password: input.password,
    },
  });
}

export async function registerAccount(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<ApiMutationResult<AuthSessionResult>> {
  return requestApiDetailed<AuthSessionResult>('/v1/auth/register', {
    method: 'POST',
    body: {
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      password: input.password,
    },
  });
}

export async function loginWithGoogleToken(
  idToken: string,
): Promise<ApiMutationResult<AuthSessionResult>> {
  return requestApiDetailed<AuthSessionResult>('/v1/auth/google', {
    method: 'POST',
    body: { idToken: idToken.trim() },
  });
}

export async function fetchCurrentUserDetailed(
  signal?: AbortSignal,
): Promise<ApiMutationResult<AuthUser>> {
  if (!getStoredAccessToken()) {
    return { ok: false, error: 'Chưa có phiên đăng nhập.', statusCode: 401 };
  }
  return requestApiDetailed<AuthUser>('/v1/auth/me', { signal });
}

export async function fetchCurrentUser(
  signal?: AbortSignal,
): Promise<AuthUser | null> {
  const res = await fetchCurrentUserDetailed(signal);
  return res.ok ? res.data : null;
}

export interface JamMemberDto {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  joinedAt: number;
}

export interface JamReactionDto {
  id: string;
  emoji: string;
  sender: string;
  timestamp: number;
}

export interface JamRoomDto {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  currentSong: Song | null;
  currentTime: number;
  isPlaying: boolean;
  lastUpdated: number;
  members: JamMemberDto[];
  queue: Song[];
  reactions: JamReactionDto[];
}

export async function createJamRoomApi(
  payload: {
    hostName?: string;
    hostId?: string;
    initialSong?: Song | null;
    isPlaying?: boolean;
    currentTime?: number;
  },
): Promise<ApiMutationResult<JamRoomDto>> {
  return requestApiDetailed<JamRoomDto>('/v1/jam/rooms', {
    method: 'POST',
    body: payload,
  });
}

export async function getJamRoomApi(code: string): Promise<JamRoomDto | null> {
  const res = await requestApiDetailed<JamRoomDto>(
    `/v1/jam/rooms/${encodeURIComponent(code)}`,
  );
  return res.ok ? res.data : null;
}

export async function joinJamRoomApi(
  code: string,
  payload: { memberName?: string; memberId?: string },
): Promise<ApiMutationResult<JamRoomDto>> {
  return requestApiDetailed<JamRoomDto>(
    `/v1/jam/rooms/${encodeURIComponent(code)}/join`,
    {
      method: 'POST',
      body: payload,
    },
  );
}

export async function leaveJamRoomApi(
  code: string,
  memberId: string,
): Promise<ApiMutationResult<JamRoomDto>> {
  return requestApiDetailed<JamRoomDto>(
    `/v1/jam/rooms/${encodeURIComponent(code)}/leave`,
    {
      method: 'POST',
      body: { memberId },
    },
  );
}

export async function sendJamActionApi(
  code: string,
  action: {
    type: string;
    time?: number;
    song?: Song;
    emoji?: string;
    senderName?: string;
  },
  memberId?: string,
): Promise<ApiMutationResult<JamRoomDto>> {
  return requestApiDetailed<JamRoomDto>(
    `/v1/jam/rooms/${encodeURIComponent(code)}/action`,
    {
      method: 'POST',
      body: { action, memberId },
    },
  );
}
