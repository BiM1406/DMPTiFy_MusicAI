import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractYoutubeVideoId,
  isYoutubeUrl,
} from '../../common/utils/youtube-url.util.js';
import { AppConfigModule, AppConfigService } from '../../config/env.config.js';
import { DatabaseModule } from '../../database/database.module.js';
import { DatabaseService } from '../../database/database.service.js';
import {
  ItunesCoverService,
  toSquare600ArtworkUrl,
} from './itunes-cover.service.js';
import { LrclibLyricsService } from './lrclib-lyrics.service.js';
import {
  cleanYouTubeTitle,
  isCompilationOrJunkVideo,
  parseIso8601Duration,
  scoreAudioCandidate,
  YouTubeMusicService,
} from './youtube-music.service.js';
import { YouTubeModule } from './youtube.module.js';

describe('YouTubeModule & Media Resolvers', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('extracts 11-char YouTube video IDs across watch, shortlink, and embed URLs', () => {
    expect(
      extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ');
    expect(
      extractYoutubeVideoId('https://youtu.be/abc123DEF_9?si=sharetoken'),
    ).toBe('abc123DEF_9');
    expect(
      extractYoutubeVideoId('https://www.youtube.com/embed/xyz-987_654?autoplay=1'),
    ).toBe('xyz-987_654');
    expect(extractYoutubeVideoId('/audio/song-1.wav')).toBeUndefined();
    expect(extractYoutubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeUndefined();
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=short')).toBeUndefined();
    expect(isYoutubeUrl('https://youtu.be/abc123DEF_9')).toBe(true);
    expect(isYoutubeUrl('/audio/song-1.wav')).toBe(false);
  });

  it('parses ISO-8601 durations and cleans MV/Lyrics/Topic/VEVO noise', () => {
    expect(parseIso8601Duration('PT3M45S')).toBe(225);
    expect(parseIso8601Duration('PT1H2M5S')).toBe(3725);
    expect(parseIso8601Duration('PT45S')).toBe(45);
    expect(parseIso8601Duration('INVALID')).toBe(210);

    expect(
      cleanYouTubeTitle(
        'Bước Qua Nhau [Official MV] (Lyrics) 4K',
        'Vũ. - Topic',
      ),
    ).toEqual({
      title: 'Bước Qua Nhau',
      artist: 'Vũ.',
    });

    expect(
      cleanYouTubeTitle(
        'Hoàng Dũng - Nàng Thơ (Official Music Video)',
        'HoangDungVEVO',
      ),
    ).toEqual({
      title: 'Nàng Thơ',
      artist: 'Hoàng Dũng',
    });

    expect(
      toSquare600ArtworkUrl(
        'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/12/34/56/100x100bb.jpg',
      ),
    ).toBe(
      'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/12/34/56/600x600bb.jpg',
    );
  });

  it('resolves iTunes 600x600 square covers with 30m memory cache and safe fallback', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          resultCount: 1,
          results: [
            {
              trackName: 'Nàng Thơ',
              artistName: 'Hoàng Dũng',
              artworkUrl100:
                'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/aa/bb/100x100bb.jpg',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const service = new ItunesCoverService();
    const first = await service.findSquareCover('Nàng Thơ', 'Hoàng Dũng');
    const second = await service.findSquareCover('Nàng Thơ', 'Hoàng Dũng');

    expect(first).toBe(
      'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/aa/bb/600x600bb.jpg',
    );
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockRejectedValueOnce(new Error('Network timeout'));
    const failed = await service.findSquareCover('Unknown Song', 'Nobody');
    expect(failed).toBeNull();
  });

  it('resolves Tier-1 synced LRC and Tier-2 plain lyrics via LRCLIB and lyrics.ovh fallback', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              trackName: 'Nàng Thơ',
              artistName: 'Hoàng Dũng',
              syncedLyrics: '[00:01.00]Em, ngày em đánh rơi nụ cười vào anh\n[00:08.50]Có nghĩ sau này sẽ chờ',
              plainLyrics: 'Em, ngày em đánh rơi nụ cười vào anh',
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              trackName: 'Bước Qua Nhau',
              artistName: 'Vũ.',
              syncedLyrics: null,
              plainLyrics: 'Cuộc đời chia hai ngã\n\nVà ta bước qua nhau',
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ lyrics: 'Dòng thơ từ lyrics ovh\nGiai điệu dịu êm' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    globalThis.fetch = fetchMock as typeof fetch;

    const lyricsService = new LrclibLyricsService();

    const tier1 = await lyricsService.findLyrics('Nàng Thơ', 'Hoàng Dũng');
    expect(tier1).toEqual({
      isSynced: true,
      rawLrc:
        '[00:01.00]Em, ngày em đánh rơi nụ cười vào anh\n[00:08.50]Có nghĩ sau này sẽ chờ',
      plainLyrics: 'Em, ngày em đánh rơi nụ cười vào anh',
      lines: [
        { time: 1, text: 'Em, ngày em đánh rơi nụ cười vào anh' },
        { time: 8.5, text: 'Có nghĩ sau này sẽ chờ' },
      ],
    });
    const [firstUrl, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(firstUrl).toContain('https://lrclib.net/api/search?track_name=');
    expect((firstInit.headers as Record<string, string>)['User-Agent']).toContain('DMPTiFy/1.0');

    const cachedTier1 = await lyricsService.findLyrics('Nàng Thơ', 'Hoàng Dũng');
    expect(cachedTier1).toEqual(tier1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const tier2Lrclib = await lyricsService.findLyrics('Bước Qua Nhau', 'Vũ.');
    expect(tier2Lrclib).toEqual({
      isSynced: false,
      rawLrc: '',
      plainLyrics: 'Cuộc đời chia hai ngã\n\nVà ta bước qua nhau',
      lines: [
        { time: 0, text: 'Cuộc đời chia hai ngã' },
        { time: 0, text: 'Và ta bước qua nhau' },
      ],
    });

    const tier2Ovh = await lyricsService.findLyrics('Chưa Từng Nghe', 'Ca Sĩ Mới');
    expect(tier2Ovh?.isSynced).toBe(false);
    expect(tier2Ovh?.rawLrc).toBe('');
    expect(tier2Ovh?.lines).toEqual([
      { time: 0, text: 'Dòng thơ từ lyrics ovh' },
      { time: 0, text: 'Giai điệu dịu êm' },
    ]);
  });

  it('searches YouTube Music, caches tracks with square covers, resolves alternative embeddable videos, and hydrates safely', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes('/youtube/v3/search') && url.includes('Official%20Audio')) {
        return new Response(
          JSON.stringify({
            items: [
              { id: { videoId: 'v1234567890' }, snippet: { title: 'Blocked Video' } },
              { id: { videoId: 'altEmbed123' }, snippet: { title: 'Official Audio' } },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/youtube/v3/search')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: { videoId: 'v1234567890' },
                snippet: {
                  title: 'Có Chắc Yêu Là Đây [Official MV] 4K',
                  channelTitle: 'Sơn Tùng M-TP Official',
                },
              },
              {
                id: { videoId: 'v0987654321' },
                snippet: {
                  title: 'See Tình (Lyrics)',
                  channelTitle: 'Hoàng Thùy Linh - Topic',
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
            items: [
              { id: 'v1234567890', contentDetails: { duration: 'PT3M32S' } },
              { id: 'v0987654321', contentDetails: { duration: 'PT3M5S' } },
              { id: 'altEmbed123', contentDetails: { duration: 'PT3M35S' } },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('itunes.apple.com/search')) {
        if (url.includes('See')) {
          return new Response(JSON.stringify({ resultCount: 0, results: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({
            resultCount: 1,
            results: [
              {
                trackName: 'Có Chắc Yêu Là Đây',
                artistName: 'Sơn Tùng M-TP',
                artworkUrl100:
                  'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/aa/100x100bb.jpg',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('Not Found', { status: 404 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule, YouTubeModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(
        AppConfigService.fromRawEnv({
          DB_MODE: 'memory',
          NODE_ENV: 'development',
          YOUTUBE_API_KEY: 'mock-yt-key-for-unit-test',
        }),
      )
      .compile();

    const db = moduleRef.get(DatabaseService);
    await db.onModuleInit();
    const ytService = moduleRef.get(YouTubeMusicService);

    const results = await ytService.searchAndCacheTracks('Sơn Tùng See Tình');
    expect(results).toHaveLength(2);

    expect(results[0]).toMatchObject({
      id: 'yt-v1234567890',
      title: 'Có Chắc Yêu Là Đây',
      artist: 'Sơn Tùng M-TP',
      duration: 212,
      audioUrl: 'https://www.youtube.com/watch?v=v1234567890',
      youtubeVideoId: 'v1234567890',
      coverUrl:
        'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/aa/600x600bb.jpg',
    });

    expect(results[1]).toMatchObject({
      id: 'yt-v0987654321',
      title: 'See Tình',
      artist: 'Hoàng Thùy Linh',
      duration: 185,
      mood: 'energetic',
      youtubeVideoId: 'v0987654321',
      coverUrl: 'https://i.ytimg.com/vi/v0987654321/mqdefault.jpg',
    });

    const callCountAfterFirstSearch = fetchMock.mock.calls.length;
    const cachedResults = await ytService.searchAndCacheTracks('Sơn Tùng See Tình');
    expect(cachedResults).toHaveLength(2);
    expect(fetchMock.mock.calls.length).toBe(callCountAfterFirstSearch);

    const resolvedAlt = await ytService.resolveAlternativeEmbeddable(results[0]);
    expect(resolvedAlt.youtubeVideoId).toBe('altEmbed123');
    expect(resolvedAlt.audioUrl).toBe('https://www.youtube.com/watch?v=altEmbed123');
    expect(resolvedAlt.duration).toBe(215);
    expect(resolvedAlt.coverUrl).toBe(
      'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/aa/600x600bb.jpg',
    );

    const persisted = await db.findSongById('yt-v1234567890');
    expect(persisted?.youtubeVideoId).toBe('altEmbed123');

    fetchMock.mockRejectedValue(new Error('Simulated network outage'));
    await expect(ytService.hydrateShowcaseSongs()).resolves.toBeUndefined();

    await moduleRef.close();
  });

  it('falls back to iTunes Search API when YouTube Data API returns HTTP 429 or quota is exhausted', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes('/youtube/v3/search')) {
        return new Response(
          JSON.stringify({
            error: {
              code: 429,
              message: 'Quota exceeded for quota metric and limit',
            },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('itunes.apple.com/search')) {
        return new Response(
          JSON.stringify({
            resultCount: 1,
            results: [
              {
                trackId: 1750242852,
                trackName: 'Đừng Làm Trái Tim Anh Đau',
                artistName: 'Sơn Tùng M-TP',
                collectionName: 'Đừng Làm Trái Tim Anh Đau - Single',
                artworkUrl100:
                  'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e3/0b/38/100x100bb.jpg',
                trackTimeMillis: 279000,
                previewUrl: 'https://audio-ssl.itunes.apple.com/preview.m4a',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('youtube.com/results?search_query=')) {
        return new Response(
          '<html><script>var ytInitialData = {"videoId":"abPmZCZZrFA"};</script></html>',
          { status: 200, headers: { 'Content-Type': 'text/html' } },
        );
      }
      return new Response('Not Found', { status: 404 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule, YouTubeModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(
        AppConfigService.fromRawEnv({
          DB_MODE: 'memory',
          NODE_ENV: 'development',
          YOUTUBE_API_KEY: 'mock-exhausted-key',
        }),
      )
      .compile();

    const db = moduleRef.get(DatabaseService);
    await db.onModuleInit();
    const ytService = moduleRef.get(YouTubeMusicService);

    const results = await ytService.searchAndCacheTracks(
      'Đừng Làm Trái Tim Anh Đau',
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: 'Đừng Làm Trái Tim Anh Đau',
      artist: 'Sơn Tùng M-TP',
      album: 'Đừng Làm Trái Tim Anh Đau - Single',
      duration: 279,
      coverUrl:
        'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e3/0b/38/600x600bb.jpg',
      audioUrl: 'https://www.youtube.com/watch?v=abPmZCZZrFA',
      youtubeVideoId: 'abPmZCZZrFA',
    });

    const persisted = await db.findSongById('yt-abPmZCZZrFA');
    expect(persisted).not.toBeNull();
    expect(persisted?.title).toBe('Đừng Làm Trái Tim Anh Đau');

    await moduleRef.close();
  });

  it('splits pipe-delimited YouTube titles cleanly and normalizes ALL-CAPS titles', () => {
    expect(
      cleanYouTubeTitle(
        'SƠN TÙNG M-TP | ĐỪNG LÀM TRÁI TIM ANH ĐAU | OFFICIAL MUSIC VIDEO',
        'Sơn Tùng M-TP Official',
      ),
    ).toEqual({
      title: 'Đừng Làm Trái Tim Anh Đau',
      artist: 'Sơn Tùng M-TP',
    });

    expect(
      cleanYouTubeTitle(
        "SON TUNG M-TP x TYGA | COME MY WAY (SOFTER VERSION)",
        'Sơn Tùng M-TP Official',
      ),
    ).toEqual({
      title: 'Come My Way (Softer Version)',
      artist: 'Son Tung M-TP x TYGA',
    });

    expect(
      cleanYouTubeTitle(
        "THERE'S NO ONE AT ALL",
        'Sơn Tùng M-TP Official',
      ),
    ).toEqual({
      title: "There's No One At All",
      artist: 'Sơn Tùng M-TP',
    });

    expect(
      cleanYouTubeTitle(
        'HÃY TRAO CHO ANH ft. Snoop Dogg',
        'Sơn Tùng M-TP Official',
      ),
    ).toEqual({
      title: 'Hãy Trao Cho Anh ft. Snoop Dogg',
      artist: 'Sơn Tùng M-TP',
    });
  });

  it('rejects mismatched-artist iTunes covers instead of falling back to unrelated results', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          resultCount: 2,
          results: [
            {
              trackName: 'Come My Way',
              artistName: 'Justin Bieber',
              artworkUrl100:
                'https://is1-ssl.mzstatic.com/image/thumb/Music1/v4/wrong/100x100bb.jpg',
              trackTimeMillis: 240000,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const service = new ItunesCoverService();
    const mismatched = await service.findSquareCover(
      'Come My Way',
      'SON TUNG M-TP x TYGA',
    );
    expect(mismatched).toBeNull();
  });

  it('filters compilation/tutorial junk videos and scores Topic/Official Audio tracks higher than cinematic MVs or Live clips', () => {
    expect(
      isCompilationOrJunkVideo(
        'Sơn Tùng M-TP - Những Bản Hit Triệu View | Nhạc Hay',
        220,
      ),
    ).toBe(true);
    expect(isCompilationOrJunkVideo('Nàng Thơ', 3700)).toBe(true);
    expect(isCompilationOrJunkVideo('Nàng Thơ - Tự học piano', 240)).toBe(true);
    expect(isCompilationOrJunkVideo('Đừng Làm Trái Tim Anh Đau', 278)).toBe(
      false,
    );

    const topicScore = scoreAudioCandidate(
      'Bước Qua Nhau',
      'Vũ. - Topic',
      258,
      258,
      'Bước Qua Nhau',
    );
    const mvWithLongIntroScore = scoreAudioCandidate(
      'Bước Qua Nhau (Official Music Video)',
      'Vũ. Official',
      337,
      258,
      'Bước Qua Nhau',
    );
    const liveSnippetScore = scoreAudioCandidate(
      'Vũ. - Bước Qua Nhau (Live at Concert Tour)',
      'Vũ Official',
      155,
      258,
      'Bước Qua Nhau',
    );

    expect(topicScore).toBeGreaterThan(mvWithLongIntroScore);
    expect(mvWithLongIntroScore).toBeGreaterThan(liveSnippetScore);
  });

  it('selects LRCLIB synced lyrics closest to playing song duration', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 1,
            trackName: 'Bước Qua Nhau',
            artistName: 'Vũ.',
            duration: 337,
            syncedLyrics: '[01:05.00]MV intro late vocal',
            plainLyrics: 'MV intro late vocal',
          },
          {
            id: 2,
            trackName: 'Bước Qua Nhau',
            artistName: 'Vũ.',
            duration: 258,
            syncedLyrics: '[00:16.00]Cuộc đời chia hai ngã',
            plainLyrics: 'Cuộc đời chia hai ngã',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const lyricsService = new LrclibLyricsService();
    const matchedStudio = await lyricsService.findLyrics(
      'Bước Qua Nhau',
      'Vũ.',
      258,
    );
    expect(matchedStudio?.isSynced).toBe(true);
    expect(matchedStudio?.lines).toEqual([
      { time: 16, text: 'Cuộc đời chia hai ngã' },
    ]);
  });
});
