import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DEMO_USER_ID,
  type LyricLineDto,
  type MoodType,
  type PlaylistDto,
  type SongDto,
} from '../../common/types/domain.types.js';
import { AppConfigService } from '../../config/env.config.js';
import { DatabaseService } from '../../database/database.service.js';
import { LrclibLyricsService } from '../youtube/lrclib-lyrics.service.js';
import { parseLrcLines } from '../youtube/lrc-parser.util.js';
import { YouTubeMusicService } from '../youtube/youtube-music.service.js';

export { parseLrcLines };

export type CatalogView = 'discover' | 'charts' | 'library';

export interface GetSongsParams {
  mood?: string;
  q?: string;
  query?: string;
  view?: CatalogView;
  userId?: string;
}

export interface CreatePlaylistInput {
  title: string;
  description?: string;
  coverUrl?: string;
  mood?: MoodType;
  songIds?: string[];
}

export interface SongLyricsResponse {
  songId: string;
  isSynced: boolean;
  rawLrc: string;
  plainLyrics: string | null;
  lines: LyricLineDto[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

function parseStrictPositiveInt(
  raw: string,
  field: string,
  min: number,
  max: number,
): number {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new BadRequestException(`${field} must be a positive integer`);
  }
  const value = Number.parseInt(trimmed, 10);
  if (value < min || value > max) {
    throw new BadRequestException(`${field} must be between ${min} and ${max}`);
  }
  return value;
}

const VALID_MOODS: ReadonlySet<MoodType> = new Set([
  'chill',
  'sad',
  'energetic',
  'focus',
  'acoustic',
]);

const VALID_VIEWS: ReadonlySet<CatalogView> = new Set([
  'discover',
  'charts',
  'library',
]);

const FALLBACK_LRC: Readonly<Record<string, string>> = {
  'song-1': [
    '[00:00.00]Chuyện Đôi Ta - Emcee L ft. Muộii',
    '[00:03.00]Giai điệu Acoustic êm dịu vỗ về tâm hồn',
    '[00:06.50]Có những chuyện tình thật nhẹ nhàng qua năm tháng',
    '[00:11.20]Ngồi bên nhau nghe tiếng gió thở dài',
    '[00:16.80]Chẳng cần lời hứa hẹn xa xôi muôn trùng',
    '[00:21.50]Chỉ cần hôm nay có nhau trong từng nhịp thở',
    '[00:26.00]DMPTiFy - Âm nhạc chữa lành cảm xúc',
  ].join('\n'),
  'song-2': [
    '[00:00.00]Mưa Tháng Sáu - Văn Mai Hương x GREY D',
    '[00:03.50]Cơn mưa chiều rơi rơi qua khung cửa sổ',
    '[00:07.80]Lòng ngập tràn những ký ức không tên',
    '[00:12.50]Từng giọt mưa như từng nỗi nhớ vỡ òa',
    '[00:17.20]Người từng thương giờ đã hóa người xa lạ',
    '[00:22.00]Để lại góc quán quen một chiều mưa bay',
    '[00:26.50]Gợi ý bởi AI Gemini: Dành cho những chiều tâm trạng',
  ].join('\n'),
  'song-3': [
    '[00:00.00]Ánh Sao Và Bầu Trời - T.R.I x Cá',
    '[00:04.00]Đêm muộn nhìn lên ngàn vì sao sáng',
    '[00:08.50]Có vì sao nào soi sáng bước chân anh?',
    '[00:13.20]Gió khẽ lay qua từng nhành cây góc phố',
    '[00:18.00]Bình yên là khi tâm trí được tự do',
    '[00:23.00]Lắng nghe từng giai điệu mộc mạc ru êm',
  ].join('\n'),
  'song-4': [
    '[00:00.00]Đi Giữa Trời Rực Rỡ - Ngô Lan Hương',
    '[00:03.00]Nắng ban mai rọi sáng con đường phía trước',
    '[00:07.20]Năng lượng bừng sáng cho một ngày mới',
    '[00:11.80]Hãy cứ bước đi với nụ cười trên môi',
    '[00:16.50]Đời còn bao điều kỳ diệu đang đón chờ',
    '[00:21.00]DMPTiFy: Nạp năng lượng tích cực cho bạn!',
  ].join('\n'),
  'song-5': [
    '[00:00.00]Lofi Study Beats - DMPTiFy Ambient',
    '[00:04.50]Giai điệu Lofi không lời hỗ trợ tập trung cao độ',
    '[00:10.00]Nhịp BPM 72 giúp não bộ ổn định sóng Alpha',
    '[00:16.00]Tập trung học tập, ôn thi và làm việc hiệu quả',
    '[00:22.00]Không gian yên tĩnh lý tưởng dành riêng cho bạn',
  ].join('\n'),
};

const SAFE_SONG_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const LYRICS_CACHE_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class CatalogService {
  private readonly lyricsCache = new Map<
    string,
    { value: SongLyricsResponse; expiresAt: number }
  >();

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Optional() @Inject(AppConfigService) private readonly config?: AppConfigService,
    @Optional() @Inject(YouTubeMusicService) private readonly youTubeMusic?: YouTubeMusicService,
    @Optional() @Inject(LrclibLyricsService) private readonly lrclibLyrics?: LrclibLyricsService,
  ) {}

