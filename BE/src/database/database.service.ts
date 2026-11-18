import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  DEMO_USER_ID,
  type AiChatLogRecord,
  type MoodType,
  type PaymentStatus,
  type PaymentTransactionRecord,
  type PlanTier,
  type PlaylistDto,
  type SongDto,
  type UserRecord,
  type UserRole,
} from '../common/types/domain.types.js';
import { extractYoutubeVideoId } from '../common/utils/youtube-url.util.js';
import { AppConfigService } from '../config/env.config.js';
import { seedPrismaDatabase } from './prisma-seed.helper.js';
import {
  INITIAL_PLAYLISTS,
  INITIAL_SONGS,
  INITIAL_USER,
  INITIAL_USER_LIKED_SONG_IDS,
  MOOD_DEFAULT_COVER,
  VPOP_INITIAL_LIKED_SONG_IDS,
  VPOP_SHOWCASE_PLAYLISTS,
  VPOP_SHOWCASE_SONGS,
  type SeedSongRecord,
} from './seed-data.js';

export type DatabaseDriverMode = 'prisma-mysql' | 'in-memory-fallback';

export interface UpsertSongInput {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  audioUrl: string;
  coverUrl: string;
  lyricsUrl?: string | null;
  mood: MoodType;
  moodLabel: string;
  bpm: number;
  playCount?: number;
  isVipOnly?: boolean;
  youtubeVideoId?: string;
}

export interface UpdateSongMediaPatch {
  audioUrl?: string;
  coverUrl?: string;
  lyricsUrl?: string | null;
  duration?: number;
  youtubeVideoId?: string;
}

interface InMemoryPlaylistRecord {
  id: string;
  userId: string | null;
  title: string;
  description: string;
  coverUrl: string;
  mood: MoodType | null;
  isAiGenerated: boolean;
  isPublic: boolean;
  songIds: string[];
  createdAt: Date;
}

interface InMemoryStore {
  users: Map<string, UserRecord>;
  songs: Map<string, SeedSongRecord>;
  likes: Map<string, Set<string>>;
  playlists: Map<string, InMemoryPlaylistRecord>;
  aiChatLogs: AiChatLogRecord[];
  payments: Map<string, PaymentTransactionRecord>;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function cloneUser(user: UserRecord): UserRecord {
  return {
    ...user,
    vipExpiresAt: user.vipExpiresAt ? new Date(user.vipExpiresAt) : null,
    createdAt: new Date(user.createdAt),
  };
}

function clonePlaylist(playlist: InMemoryPlaylistRecord): PlaylistDto {
  const dto: PlaylistDto = {
    id: playlist.id,
    userId: playlist.userId,
    title: playlist.title,
    description: playlist.description,
    coverUrl: playlist.coverUrl,
    songIds: [...playlist.songIds],
    songsCount: playlist.songIds.length,
    isAiGenerated: playlist.isAiGenerated,
    isPublic: playlist.isPublic,
  };
  if (playlist.mood) {
    dto.mood = playlist.mood;
  }
  return dto;
}

function cloneAiChatLog(log: AiChatLogRecord): AiChatLogRecord {
  return {
    ...log,
    createdAt: new Date(log.createdAt),
  };
}

function clonePayment(
  payment: PaymentTransactionRecord,
): PaymentTransactionRecord {
  return {
    ...payment,
    rawIpnPayload: payment.rawIpnPayload ? { ...payment.rawIpnPayload } : null,
    paidAt: payment.paidAt ? new Date(payment.paidAt) : null,
    createdAt: new Date(payment.createdAt),
  };
}

function mapSongToDto(
  row: {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    audioUrl: string;
    coverUrl: string;
    lyricsUrl?: string | null;
    mood: string;
    moodLabel: string;
    bpm: number;
    playCount: number;
    isVipOnly: boolean;
  },
  liked: boolean,
): SongDto {
  const youtubeVideoId = extractYoutubeVideoId(row.audioUrl);
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    duration: row.duration,
    audioUrl: row.audioUrl,
    coverUrl: row.coverUrl,
    ...(row.lyricsUrl ? { lyricsUrl: row.lyricsUrl } : {}),
    ...(youtubeVideoId ? { youtubeVideoId } : {}),
    mood: row.mood as MoodType,
    moodLabel: row.moodLabel,
    bpm: row.bpm,
    liked,
    playCount: row.playCount,
    isVipOnly: row.isVipOnly,
  };
}

function buildInitialStore(includeShowcase = false): InMemoryStore {
  const users = new Map<string, UserRecord>();
  users.set(INITIAL_USER.id, cloneUser(INITIAL_USER));

  const songs = new Map<string, SeedSongRecord>();
  const seedSongs = includeShowcase ? VPOP_SHOWCASE_SONGS : INITIAL_SONGS;
  for (const song of seedSongs) {
    songs.set(song.id, { ...song, createdAt: new Date(song.createdAt) });
  }

  const likes = new Map<string, Set<string>>();
  likes.set(
    INITIAL_USER.id,
    new Set(
      includeShowcase ? VPOP_INITIAL_LIKED_SONG_IDS : INITIAL_USER_LIKED_SONG_IDS,
    ),
  );

  const playlists = new Map<string, InMemoryPlaylistRecord>();
  const seedPlaylists = includeShowcase
    ? VPOP_SHOWCASE_PLAYLISTS
    : INITIAL_PLAYLISTS;
  for (const playlist of seedPlaylists) {
    playlists.set(playlist.id, {
      ...playlist,
      songIds: [...playlist.songIds],
      createdAt: new Date(playlist.createdAt),
    });
  }

  return {
    users,
    songs,
    likes,
    playlists,
    aiChatLogs: [],
    payments: new Map(),
  };
}

function deduplicateOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of values) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

function mapPrismaUser(row: {
  id: string;
  email: string;
  passwordHash: string | null;
  fullName: string;
  avatarUrl: string | null;
  googleId: string | null;
  role: string;
  planTier: string;
  vipExpiresAt: Date | null;
  createdAt: Date;
}): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    fullName: row.fullName,
    avatarUrl: row.avatarUrl,
    googleId: row.googleId,
    role: row.role as UserRole,
    planTier: row.planTier as PlanTier,
    vipExpiresAt: row.vipExpiresAt ? new Date(row.vipExpiresAt) : null,
    createdAt: new Date(row.createdAt),
  };
}

function mapPrismaPayment(row: {
  id: string;
  txnRef: string;
  userId: string;
  amountVnd: number;
  status: string;
  vnpTransactionNo: string | null;
  rawIpnPayload: Prisma.JsonValue | null;
  paidAt: Date | null;
  createdAt: Date;
}): PaymentTransactionRecord {
  const rawIpnPayload =
    row.rawIpnPayload &&
    typeof row.rawIpnPayload === 'object' &&
    !Array.isArray(row.rawIpnPayload)
      ? (row.rawIpnPayload as Record<string, unknown>)
      : null;
  return {
    id: row.id,
    txnRef: row.txnRef,
    userId: row.userId,
    amountVnd: row.amountVnd,
    status: row.status as PaymentStatus,
    vnpTransactionNo: row.vnpTransactionNo,
    rawIpnPayload,
    paidAt: row.paidAt ? new Date(row.paidAt) : null,
    createdAt: new Date(row.createdAt),
  };
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private mode: DatabaseDriverMode = 'in-memory-fallback';
  private prisma: PrismaClient | null = null;
  private mem: InMemoryStore = buildInitialStore(false);
  private initPromise: Promise<void> | null = null;

  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureInitialized();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initializeDriver();
    }
    await this.initPromise;
  }

  private async initializeDriver(): Promise<void> {
    const includeShowcase = this.config.nodeEnv !== 'test';
    if (this.config.dbMode === 'memory') {
      this.mode = 'in-memory-fallback';
      this.mem = buildInitialStore(includeShowcase);
      return;
    }

    const client = new PrismaClient({
      datasources: {
        db: {
          url: this.config.databaseUrl,
        },
      },
    });

    try {
      await this.withTimeout(
        (async () => {
          await client.$connect();
          const songCount = await client.song.count();
          if (songCount === 0) {
            await seedPrismaDatabase(client);
          }
          if (includeShowcase) {
            await this.ensureShowcaseSongsInPrisma(client);
          }
        })(),
        2500,
      );
      this.prisma = client;
      this.mode = 'prisma-mysql';
    } catch (error) {
      await client.$disconnect().catch(() => undefined);
      if (this.config.dbMode === 'mysql') {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `MySQL unreachable or unmigrated (${message}). Using seeded 3NF in-memory fallback.`,
      );
      this.prisma = null;
      this.mode = 'in-memory-fallback';
      this.mem = buildInitialStore(includeShowcase);
    }
  }

  private async ensureShowcaseSongsInPrisma(
    client: PrismaClient,
  ): Promise<void> {
    try {
      const legacyIds = INITIAL_SONGS.map((s) => s.id);
      await client.playlistSong.deleteMany({
        where: { songId: { in: legacyIds } },
      });
      await client.userSongLike.deleteMany({
        where: { songId: { in: legacyIds } },
      });
      await client.song.deleteMany({
        where: { id: { in: legacyIds } },
      });

      await client.song.createMany({
        data: VPOP_SHOWCASE_SONGS.map((song) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
          audioUrl: song.audioUrl,
          coverUrl: song.coverUrl,
          lyricsUrl: song.lyricsUrl || null,
          mood: song.mood,
          moodLabel: song.moodLabel,
          bpm: song.bpm,
          playCount: song.playCount,
          isVipOnly: song.isVipOnly,
          createdAt: song.createdAt,
        })),
        skipDuplicates: true,
      });

      for (const playlist of VPOP_SHOWCASE_PLAYLISTS) {
        await client.playlist.upsert({
          where: { id: playlist.id },
          update: {
            title: playlist.title,
            description: playlist.description,
            mood: playlist.mood,
          },
          create: {
            id: playlist.id,
            userId: playlist.userId,
            title: playlist.title,
            description: playlist.description,
            coverUrl: playlist.coverUrl,
            mood: playlist.mood,
            isAiGenerated: playlist.isAiGenerated,
            isPublic: playlist.isPublic,
            createdAt: playlist.createdAt,
          },
        });

        await client.playlistSong.deleteMany({
          where: { playlistId: playlist.id },
        });
        if (playlist.songIds.length > 0) {
          await client.playlistSong.createMany({
            data: playlist.songIds.map((songId, index) => ({
              playlistId: playlist.id,
              songId,
              position: index,
            })),
            skipDuplicates: true,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Could not ensure V-Pop showcase songs in MySQL: ${message}`,
      );
    }
  }

  async refreshPlaylistCoversFromFirstSong(): Promise<void> {
    await this.ensureInitialized();

    if (this.mode === 'prisma-mysql' && this.prisma) {
      const playlists = await this.prisma.playlist.findMany({
        include: {
          songs: {
            orderBy: { position: 'asc' },
            take: 1,
            include: { song: { select: { coverUrl: true } } },
          },
        },
      });
      for (const pl of playlists) {
        const firstCover = pl.songs[0]?.song?.coverUrl;
        if (
          firstCover &&
          !firstCover.startsWith('/covers/') &&
          (!pl.coverUrl || pl.coverUrl.startsWith('/covers/'))
        ) {
          await this.prisma.playlist.update({
            where: { id: pl.id },
            data: { coverUrl: firstCover },
          });
        }
      }
      return;
    }

    for (const playlist of this.mem.playlists.values()) {
      const firstSongId = playlist.songIds[0];
      const firstSong = firstSongId ? this.mem.songs.get(firstSongId) : undefined;
      if (
        firstSong?.coverUrl &&
        !firstSong.coverUrl.startsWith('/covers/') &&
        (!playlist.coverUrl || playlist.coverUrl.startsWith('/covers/'))
      ) {
        playlist.coverUrl = firstSong.coverUrl;
      }
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`MySQL connection timed out after ${ms}ms`));
          }, ms);
        }),
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  async getHealth(): Promise<{
    driver: 'mysql';
    mode: 'prisma-mysql' | 'in-memory-fallback';
    connected: boolean;
  }> {
    await this.ensureInitialized();
    return {
      driver: 'mysql',
      mode: this.mode,
      connected: this.mode === 'prisma-mysql',
    };
  }

  async resetForTesting(): Promise<void> {
    await this.ensureInitialized();
    this.mem = buildInitialStore(false);

    if (this.mode === 'prisma-mysql' && this.prisma) {
      const client = this.prisma;
      await client.$transaction([
        client.paymentTransaction.deleteMany(),
        client.aiChatLog.deleteMany(),
        client.playlistSong.deleteMany(),
        client.userSongLike.deleteMany(),
        client.playlist.deleteMany(),
        client.song.deleteMany(),
        client.user.deleteMany(),
      ]);
      await seedPrismaDatabase(client);
    }
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    await this.ensureInitialized();
    if (this.mode === 'prisma-mysql' && this.prisma) {
      const row = await this.prisma.user.findUnique({ where: { id } });
      return row ? mapPrismaUser(row) : null;
    }
    const user = this.mem.users.get(id);
    return user ? cloneUser(user) : null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    await this.ensureInitialized();
    const normalized = email.trim().toLowerCase();
    if (this.mode === 'prisma-mysql' && this.prisma) {
      const row = await this.prisma.user.findUnique({
        where: { email: normalized },
      });
      return row ? mapPrismaUser(row) : null;
    }
    for (const user of this.mem.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return cloneUser(user);
      }
    }
    return null;
  }

  async findUserByGoogleId(googleId: string): Promise<UserRecord | null> {
    await this.ensureInitialized();
    if (this.mode === 'prisma-mysql' && this.prisma) {
      const row = await this.prisma.user.findUnique({ where: { googleId } });
      return row ? mapPrismaUser(row) : null;
    }
    for (const user of this.mem.users.values()) {
      if (user.googleId === googleId) {
        return cloneUser(user);
      }
    }
    return null;
  }

  async createUser(input: {
    id?: string;
    email: string;
    passwordHash?: string | null;
    fullName: string;
    avatarUrl?: string | null;
    googleId?: string | null;
    role?: UserRole;
    planTier?: PlanTier;
  }): Promise<UserRecord> {
    await this.ensureInitialized();
    const normalizedEmail = input.email.trim().toLowerCase();
    const id = input.id ?? `user-${randomUUID()}`;

    if (this.mode === 'prisma-mysql' && this.prisma) {
      const created = await this.prisma.user.create({
        data: {
          id,
          email: normalizedEmail,
          passwordHash: input.passwordHash ?? null,
          fullName: input.fullName.trim(),
          avatarUrl: input.avatarUrl ?? null,
          googleId: input.googleId ?? null,
          role: input.role ?? 'USER',
          planTier: input.planTier ?? 'FREE',
          vipExpiresAt: null,
        },
      });
      return mapPrismaUser(created);
    }

    for (const existing of this.mem.users.values()) {
      if (existing.email.toLowerCase() === normalizedEmail) {
        throw new Error(`Duplicate user email: ${normalizedEmail}`);
      }
      if (input.googleId && existing.googleId === input.googleId) {
        throw new Error(`Duplicate googleId: ${input.googleId}`);
      }
    }

    const user: UserRecord = {
      id,
      email: normalizedEmail,
      passwordHash: input.passwordHash ?? null,
      fullName: input.fullName.trim(),
      avatarUrl: input.avatarUrl ?? null,
      googleId: input.googleId ?? null,
      role: input.role ?? 'USER',
      planTier: input.planTier ?? 'FREE',
      vipExpiresAt: null,
      createdAt: new Date(),
    };
    this.mem.users.set(user.id, user);
    return cloneUser(user);
  }

  async updateUserGoogleLink(
    userId: string,
    googleId: string,
    avatarUrl?: string | null,
  ): Promise<UserRecord> {
    await this.ensureInitialized();
    if (this.mode === 'prisma-mysql' && this.prisma) {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleId,
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        },
      });
      return mapPrismaUser(updated);
    }

    const user = this.mem.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    user.googleId = googleId;
    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl;
    }
    return cloneUser(user);
  }

  async upgradeUserToVip(
    userId: string,
    vipExpiresAt: Date,
  ): Promise<UserRecord> {
    await this.ensureInitialized();
    if (this.mode === 'prisma-mysql' && this.prisma) {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          planTier: 'VIP',
          vipExpiresAt,
        },
      });
      return mapPrismaUser(updated);
    }

    const user = this.mem.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    user.planTier = 'VIP';
    user.vipExpiresAt = new Date(vipExpiresAt);
    return cloneUser(user);
  }

  async listSongs(params?: {
    mood?: string;
    query?: string;
    view?: 'discover' | 'charts' | 'library';
    userId?: string;
  }): Promise<SongDto[]> {
    await this.ensureInitialized();
    const effectiveUserId = params?.userId;
    const moodFilter = params?.mood?.trim().toLowerCase();
    const queryFilter = params?.query?.trim() ?? '';

    let dtos: SongDto[];
    if (this.mode === 'prisma-mysql' && this.prisma) {
      const rows = await this.prisma.song.findMany({
        where:
          moodFilter && moodFilter !== 'all'
            ? { mood: moodFilter as MoodType }
            : undefined,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: effectiveUserId
          ? {
              likedByUsers: {
                where: { userId: effectiveUserId },
                select: { userId: true },
              },
            }
          : undefined,
      });

      dtos = rows.map((row) =>
        mapSongToDto(
          row,
          Boolean(
            effectiveUserId &&
              (row as unknown as { likedByUsers?: { userId: string }[] }).likedByUsers?.length,
          ),
        ),
      );
    } else {
      const userLikes = effectiveUserId
        ? this.mem.likes.get(effectiveUserId)
        : undefined;
      dtos = Array.from(this.mem.songs.values())
        .filter((song) => {
          if (moodFilter && moodFilter !== 'all') {
            return song.mood === moodFilter;
          }
          return true;
        })
        .map((song) =>
          mapSongToDto(song, userLikes ? userLikes.has(song.id) : false),
        );
    }

    if (queryFilter.length > 0) {
      const lowerNeedle = queryFilter.toLowerCase();
      const normNeedle = normalizeSearchText(queryFilter);
      dtos = dtos.filter((song) => {
        const fields = [song.title, song.artist, song.album, song.moodLabel];
        return fields.some(
          (field) =>
            field.toLowerCase().includes(lowerNeedle) ||
            normalizeSearchText(field).includes(normNeedle),
        );
      });
    }

    if (params?.view === 'library') {
      dtos = dtos.filter((song) => song.liked);
    } else if (params?.view === 'charts') {
      dtos = [...dtos].sort(
        (a, b) => b.playCount - a.playCount || a.id.localeCompare(b.id),
      );
    }

    return dtos;
  }

  async findSongById(
    songId: string,
    userId?: string,
  ): Promise<SongDto | null> {
    await this.ensureInitialized();
    const effectiveUserId = userId;

    if (this.mode === 'prisma-mysql' && this.prisma) {
      const row = await this.prisma.song.findUnique({
        where: { id: songId },
        include: effectiveUserId
          ? {
              likedByUsers: {
                where: { userId: effectiveUserId },
                select: { userId: true },
              },
            }
          : undefined,
      });
      if (!row) {
        return null;
      }
      return mapSongToDto(
        row,
        Boolean(
          effectiveUserId &&
            (row as unknown as { likedByUsers?: { userId: string }[] }).likedByUsers?.length,
        ),
      );
    }

    const song = this.mem.songs.get(songId);
    if (!song) {
      return null;
    }
    const userLikes = effectiveUserId
      ? this.mem.likes.get(effectiveUserId)
      : undefined;
    return mapSongToDto(song, userLikes ? userLikes.has(song.id) : false);
  }

  async upsertSong(
    input: UpsertSongInput,
    userId?: string,
  ): Promise<SongDto> {
    await this.ensureInitialized();
    const effectiveUserId = userId ?? DEMO_USER_ID;
    const safeId = input.id.trim().slice(0, 64);
    const safeTitle = input.title.trim().slice(0, 200) || 'Untitled Track';
    const safeArtist = input.artist.trim().slice(0, 200) || 'Unknown Artist';
    const safeAlbum = input.album.trim().slice(0, 200) || 'YouTube Music';
    const safeDuration = Math.max(1, Math.round(input.duration));
    const safeBpm = Math.max(40, Math.min(220, Math.round(input.bpm)));
    const safeMoodLabel = input.moodLabel.trim().slice(0, 100);
    const resolvedAudioUrl = (
      input.audioUrl.trim() ||
      (input.youtubeVideoId
        ? `https://www.youtube.com/watch?v=${input.youtubeVideoId}`
        : '')
    ).slice(0, 500);
    const safeCoverUrl = input.coverUrl.trim().slice(0, 500);
    const safeLyricsUrl =
      input.lyricsUrl !== undefined
        ? (input.lyricsUrl?.trim().slice(0, 500) ?? null)
        : undefined;

    if (this.mode === 'prisma-mysql' && this.prisma) {
      try {
        await this.prisma.song.upsert({
          where: { id: safeId },
          update: {
            title: safeTitle,
            artist: safeArtist,
            album: safeAlbum,
            duration: safeDuration,
            audioUrl: resolvedAudioUrl,
            coverUrl: safeCoverUrl,
            ...(safeLyricsUrl !== undefined
              ? { lyricsUrl: safeLyricsUrl }
              : {}),
            mood: input.mood,
            moodLabel: safeMoodLabel,
            bpm: safeBpm,
          },
          create: {
            id: safeId,
            title: safeTitle,
            artist: safeArtist,
            album: safeAlbum,
            duration: safeDuration,
            audioUrl: resolvedAudioUrl,
            coverUrl: safeCoverUrl,
            lyricsUrl: safeLyricsUrl ?? null,
            mood: input.mood,
            moodLabel: safeMoodLabel,
            bpm: safeBpm,
            playCount: input.playCount ?? 0,
            isVipOnly: input.isVipOnly ?? false,
          },
        });
        const persisted = await this.findSongById(safeId, effectiveUserId);
        if (persisted) {
          return persisted;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Prisma upsertSong(${safeId}) failed: ${message}`);
      }
    }

    const existing = this.mem.songs.get(safeId);
    const record: SeedSongRecord = {
      id: safeId,
      title: safeTitle,
      artist: safeArtist,
      album: safeAlbum,
      duration: safeDuration,
      audioUrl: resolvedAudioUrl,
      coverUrl: safeCoverUrl,
      lyricsUrl:
        safeLyricsUrl !== undefined
          ? (safeLyricsUrl ?? '')
          : (existing?.lyricsUrl ?? ''),
      mood: input.mood,
      moodLabel: safeMoodLabel,
      bpm: safeBpm,
      playCount: existing?.playCount ?? input.playCount ?? 0,
      isVipOnly: existing?.isVipOnly ?? input.isVipOnly ?? false,
      createdAt: existing?.createdAt ?? new Date(),
    };
    this.mem.songs.set(safeId, record);

    const userLikes = this.mem.likes.get(effectiveUserId);
    const dto = mapSongToDto(
      record,
      userLikes ? userLikes.has(safeId) : false,
    );
    if (!dto.youtubeVideoId && input.youtubeVideoId) {
      dto.youtubeVideoId = input.youtubeVideoId;
    }
    return dto;
  }

  async updateSongMedia(
    id: string,
    patch: UpdateSongMediaPatch,
    userId?: string,
  ): Promise<SongDto | null> {
    await this.ensureInitialized();
    const effectiveUserId = userId ?? DEMO_USER_ID;
    const resolvedAudioUrl =
      patch.audioUrl?.trim().slice(0, 500) ??
      (patch.youtubeVideoId
        ? `https://www.youtube.com/watch?v=${patch.youtubeVideoId.trim()}`
        : undefined);

    if (this.mode === 'prisma-mysql' && this.prisma) {
      try {
        const existing = await this.prisma.song.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!existing) {
          return null;
        }
        await this.prisma.song.update({
          where: { id },
          data: {
            ...(resolvedAudioUrl !== undefined
              ? { audioUrl: resolvedAudioUrl }
              : {}),
            ...(patch.coverUrl !== undefined
              ? { coverUrl: patch.coverUrl.trim().slice(0, 500) }
              : {}),
            ...(patch.lyricsUrl !== undefined
              ? { lyricsUrl: patch.lyricsUrl?.trim().slice(0, 500) ?? null }
              : {}),
            ...(patch.duration !== undefined
              ? { duration: Math.max(1, Math.round(patch.duration)) }
              : {}),
          },
        });
        return this.findSongById(id, effectiveUserId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Prisma updateSongMedia(${id}) failed: ${message}`);
        return null;
      }
    }

    const song = this.mem.songs.get(id);
    if (!song) {
      return null;
    }
    if (resolvedAudioUrl !== undefined) {
      song.audioUrl = resolvedAudioUrl;
    }
    if (patch.coverUrl !== undefined) {
      song.coverUrl = patch.coverUrl.trim().slice(0, 500);
    }
    if (patch.lyricsUrl !== undefined) {
      song.lyricsUrl = patch.lyricsUrl?.trim().slice(0, 500) ?? '';
    }
    if (patch.duration !== undefined) {
      song.duration = Math.max(1, Math.round(patch.duration));
    }

    const dto = await this.findSongById(id, effectiveUserId);
    if (dto && !dto.youtubeVideoId && patch.youtubeVideoId) {
      dto.youtubeVideoId = patch.youtubeVideoId;
    }
    return dto;
  }

  async incrementSongPlayCount(songId: string): Promise<SongDto | null> {
    await this.ensureInitialized();
    if (this.mode === 'prisma-mysql' && this.prisma) {
      const existing = await this.prisma.song.findUnique({
        where: { id: songId },
        select: { id: true },
      });
      if (!existing) {
        return null;
      }
      await this.prisma.song.update({
        where: { id: songId },
        data: { playCount: { increment: 1 } },
      });
      return this.findSongById(songId, DEMO_USER_ID);
    }

    const song = this.mem.songs.get(songId);
    if (!song) {
      return null;
    }
    song.playCount += 1;
    return this.findSongById(songId, DEMO_USER_ID);
  }

  async toggleSongLike(
    userId: string,
    songId: string,
  ): Promise<{ songId: string; liked: boolean } | null> {
    await this.ensureInitialized();
    if (this.mode === 'prisma-mysql' && this.prisma) {
      const song = await this.prisma.song.findUnique({
        where: { id: songId },
        select: { id: true },
      });
      if (!song) {
        return null;
      }
      const existing = await this.prisma.userSongLike.findUnique({
        where: { userId_songId: { userId, songId } },
      });
      if (existing) {
        await this.prisma.userSongLike.delete({
          where: { userId_songId: { userId, songId } },
        });
        return { songId, liked: false };
      }
      await this.prisma.userSongLike.create({
        data: { userId, songId },
      });
      return { songId, liked: true };
    }

    if (!this.mem.songs.has(songId)) {
      return null;
    }
    let userLikes = this.mem.likes.get(userId);
    if (!userLikes) {
      userLikes = new Set();
      this.mem.likes.set(userId, userLikes);
    }
    if (userLikes.has(songId)) {
      userLikes.delete(songId);
      return { songId, liked: false };
    }
    userLikes.add(songId);
    return { songId, liked: true };
  }

  async listPlaylists(userId?: string): Promise<PlaylistDto[]> {
    await this.ensureInitialized();
    if (this.mode === 'prisma-mysql' && this.prisma) {
      const rows = await this.prisma.playlist.findMany({
        where: userId
          ? { OR: [{ isPublic: true }, { userId }] }
          : { isPublic: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: {
          songs: {
            orderBy: { position: 'asc' },
            select: { songId: true },
          },
        },
      });
      return rows.map((row) => {
        const songIds = row.songs.map((entry) => entry.songId);
        const dto: PlaylistDto = {
          id: row.id,
          userId: row.userId,
          title: row.title,
          description: row.description,
          coverUrl: row.coverUrl,
          songIds,
          songsCount: songIds.length,
          isAiGenerated: row.isAiGenerated,
          isPublic: row.isPublic,
        };
        if (row.mood) {
          dto.mood = row.mood as MoodType;
        }
        return dto;
      });
    }

    return Array.from(this.mem.playlists.values())
      .filter((p) => p.isPublic || (userId !== undefined && p.userId === userId))
      .sort(
        (a, b) =>
          a.createdAt.getTime() - b.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      )
      .map(clonePlaylist);
  }

  async findPlaylistById(playlistId: string): Promise<PlaylistDto | null> {
    await this.ensureInitialized();
    if (this.mode === 'prisma-mysql' && this.prisma) {
      const row = await this.prisma.playlist.findUnique({
        where: { id: playlistId },
        include: {
          songs: {
            orderBy: { position: 'asc' },
            select: { songId: true },
          },
        },
      });
      if (!row) {
        return null;
      }
      const songIds = row.songs.map((entry) => entry.songId);
      const dto: PlaylistDto = {
        id: row.id,
        userId: row.userId,
        title: row.title,
        description: row.description,
        coverUrl: row.coverUrl,
        songIds,
        songsCount: songIds.length,
        isAiGenerated: row.isAiGenerated,
        isPublic: row.isPublic,
      };
      if (row.mood) {
        dto.mood = row.mood as MoodType;
      }
      return dto;
    }

    const playlist = this.mem.playlists.get(playlistId);
    return playlist ? clonePlaylist(playlist) : null;
  }

  async createPlaylist(input: {
    id?: string;
    userId?: string | null;
    title: string;
    description?: string;
    coverUrl?: string;
    mood?: MoodType;
    isAiGenerated?: boolean;
    isPublic?: boolean;
    songIds?: string[];
  }): Promise<PlaylistDto> {
    await this.ensureInitialized();
    const id = input.id ?? `pl-${randomUUID()}`;
    const uniqueInputIds = deduplicateOrdered(input.songIds ?? []);
    const firstSong =
      uniqueInputIds.length > 0
        ? await this.findSongById(uniqueInputIds[0])
        : null;
    const coverUrl =
      input.coverUrl ??
      firstSong?.coverUrl ??
      (input.mood ? MOOD_DEFAULT_COVER[input.mood] : '/covers/cover-1.svg');

    if (this.mode === 'prisma-mysql' && this.prisma) {
      const existingSongs =
        uniqueInputIds.length > 0
          ? await this.prisma.song.findMany({
              where: { id: { in: uniqueInputIds } },
              select: { id: true },
            })
          : [];
      const validSongSet = new Set(existingSongs.map((s) => s.id));
      const validSongIds = uniqueInputIds.filter((sid) =>
        validSongSet.has(sid),
      );

      await this.prisma.playlist.create({
        data: {
          id,
          userId: input.userId ?? null,
          title: input.title,
          description: input.description ?? '',
          coverUrl,
          mood: input.mood ?? null,
          isAiGenerated: input.isAiGenerated ?? false,
          isPublic: input.isPublic ?? true,
          songs:
            validSongIds.length > 0
              ? {
                  create: validSongIds.map((songId, index) => ({
                    songId,
                    position: index,
                  })),
                }
              : undefined,
        },
      });
      const created = await this.findPlaylistById(id);
      if (!created) {
        throw new Error(`Failed to reload created playlist: ${id}`);
      }
      return created;
    }

    const validSongIds = uniqueInputIds.filter((sid) => this.mem.songs.has(sid));
    const record: InMemoryPlaylistRecord = {
      id,
      userId: input.userId ?? null,
      title: input.title,
      description: input.description ?? '',
      coverUrl,
      mood: input.mood ?? null,
      isAiGenerated: input.isAiGenerated ?? false,
      isPublic: input.isPublic ?? true,
      songIds: validSongIds,
      createdAt: new Date(),
    };
    this.mem.playlists.set(id, record);
    return clonePlaylist(record);
  }

  async updatePlaylistSongs(
    playlistId: string,
    songIds: string[],
  ): Promise<PlaylistDto | null> {
    await this.ensureInitialized();
    const uniqueInputIds = deduplicateOrdered(songIds);

    if (this.mode === 'prisma-mysql' && this.prisma) {
      const existingPlaylist = await this.prisma.playlist.findUnique({
        where: { id: playlistId },
        select: { id: true },
      });
      if (!existingPlaylist) {
        return null;
      }

      const existingSongs =
        uniqueInputIds.length > 0
          ? await this.prisma.song.findMany({
              where: { id: { in: uniqueInputIds } },
              select: { id: true },
            })
          : [];
      const validSongSet = new Set(existingSongs.map((s) => s.id));
      const validSongIds = uniqueInputIds.filter((sid) =>
        validSongSet.has(sid),
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.playlistSong.deleteMany({ where: { playlistId } });
        if (validSongIds.length > 0) {
          await tx.playlistSong.createMany({
            data: validSongIds.map((songId, index) => ({
              playlistId,
              songId,
              position: index,
            })),
          });
        }
      });

      return this.findPlaylistById(playlistId);
    }

    const playlist = this.mem.playlists.get(playlistId);
    if (!playlist) {
      return null;
    }
    playlist.songIds = uniqueInputIds.filter((sid) => this.mem.songs.has(sid));
    return clonePlaylist(playlist);
  }

  async createAiChatLog(input: {
    userId?: string | null;
    userMessage: string;
    aiReply: string;
    detectedMood: string;
    targetBpm: number;
    generatedPlaylistId?: string | null;
  }): Promise<AiChatLogRecord> {
    await this.ensureInitialized();
    const id = `ai-${randomUUID()}`;

    if (this.mode === 'prisma-mysql' && this.prisma) {
      const row = await this.prisma.aiChatLog.create({
        data: {
          id,
          userId: input.userId ?? null,
          userMessage: input.userMessage,
          aiReply: input.aiReply,
          detectedMood: input.detectedMood,
          targetBpm: input.targetBpm,
          generatedPlaylistId: input.generatedPlaylistId ?? null,
        },
      });
      return {
        id: row.id,
        userId: row.userId,
        userMessage: row.userMessage,
        aiReply: row.aiReply,
        detectedMood: row.detectedMood,
        targetBpm: row.targetBpm,
        generatedPlaylistId: row.generatedPlaylistId,
        createdAt: new Date(row.createdAt),
      };
    }

    const record: AiChatLogRecord = {
      id,
      userId: input.userId ?? null,
      userMessage: input.userMessage,
      aiReply: input.aiReply,
      detectedMood: input.detectedMood,
      targetBpm: input.targetBpm,
      generatedPlaylistId: input.generatedPlaylistId ?? null,
      createdAt: new Date(),
    };
    this.mem.aiChatLogs.push(record);
    return cloneAiChatLog(record);
  }

  async listAiChatLogs(
    userId?: string,
    limit = 20,
  ): Promise<AiChatLogRecord[]> {
    await this.ensureInitialized();
    const safeLimit = Math.max(1, Math.min(100, limit));

    if (this.mode === 'prisma-mysql' && this.prisma) {
      const rows = await this.prisma.aiChatLog.findMany({
        where: userId !== undefined ? { userId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      });
      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userMessage: row.userMessage,
        aiReply: row.aiReply,
        detectedMood: row.detectedMood,
        targetBpm: row.targetBpm,
        generatedPlaylistId: row.generatedPlaylistId,
        createdAt: new Date(row.createdAt),
      }));
    }

    return this.mem.aiChatLogs
      .filter((log) => (userId !== undefined ? log.userId === userId : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, safeLimit)
      .map(cloneAiChatLog);
  }

  async createPaymentTransaction(input: {
    txnRef: string;
    userId: string;
    amountVnd: number;
  }): Promise<PaymentTransactionRecord> {
    await this.ensureInitialized();
    const id = `pay-${randomUUID()}`;

    if (this.mode === 'prisma-mysql' && this.prisma) {
      const row = await this.prisma.paymentTransaction.create({
        data: {
          id,
          txnRef: input.txnRef,
          userId: input.userId,
          amountVnd: input.amountVnd,
          status: 'PENDING',
        },
      });
      return mapPrismaPayment(row);
    }

    if (this.mem.payments.has(input.txnRef)) {
      throw new Error(`Duplicate txnRef: ${input.txnRef}`);
    }
    const record: PaymentTransactionRecord = {
      id,
      txnRef: input.txnRef,
      userId: input.userId,
      amountVnd: input.amountVnd,
      status: 'PENDING',
      vnpTransactionNo: null,
      rawIpnPayload: null,
      paidAt: null,
      createdAt: new Date(),
    };
    this.mem.payments.set(input.txnRef, record);
    return clonePayment(record);
  }

  async findPaymentByTxnRef(
    txnRef: string,
  ): Promise<PaymentTransactionRecord | null> {
    await this.ensureInitialized();
    if (this.mode === 'prisma-mysql' && this.prisma) {
      const row = await this.prisma.paymentTransaction.findUnique({
        where: { txnRef },
      });
      return row ? mapPrismaPayment(row) : null;
    }

    const payment = this.mem.payments.get(txnRef);
    return payment ? clonePayment(payment) : null;
  }

  async confirmPaymentAndUpgradeVip(input: {
    txnRef: string;
    vnpTransactionNo: string;
    rawIpnPayload: Record<string, unknown>;
    paidStatus: 'PAID' | 'FAILED';
    vipDays?: number;
  }): Promise<{
    outcome:
      | 'NOT_FOUND'
      | 'ALREADY_CONFIRMED'
      | 'UPDATED_PAID'
      | 'UPDATED_FAILED';
    transaction?: PaymentTransactionRecord;
    user?: UserRecord;
  }> {
    await this.ensureInitialized();
    const vipDays = input.vipDays ?? 30;

    if (this.mode === 'prisma-mysql' && this.prisma) {
      return this.prisma.$transaction(async (tx) => {
        const existing = await tx.paymentTransaction.findUnique({
          where: { txnRef: input.txnRef },
        });
        if (!existing) {
          return { outcome: 'NOT_FOUND' };
        }
        if (existing.status !== 'PENDING') {
          return {
            outcome: 'ALREADY_CONFIRMED',
            transaction: mapPrismaPayment(existing),
          };
        }

        if (input.paidStatus === 'FAILED') {
          const updatedFailed = await tx.paymentTransaction.update({
            where: { txnRef: input.txnRef },
            data: {
              status: 'FAILED',
              vnpTransactionNo: input.vnpTransactionNo,
              rawIpnPayload: input.rawIpnPayload as Prisma.InputJsonValue,
            },
          });
          return {
            outcome: 'UPDATED_FAILED',
            transaction: mapPrismaPayment(updatedFailed),
          };
        }

        const now = new Date();
        const existingUser = await tx.user.findUnique({
          where: { id: existing.userId },
        });
        const baseMs =
          existingUser?.vipExpiresAt &&
          existingUser.vipExpiresAt.getTime() > now.getTime()
            ? existingUser.vipExpiresAt.getTime()
            : now.getTime();
        const vipExpiresAt = new Date(baseMs + vipDays * 86_400_000);

        const updatedPaid = await tx.paymentTransaction.update({
          where: { txnRef: input.txnRef },
          data: {
            status: 'PAID',
            vnpTransactionNo: input.vnpTransactionNo,
            rawIpnPayload: input.rawIpnPayload as Prisma.InputJsonValue,
            paidAt: now,
          },
        });

        const updatedUser = existingUser
          ? await tx.user.update({
              where: { id: existing.userId },
              data: {
                planTier: 'VIP',
                vipExpiresAt,
              },
            })
          : null;

        return {
          outcome: 'UPDATED_PAID',
          transaction: mapPrismaPayment(updatedPaid),
          user: updatedUser ? mapPrismaUser(updatedUser) : undefined,
        };
      });
    }

    const payment = this.mem.payments.get(input.txnRef);
    if (!payment) {
      return { outcome: 'NOT_FOUND' };
    }
    if (payment.status !== 'PENDING') {
      return {
        outcome: 'ALREADY_CONFIRMED',
        transaction: clonePayment(payment),
      };
    }

    if (input.paidStatus === 'FAILED') {
      payment.status = 'FAILED';
      payment.vnpTransactionNo = input.vnpTransactionNo;
      payment.rawIpnPayload = { ...input.rawIpnPayload };
      return {
        outcome: 'UPDATED_FAILED',
        transaction: clonePayment(payment),
      };
    }

    const now = new Date();
    payment.status = 'PAID';
    payment.vnpTransactionNo = input.vnpTransactionNo;
    payment.rawIpnPayload = { ...input.rawIpnPayload };
    payment.paidAt = now;

    const user = this.mem.users.get(payment.userId);
    if (user) {
      const baseMs =
        user.vipExpiresAt && user.vipExpiresAt.getTime() > now.getTime()
          ? user.vipExpiresAt.getTime()
          : now.getTime();
      user.planTier = 'VIP';
      user.vipExpiresAt = new Date(baseMs + vipDays * 86_400_000);
    }

    return {
      outcome: 'UPDATED_PAID',
      transaction: clonePayment(payment),
      user: user ? cloneUser(user) : undefined,
    };
  }
}
