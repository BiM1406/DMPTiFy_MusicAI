import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_USER_ID,
  type AiChatLogRecord,
  type PlaylistDto,
  type SongDto,
} from '../../common/types/domain.types.js';
import { AppConfigModule, AppConfigService } from '../../config/env.config.js';
import { DatabaseModule } from '../../database/database.module.js';
import { DatabaseService } from '../../database/database.service.js';
import { AiMoodController } from './ai-mood.controller.js';
import { AiMoodModule } from './ai-mood.module.js';
import { AiMoodService } from './ai-mood.service.js';
import { GeminiClient } from './gemini.client.js';
import { MoodFallbackEngine } from './mood-fallback.engine.js';

const MOCK_CATALOG: SongDto[] = [
  {
    id: 'song-1',
    title: 'Chuyện Đôi Ta',
    artist: 'Emcee L ft. Muộii',
    album: 'Acoustic Healing',
    duration: 30,
    audioUrl: '/audio/song-1.wav',
    coverUrl: '/covers/cover-1.svg',
    lyricsUrl: '/lyrics/song-1.lrc',
    mood: 'chill',
    moodLabel: 'Thư giãn & Chill',
    bpm: 78,
    liked: true,
    playCount: 120,
    isVipOnly: false,
  },
  {
    id: 'song-2',
    title: 'Mưa Tháng Sáu',
    artist: 'Văn Mai Hương x GREY D',
    album: 'Chiều Mưa Tâm Trạng',
    duration: 30,
    audioUrl: '/audio/song-2.wav',
    coverUrl: '/covers/cover-2.svg',
    lyricsUrl: '/lyrics/song-2.lrc',
    mood: 'sad',
    moodLabel: 'U buồn & Hoài niệm',
    bpm: 68,
    liked: false,
    playCount: 95,
    isVipOnly: false,
  },
  {
    id: 'song-3',
    title: 'Ánh Sao Và Bầu Trời',
    artist: 'T.R.I x Cá',
    album: 'Đêm Muộn Bình Yên',
    duration: 30,
    audioUrl: '/audio/song-3.wav',
    coverUrl: '/covers/cover-3.svg',
    lyricsUrl: '/lyrics/song-3.lrc',
    mood: 'acoustic',
    moodLabel: 'Mộc mạc & Thư thái',
    bpm: 85,
    liked: true,
    playCount: 80,
    isVipOnly: false,
  },
  {
    id: 'song-4',
    title: 'Đi Giữa Trời Rực Rỡ',
    artist: 'Ngô Lan Hương',
    album: 'Bừng Sáng Năng Lượng',
    duration: 30,
    audioUrl: '/audio/song-4.wav',
    coverUrl: '/covers/cover-4.svg',
    lyricsUrl: '/lyrics/song-4.lrc',
    mood: 'energetic',
    moodLabel: 'Năng động & Phấn khởi',
    bpm: 115,
    liked: false,
    playCount: 110,
    isVipOnly: false,
  },
  {
    id: 'song-5',
    title: 'Lofi Beats For Coding',
    artist: 'DMPTiFy Ambient',
    album: 'Deep Focus & Study',
    duration: 30,
    audioUrl: '/audio/song-5.wav',
    coverUrl: '/covers/cover-5.svg',
    lyricsUrl: '/lyrics/song-5.lrc',
    mood: 'focus',
    moodLabel: 'Tập trung cao độ',
    bpm: 72,
    liked: true,
    playCount: 150,
    isVipOnly: false,
  },
];