  async getSongs(params: GetSongsParams = {}, authUserId?: string): Promise<SongDto[]> {
    const effectiveUserId = authUserId ?? params.userId;
    let view = params.view;

    if (view !== undefined && (view as string) !== '' && !VALID_VIEWS.has(view)) {
      throw new BadRequestException(`Invalid view parameter: ${String(view)}`);
    }

    let mood = params.mood?.trim() || undefined;
    if (mood === 'all') {
      mood = undefined;
    } else if (mood === 'liked') {
      mood = undefined;
      view = 'library';
    }

    const query = (params.q ?? params.query)?.trim() || undefined;

    const localSongs = await this.database.listSongs({
      mood,
      query,
      view: view || undefined,
      userId: effectiveUserId,
    });

    if (
      query &&
      query.length >= 2 &&
      view !== 'library' &&
      localSongs.length < 5 &&
      this.youTubeMusic &&
      this.config &&
      this.config.nodeEnv !== 'test'
    ) {
      const validMood =
        mood && VALID_MOODS.has(mood as MoodType)
          ? (mood as MoodType)
          : undefined;
      const ytSongs = await this.youTubeMusic.searchAndCacheTracks(query, {
        mood: validMood,
        userId: effectiveUserId,
      });

      if (ytSongs.length > 0) {
        const refreshed = await this.database.listSongs({
          mood,
          query,
          view: view || undefined,
          userId: effectiveUserId,
        });
        const merged = [...refreshed];
        const seenIds = new Set(merged.map((s) => s.id));
        for (const ytSong of ytSongs) {
          if (!seenIds.has(ytSong.id) && (!mood || ytSong.mood === mood)) {
            seenIds.add(ytSong.id);
            merged.push(ytSong);
          }
        }
        return merged;
      }
    }

    return localSongs;
  }

  async searchYouTube(q: string, authUserId?: string): Promise<SongDto[]> {
    const trimmed = q.trim();
    if (!trimmed) {
      return [];
    }

    const effectiveUserId = authUserId;
    const ytSongs =
      this.youTubeMusic &&
      this.config &&
      this.config.nodeEnv !== 'test'
        ? await this.youTubeMusic.searchAndCacheTracks(trimmed, {
            userId: effectiveUserId,
          })
        : [];

    const localMatches = await this.database.listSongs({
      query: trimmed,
      userId: effectiveUserId,
    });

    const merged = [...ytSongs];
    const seenIds = new Set(merged.map((s) => s.id));
    for (const localSong of localMatches) {
      if (!seenIds.has(localSong.id)) {
        seenIds.add(localSong.id);
        merged.push(localSong);
      }
    }
    return merged;
  }

  async resolveEmbeddable(songId: string, authUserId?: string): Promise<SongDto> {
    const effectiveUserId = authUserId;
    const song = await this.database.findSongById(songId, effectiveUserId);
    if (!song) {
      throw new NotFoundException(`Song ${songId} not found`);
    }
    if (!this.youTubeMusic) {
      return song;
    }
    return this.youTubeMusic.resolveAlternativeEmbeddable(song, effectiveUserId);
  }

