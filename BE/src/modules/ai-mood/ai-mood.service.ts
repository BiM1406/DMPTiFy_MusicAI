import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import {
  DEMO_USER_ID,
  type AiChatLogRecord,
  type MoodType,
  type PlaylistDto,
  type SongDto,
} from '../../common/types/domain.types.js';
import { AppConfigService } from '../../config/env.config.js';
import { DatabaseService } from '../../database/database.service.js';
import { YouTubeMusicService } from '../youtube/youtube-music.service.js';
import { GeminiClient } from './gemini.client.js';
import { MoodFallbackEngine } from './mood-fallback.engine.js';

const VPOP_MOOD_QUERY: Record<MoodType, string> = {
  chill: 'nhạc chill việt nam nhẹ nhàng',
  sad: 'nhạc buồn tâm trạng vpop',
  energetic: 'nhạc trẻ sôi động vpop',
  focus: 'nhạc piano lofi tập trung không lời',
  acoustic: 'nhạc acoustic việt nam mộc mạc',
};

export interface AiChatRequestDto {
  message: string;
  createPlaylist?: boolean;
}

export interface AiChatResponseDto {
  replyText: string;
  detectedMood: string;
  moodCode: MoodType;
  targetBpm: number;
  provider: 'gemini-2.5-flash' | 'fallback-engine';
  recommendedSongs: SongDto[];
  generatedPlaylist: PlaylistDto | null;
}

@Injectable()
export class AiMoodService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(GeminiClient) private readonly geminiClient: GeminiClient,
    @Inject(MoodFallbackEngine) private readonly fallbackEngine: MoodFallbackEngine,
    @Optional() @Inject(AppConfigService) private readonly config?: AppConfigService,
    @Optional() @Inject(YouTubeMusicService) private readonly youTubeMusic?: YouTubeMusicService,
  ) {}

  async chat(
    dto: AiChatRequestDto,
    userId: string = DEMO_USER_ID,
  ): Promise<AiChatResponseDto> {
    if (!dto || typeof dto.message !== 'string') {
      throw new BadRequestException('message is required');
    }

    const trimmedMessage = dto.message.trim();
    if (!trimmedMessage) {
      throw new BadRequestException('message cannot be empty');
    }
    if (dto.message.length > 2000) {
      throw new BadRequestException('message must be at most 2000 characters');
    }

    const geminiResult = await this.geminiClient.analyzeMood(trimmedMessage);
    const provider: 'gemini-2.5-flash' | 'fallback-engine' = geminiResult
      ? 'gemini-2.5-flash'
      : 'fallback-engine';
    const analysis = geminiResult ?? this.fallbackEngine.analyze(trimmedMessage);

    let catalogSongs = await this.database.listSongs({ userId });
    const moodMatches = catalogSongs.filter((song) => song.mood === analysis.mood);
    if (
      this.youTubeMusic &&
      this.config &&
      this.config.nodeEnv !== 'test' &&
      this.config.youtubeApiKey.trim().length > 0 &&
      (moodMatches.length < 3 || !moodMatches.some((song) => Boolean(song.youtubeVideoId)))
    ) {
      try {
        const enriched = await this.youTubeMusic.searchAndCacheTracks(
          VPOP_MOOD_QUERY[analysis.mood],
          { mood: analysis.mood, maxResults: 4, userId },
        );
        if (enriched.length > 0) {
          catalogSongs = await this.database.listSongs({ userId });
        }
      } catch {
        // Keep AI mood chat resilient if YouTube enrichment fails
      }
    }

    const recommendedSongs = this.rankSongs(catalogSongs, analysis.mood, analysis.targetBpm);

    let generatedPlaylist: PlaylistDto | null = null;
    if (dto.createPlaylist === true) {
      generatedPlaylist = await this.database.createPlaylist({
        userId,
        title: analysis.playlistTitle,
        description: `Playlist AI gợi ý theo tâm trạng: ${analysis.moodLabel}`,
        coverUrl: recommendedSongs[0]?.coverUrl ?? '/covers/cover-1.svg',
        mood: analysis.mood,
        isAiGenerated: true,
        isPublic: false,
        songIds: recommendedSongs.map((song) => song.id),
      });
    }

    await this.database.createAiChatLog({
      userId,
      userMessage: trimmedMessage,
      aiReply: analysis.empathyReply,
      detectedMood: analysis.moodLabel,
      targetBpm: analysis.targetBpm,
      generatedPlaylistId: generatedPlaylist?.id ?? null,
    });

    return {
      replyText: analysis.empathyReply,
      detectedMood: analysis.moodLabel,
      moodCode: analysis.mood,
      targetBpm: analysis.targetBpm,
      provider,
      recommendedSongs,
      generatedPlaylist,
    };
  }

  async getHistory(userId: string = DEMO_USER_ID): Promise<AiChatLogRecord[]> {
    return this.database.listAiChatLogs(userId);
  }

  private rankSongs(songs: SongDto[], moodCode: MoodType, targetBpm: number): SongDto[] {
    const ranked = [...songs].sort((a, b) => {
      const aMatch = a.mood === moodCode ? 0 : 1;
      const bMatch = b.mood === moodCode ? 0 : 1;
      if (aMatch !== bMatch) {
        return aMatch - bMatch;
      }

      const aBpmDiff = Math.abs(a.bpm - targetBpm);
      const bBpmDiff = Math.abs(b.bpm - targetBpm);
      if (aBpmDiff !== bBpmDiff) {
        return aBpmDiff - bBpmDiff;
      }

      return b.playCount - a.playCount;
    });

    return ranked.slice(0, Math.min(3, ranked.length));
  }
}
