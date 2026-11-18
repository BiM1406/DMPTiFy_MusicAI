import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_USER_ID } from '../../common/types/domain.types.js';
import { AppConfigModule, AppConfigService } from '../../config/env.config.js';
import { DatabaseModule } from '../../database/database.module.js';
import { DatabaseService } from '../../database/database.service.js';
import { CatalogModule } from './catalog.module.js';
import { CatalogService, parseLrcLines } from './catalog.service.js';
import { PlaylistsController } from './playlists.controller.js';
import { SongsController } from './songs.controller.js';

describe('CatalogService & Controllers', () => {
  const originalFetch = globalThis.fetch;
  let catalogService: CatalogService;
  let songsController: SongsController;
  let playlistsController: PlaylistsController;
  let database: DatabaseService;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(async () => {
    process.env.DB_MODE = 'memory';
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule, CatalogModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(
        AppConfigService.fromRawEnv({
          DB_MODE: 'memory',
          NODE_ENV: 'test',
        }),
      )
      .compile();

    catalogService = moduleRef.get(CatalogService);
    songsController = moduleRef.get(SongsController);
    playlistsController = moduleRef.get(PlaylistsController);
    database = moduleRef.get(DatabaseService);

    await database.resetForTesting();
  });

  it('lists seeded songs, filters by mood/query/library view, and wraps responses with ok()', async () => {
    const allRes = await songsController.getSongs();
    expect(allRes.success).toBe(true);
    expect(allRes.data).toHaveLength(5);

    const sadSongs = await catalogService.getSongs({ mood: 'sad' });
    expect(sadSongs).toHaveLength(1);
    expect(sadSongs[0].id).toBe('song-2');

    const searchSongs = await catalogService.getSongs({ q: 'lofi' });
    expect(searchSongs).toHaveLength(1);
    expect(searchSongs[0].id).toBe('song-5');

    const likedSongs = await catalogService.getSongs({ view: 'library' }, DEMO_USER_ID);
    expect(likedSongs.map((s) => s.id)).toEqual(['song-1', 'song-3', 'song-5']);
  });

  it('records plays and reflects updated playCount in charts', async () => {
    const initialCharts = await songsController.getCharts();
    expect(initialCharts.success).toBe(true);
    const beforeSong2 = await catalogService.getSongById('song-2');

    for (let i = 0; i < 50; i++) {
      await songsController.recordPlay('song-2');
    }

    const afterSong2 = await catalogService.getSongById('song-2');
    expect(afterSong2.playCount).toBe(beforeSong2.playCount + 50);

    const updatedCharts = await catalogService.getCharts();
    expect(updatedCharts).toHaveLength(5);
    expect(updatedCharts[0].playCount).toBeGreaterThanOrEqual(updatedCharts[1].playCount);

    await expect(catalogService.recordPlay('missing-song')).rejects.toThrow(NotFoundException);
    await expect(catalogService.getSongById('missing-song')).rejects.toThrow(NotFoundException);
  });

  it('parses [mm:ss.xx] and [mm:ss.xxx] LRC lyrics and returns lyrics for seeded songs', async () => {
    const lyricsRes = await songsController.getLyrics('song-1');
    expect(lyricsRes.success).toBe(true);
    expect(lyricsRes.data.songId).toBe('song-1');
    expect(lyricsRes.data.lines.length).toBeGreaterThanOrEqual(5);
    expect(lyricsRes.data.lines[0]).toEqual({
      time: 0,
      text: 'Chuyện Đôi Ta - Emcee L ft. Muộii',
    });

    const parsedThreeDigit = parseLrcLines('[01:05.250]Dòng nhạc ba chữ số\n[00:12.50]Dòng đầu');
    expect(parsedThreeDigit).toEqual([
      { time: 12.5, text: 'Dòng đầu' },
      { time: 65.25, text: 'Dòng nhạc ba chữ số' },
    ]);

    await expect(catalogService.getSongLyrics('nonexistent-song')).rejects.toThrow(
      NotFoundException,
    );
    await expect(catalogService.getSongLyrics('../song-1')).rejects.toThrow(NotFoundException);
  });

  it('toggles likes per user and throws NotFoundException for unknown song', async () => {
    const toggled = await songsController.toggleLike('song-2');
    expect(toggled.success).toBe(true);
    expect(toggled.data).toEqual({ songId: 'song-2', liked: true });

    const song2After = await catalogService.getSongById('song-2', DEMO_USER_ID);
    expect(song2After.liked).toBe(true);

    await expect(catalogService.toggleLike('unknown-song')).rejects.toThrow(NotFoundException);
  });

  it('lists, creates, validates, and updates playlists', async () => {
    const listRes = await playlistsController.getPlaylists();
    expect(listRes.success).toBe(true);
    expect(listRes.data).toHaveLength(4);

    const createdRes = await playlistsController.createPlaylist({
      title: 'Nhạc Code Đêm Khuya',
      mood: 'focus',
      songIds: ['song-5', 'song-1', 'song-5'],
    });
    expect(createdRes.success).toBe(true);
    expect(createdRes.data.title).toBe('Nhạc Code Đêm Khuya');
    expect(createdRes.data.songIds).toEqual(['song-5', 'song-1']);
    expect(createdRes.data.songsCount).toBe(2);

    const updatedRes = await playlistsController.updatePlaylistSongs(createdRes.data.id, {
      songIds: ['song-3'],
    });
    expect(updatedRes.data.songIds).toEqual(['song-3']);
    expect(updatedRes.data.songsCount).toBe(1);

    await expect(catalogService.createPlaylist({ title: '   ' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(catalogService.createPlaylist({ title: 'A'.repeat(81) })).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      catalogService.createPlaylist({ title: 'Bad Song', songIds: ['unknown-song'] }),
    ).rejects.toThrow(BadRequestException);
    await expect(catalogService.updatePlaylistSongs('missing-pl', ['song-1'])).rejects.toThrow(
      NotFoundException,
    );
  });

  it('supports optional page & limit pagination on GET /v1/songs and rejects invalid bounds', async () => {
    const unpaginated = await songsController.getSongs();
    expect(unpaginated.meta).toBeUndefined();
    expect(unpaginated.data).toHaveLength(5);

    const page1 = await songsController.getSongs(undefined, undefined, undefined, undefined, '1', '2');
    expect(page1.success).toBe(true);
    expect(page1.data).toHaveLength(2);
    expect(page1.meta).toEqual({
      page: 1,
      limit: 2,
      totalItems: 5,
      totalPages: 3,
    });

    const page3 = await songsController.getSongs(undefined, undefined, undefined, undefined, '3', '2');
    expect(page3.data).toHaveLength(1);

    await expect(
      songsController.getSongs(undefined, undefined, undefined, undefined, '0', '2'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      songsController.getSongs(undefined, undefined, undefined, undefined, '1', '101'),
    ).rejects.toThrow(BadRequestException);
  });

  it('resolves Tier-2 LRCLIB plain lyrics for cached DB songs and supports youtube-search / resolve-embeddable endpoints', async () => {
    const song1Lyrics = await songsController.getLyrics('song-1');
    expect(song1Lyrics.data.isSynced).toBe(true);
    expect(song1Lyrics.data.plainLyrics).toBeNull();

    await database.upsertSong({
      id: 'yt-demo1234567',
      title: 'Nàng Thơ',
      artist: 'Hoàng Dũng',
      album: 'YouTube Music',
      duration: 254,
      audioUrl: 'https://www.youtube.com/watch?v=demo1234567',
      coverUrl: 'https://i.ytimg.com/vi/demo1234567/hqdefault.jpg',
      mood: 'acoustic',
      moodLabel: 'Mộc mạc & Thư thái',
      bpm: 80,
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            trackName: 'Nàng Thơ',
            artistName: 'Hoàng Dũng',
            syncedLyrics: null,
            plainLyrics: 'Em, ngày em đánh rơi nụ cười vào anh\nCó nghĩ sau này sẽ chờ',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as typeof fetch;

    const ytLyrics = await songsController.getLyrics('yt-demo1234567');
    expect(ytLyrics.success).toBe(true);
    expect(ytLyrics.data.isSynced).toBe(false);
    expect(ytLyrics.data.rawLrc).toBe('');
    expect(ytLyrics.data.lines).toEqual([
      { time: 0, text: 'Em, ngày em đánh rơi nụ cười vào anh' },
      { time: 0, text: 'Có nghĩ sau này sẽ chờ' },
    ]);

    const ytSearchRes = await songsController.searchYouTube('Nàng Thơ');
    expect(ytSearchRes.success).toBe(true);
    expect(ytSearchRes.data.some((s) => s.id === 'yt-demo1234567')).toBe(true);

    await expect(
      songsController.resolveEmbeddable('missing-song'),
    ).rejects.toThrow(NotFoundException);
  });

  it('triggers YouTube live search & merges results on GET /v1/songs?q=... in non-test mode when local matches < 5', async () => {
    const devModuleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule, CatalogModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(
        AppConfigService.fromRawEnv({
          DB_MODE: 'memory',
          NODE_ENV: 'development',
          YOUTUBE_API_KEY: 'mock-yt-key-catalog',
        }),
      )
      .compile();

    const devDb = devModuleRef.get(DatabaseService);
    await devDb.onModuleInit();
    const devSongsController = devModuleRef.get(SongsController);

    globalThis.fetch = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes('/youtube/v3/search')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: { videoId: 'liveYt12345' },
                snippet: {
                  title: 'Hãy Trao Cho Anh [Official MV]',
                  channelTitle: 'Sơn Tùng M-TP Official',
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/youtube/v3/videos')) {
        return new Response(
          JSON.stringify({
            items: [{ id: 'liveYt12345', contentDetails: { duration: 'PT4M5S' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ resultCount: 0, results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const searchRes = await devSongsController.getSongs(undefined, 'Hãy Trao Cho Anh');
    expect(searchRes.success).toBe(true);
    expect(searchRes.data.some((s) => s.id === 'yt-liveYt12345')).toBe(true);
    const liveSong = searchRes.data.find((s) => s.id === 'yt-liveYt12345');
    expect(liveSong?.youtubeVideoId).toBe('liveYt12345');
    expect(liveSong?.duration).toBe(245);

    await devModuleRef.close();
  });
});