  paginateSongs(
    songs: SongDto[],
    rawPage?: string,
    rawLimit?: string,
  ): { items: SongDto[]; meta?: PaginationMeta } {
    const hasPage = typeof rawPage === 'string' && rawPage.trim().length > 0;
    const hasLimit = typeof rawLimit === 'string' && rawLimit.trim().length > 0;
    if (!hasPage && !hasLimit) {
      return { items: songs };
    }

    const page = hasPage
      ? parseStrictPositiveInt(rawPage, 'page', 1, 10_000)
      : 1;
    const limit = hasLimit
      ? parseStrictPositiveInt(rawLimit, 'limit', 1, 100)
      : 20;
    const totalItems = songs.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const offset = (page - 1) * limit;

    return {
      items: songs.slice(offset, offset + limit),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async getCharts(authUserId?: string): Promise<SongDto[]> {
    return this.database.listSongs({
      view: 'charts',
      userId: authUserId,
    });
  }

  async getSongById(id: string, authUserId?: string): Promise<SongDto> {
    const song = await this.database.findSongById(id, authUserId);
    if (!song) {
      throw new NotFoundException(`Song ${id} not found`);
    }
    return song;
  }

  private async loadRawLrc(songId: string): Promise<string | null> {
    if (!songId || !SAFE_SONG_ID_REGEX.test(songId)) {
      return null;
    }

    const candidatePaths = [
      path.resolve(process.cwd(), 'FE/public/lyrics', `${songId}.lrc`),
      path.resolve(process.cwd(), '../FE/public/lyrics', `${songId}.lrc`),
    ];

    for (const candidatePath of candidatePaths) {
      try {
        const content = await readFile(candidatePath, 'utf8');
        if (content.trim().length > 0) {
          return content;
        }
      } catch {
        // Try next candidate path or fallback
      }
    }

    return FALLBACK_LRC[songId] ?? null;
  }

  async getSongLyrics(id: string): Promise<SongLyricsResponse> {
    if (id.startsWith('song-')) {
      const rawLrc = await this.loadRawLrc(id);
      if (rawLrc) {
        return {
          songId: id,
          isSynced: true,
          rawLrc,
          plainLyrics: null,
          lines: parseLrcLines(rawLrc),
        };
      }
    }

    const song = await this.database.findSongById(id);
    if (!song) {
      throw new NotFoundException(`Lyrics for song ${id} not found`);
    }

    const now = Date.now();
    const cached = this.lyricsCache.get(id);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const resolved = this.lrclibLyrics
      ? await this.lrclibLyrics.findLyrics(song.title, song.artist, song.duration)
      : null;
    if (!resolved) {
      throw new NotFoundException(`Lyrics for song ${id} not found`);
    }

    const response: SongLyricsResponse = {
      songId: id,
      isSynced: resolved.isSynced,
      rawLrc: resolved.rawLrc,
      plainLyrics: resolved.plainLyrics,
      lines: resolved.lines,
    };
    this.lyricsCache.set(id, {
      value: response,
      expiresAt: now + LYRICS_CACHE_TTL_MS,
    });
    return response;
  }

  async recordPlay(id: string): Promise<SongDto> {
    const updated = await this.database.incrementSongPlayCount(id);
    if (!updated) {
      throw new NotFoundException(`Song ${id} not found`);
    }
    return updated;
  }

  async toggleLike(id: string, authUserId?: string): Promise<{ songId: string; liked: boolean }> {
    const result = await this.database.toggleSongLike(authUserId ?? DEMO_USER_ID, id);
    if (!result) {
      throw new NotFoundException(`Song ${id} not found`);
    }
    return result;
  }

  async getPlaylists(authUserId?: string): Promise<PlaylistDto[]> {
    return this.database.listPlaylists(authUserId ?? DEMO_USER_ID);
  }

  private async validateAndDeduplicateSongIds(songIds: unknown): Promise<string[]> {
    if (!Array.isArray(songIds)) {
      throw new BadRequestException('songIds must be an array of song IDs');
    }

    const uniqueIds: string[] = [];
    const seen = new Set<string>();

    for (const rawId of songIds) {
      if (typeof rawId !== 'string' || !rawId.trim()) {
        throw new BadRequestException('Each songId must be a non-empty string');
      }
      const normalized = rawId.trim();
      if (seen.has(normalized)) {
        continue;
      }

      const song = await this.database.findSongById(normalized);
      if (!song) {
        throw new BadRequestException(`Song ${normalized} does not exist`);
      }

      seen.add(normalized);
      uniqueIds.push(normalized);
    }

    return uniqueIds;
  }

  async createPlaylist(dto: CreatePlaylistInput, authUserId?: string): Promise<PlaylistDto> {
    const rawTitle = typeof dto?.title === 'string' ? dto.title.trim() : '';
    if (!rawTitle || rawTitle.length > 80) {
      throw new BadRequestException('Playlist title must be between 1 and 80 characters');
    }

    if (dto.mood !== undefined && !VALID_MOODS.has(dto.mood)) {
      throw new BadRequestException(`Invalid mood: ${String(dto.mood)}`);
    }

    const songIds =
      dto.songIds !== undefined ? await this.validateAndDeduplicateSongIds(dto.songIds) : [];
    const firstSong =
      songIds.length > 0 ? await this.database.findSongById(songIds[0]) : null;
    const explicitCover = dto.coverUrl?.trim();

    return this.database.createPlaylist({
      userId: authUserId ?? DEMO_USER_ID,
      title: rawTitle,
      description: dto.description?.trim() || 'Danh sách phát cá nhân',
      ...(explicitCover
        ? { coverUrl: explicitCover }
        : firstSong?.coverUrl
          ? { coverUrl: firstSong.coverUrl }
          : {}),
      mood: dto.mood,
      isAiGenerated: false,
      isPublic: true,
      songIds,
    });
  }

  async updatePlaylistSongs(id: string, songIds: string[]): Promise<PlaylistDto> {
    if (!Array.isArray(songIds)) {
      throw new BadRequestException('songIds must be an array of song IDs');
    }

    const existing = await this.database.findPlaylistById(id);
    if (!existing) {
      throw new NotFoundException(`Playlist ${id} not found`);
    }

    const uniqueSongIds = await this.validateAndDeduplicateSongIds(songIds);
    const updated = await this.database.updatePlaylistSongs(id, uniqueSongIds);
    if (!updated) {
      throw new NotFoundException(`Playlist ${id} not found`);
    }

    return updated;
  }
}