describe('AiMoodService', () => {
  const originalFetch = globalThis.fetch;

  const createTestingModule = async (geminiApiKey = '') => {
    const chatLogs: AiChatLogRecord[] = [];
    const createdPlaylists: PlaylistDto[] = [];

    const mockDatabase = {
      listSongs: vi.fn().mockResolvedValue(MOCK_CATALOG),
      createPlaylist: vi.fn().mockImplementation(async (input) => {
        const pl: PlaylistDto = {
          id: `pl-ai-${createdPlaylists.length + 1}`,
          userId: input.userId ?? DEMO_USER_ID,
          title: input.title,
          description: input.description ?? '',
          coverUrl: input.coverUrl ?? '/covers/cover-1.svg',
          songIds: input.songIds ?? [],
          songsCount: (input.songIds ?? []).length,
          mood: input.mood,
          isAiGenerated: true,
          isPublic: false,
        };
        createdPlaylists.push(pl);
        return pl;
      }),
      createAiChatLog: vi.fn().mockImplementation(async (input) => {
        const record: AiChatLogRecord = {
          id: `log-${chatLogs.length + 1}`,
          userId: input.userId ?? DEMO_USER_ID,
          userMessage: input.userMessage,
          aiReply: input.aiReply,
          detectedMood: input.detectedMood,
          targetBpm: input.targetBpm,
          generatedPlaylistId: input.generatedPlaylistId ?? null,
          createdAt: new Date(),
        };
        chatLogs.push(record);
        return record;
      }),
      listAiChatLogs: vi.fn().mockImplementation(async () => [...chatLogs]),
    };

    const mockConfig = {
      geminiApiKey,
      geminiModel: 'gemini-2.5-flash',
    } as AppConfigService;

    const moduleRef = await Test.createTestingModule({
      controllers: [AiMoodController],
      providers: [
        MoodFallbackEngine,
        GeminiClient,
        AiMoodService,
        { provide: DatabaseService, useValue: mockDatabase },
        { provide: AppConfigService, useValue: mockConfig },
      ],
    }).compile();

    return {
      service: moduleRef.get(AiMoodService),
      controller: moduleRef.get(AiMoodController),
      mockDatabase,
    };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('rejects empty or over-limit messages with BadRequestException', async () => {
    const { service } = await createTestingModule();

    await expect(service.chat({ message: '' })).rejects.toThrow(BadRequestException);
    await expect(service.chat({ message: '   ' })).rejects.toThrow(BadRequestException);
    await expect(service.chat({ message: 'a'.repeat(2001) })).rejects.toThrow(BadRequestException);
  });

  it('analyzes Vietnamese moods via MoodFallbackEngine, ranks songs, creates AI playlist, and logs chat', async () => {
    const { service, controller, mockDatabase } = await createTestingModule('');

    const sadRes = await service.chat({
      message: 'Hôm nay mưa buồn, áp lực thi cử mệt mỏi quá...',
      createPlaylist: true,
    });
    expect(sadRes.provider).toBe('fallback-engine');
    expect(sadRes.moodCode).toBe('sad');
    expect(sadRes.targetBpm).toBe(68);
    expect(sadRes.recommendedSongs).toHaveLength(3);
    expect(sadRes.recommendedSongs[0].id).toBe('song-2');
    expect(sadRes.recommendedSongs[1].id).toBe('song-5');
    expect(sadRes.generatedPlaylist).not.toBeNull();
    expect(sadRes.generatedPlaylist?.isAiGenerated).toBe(true);
    expect(mockDatabase.createAiChatLog).toHaveBeenCalledTimes(1);

    const energeticRes = await service.chat({
      message: 'Vừa hoàn thành đồ án, cần nhạc ăn mừng!',
    });
    expect(energeticRes.moodCode).toBe('energetic');
    expect(energeticRes.targetBpm).toBe(115);
    expect(energeticRes.recommendedSongs[0].id).toBe('song-4');
    expect(energeticRes.generatedPlaylist).toBeNull();

    const focusRes = await service.chat({
      message: 'Đang cần tập trung cao độ để code Next.js',
    });
    expect(focusRes.moodCode).toBe('focus');
    expect(focusRes.targetBpm).toBe(72);
    expect(focusRes.recommendedSongs[0].id).toBe('song-5');

    const acousticRes = await service.chat({
      message: 'Cho anh vài bài Acoustic nhẹ nhàng để ngủ',
    });
    expect(acousticRes.moodCode).toBe('acoustic');
    expect(acousticRes.targetBpm).toBe(82);
    expect(acousticRes.recommendedSongs[0].id).toBe('song-3');

    const chillRes = await controller.chat({ message: 'Nghe gì cho thư thái đầu óc nhỉ' });
    expect(chillRes.success).toBe(true);
    expect(chillRes.data.moodCode).toBe('chill');
    expect(chillRes.data.targetBpm).toBe(78);
    expect(chillRes.data.recommendedSongs[0].id).toBe('song-1');

    const historyRes = await controller.history();
    expect(historyRes.success).toBe(true);
    expect(historyRes.data).toHaveLength(5);
  });

  it('uses Gemini 2.5 Flash function calling when geminiApiKey is set and falls back cleanly on error', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'recommend_music_by_mood',
                      args: {
                        mood: 'focus',
                        targetBpm: 72,
                        moodLabel: 'Tập Trung Sâu (Gemini Alpha)',
                        empathyReply: 'Chúc anh code thật mượt cùng những bản lofi chuẩn nhịp!',
                        playlistTitle: 'Gemini Deep Coding',
                      },
                    },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const { service } = await createTestingModule('gemini_test_key');
    const res = await service.chat({
      message: 'Anh muốn tập trung hoàn thiện backend NestJS',
      createPlaylist: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('gemini-2.5-flash:generateContent?key=gemini_test_key');
    const body = JSON.parse(String(init.body)) as {
      tools: Array<{ functionDeclarations: Array<{ name: string }> }>;
    };
    expect(body.tools[0].functionDeclarations[0].name).toBe('recommend_music_by_mood');

    expect(res.provider).toBe('gemini-2.5-flash');
    expect(res.moodCode).toBe('focus');
    expect(res.targetBpm).toBe(72);
    expect(res.detectedMood).toBe('Tập Trung Sâu (Gemini Alpha)');
    expect(res.recommendedSongs[0].id).toBe('song-5');
    expect(res.generatedPlaylist?.title).toBe('Gemini Deep Coding');

    fetchMock.mockResolvedValueOnce(new Response('Server error', { status: 503 }));
    const fallbackRes = await service.chat({ message: 'Hôm nay trời mưa buồn quá' });
    expect(fallbackRes.provider).toBe('fallback-engine');
    expect(fallbackRes.moodCode).toBe('sad');
    expect(fallbackRes.recommendedSongs[0].id).toBe('song-2');
  });

  it('wires AiMoodModule + DatabaseModule via NestJS DI and persists AI chat & playlist in-memory', async () => {
    const prevDbMode = process.env.DB_MODE;
    process.env.DB_MODE = 'memory';
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule, AiMoodModule],
    }).compile();

    try {
      const db = moduleRef.get(DatabaseService);
      await db.resetForTesting();
      const controller = moduleRef.get(AiMoodController);

      const chatRes = await controller.chat({
        message: 'Đang cần tập trung cao độ để code Next.js',
        createPlaylist: true,
      });
      expect(chatRes.success).toBe(true);
      expect(chatRes.data.moodCode).toBe('focus');
      expect(chatRes.data.recommendedSongs[0].id).toBe('song-5');
      expect(chatRes.data.generatedPlaylist?.isAiGenerated).toBe(true);

      const historyRes = await controller.history();
      expect(historyRes.success).toBe(true);
      expect(historyRes.data.length).toBeGreaterThanOrEqual(1);
    } finally {
      await moduleRef.close();
      if (prevDbMode === undefined) {
        delete process.env.DB_MODE;
      } else {
        process.env.DB_MODE = prevDbMode;
      }
    }
  });
});
