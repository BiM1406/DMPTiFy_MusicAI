import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MoodType } from '../../common/types/domain.types.js';
import { AppConfigService } from '../../config/env.config.js';
import type { MoodAnalysisResult } from './mood-fallback.engine.js';

const ALLOWED_MOODS: ReadonlySet<MoodType> = new Set([
  'chill',
  'sad',
  'energetic',
  'focus',
  'acoustic',
]);

const DEFAULT_BPM_BY_MOOD: Record<MoodType, number> = {
  sad: 68,
  energetic: 115,
  focus: 72,
  acoustic: 82,
  chill: 78,
};

interface GeminiPart {
  text?: string;
  functionCall?: {
    name?: string;
    args?: Record<string, unknown>;
  };
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
}

@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);

  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  async analyzeMood(message: string): Promise<MoodAnalysisResult | null> {
    const apiKey = this.config.geminiApiKey?.trim() ?? '';
    if (!apiKey) {
      return null;
    }

    const rawModel = this.config.geminiModel?.trim() || 'gemini-3.8';
    const model = rawModel.startsWith('gemini') ? rawModel : `gemini-${rawModel}`;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const requestBody = {
      systemInstruction: {
        parts: [
          {
            text: 'Bạn là Trợ lý Cảm xúc Âm nhạc AI của DMPTiFy. Hãy phản hồi bằng tiếng Việt đồng cảm, tinh tế và luôn gọi hàm recommend_music_by_mood với đúng 1 mood trong danh sách cho phép.',
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ],
      tools: [
        {
          functionDeclarations: [
            {
              name: 'recommend_music_by_mood',
              description:
                'Recommend music mood, target BPM, mood label, empathetic Vietnamese reply, and playlist title based on user sentiment.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  mood: {
                    type: 'STRING',
                    enum: ['chill', 'sad', 'energetic', 'focus', 'acoustic'],
                  },
                  targetBpm: {
                    type: 'INTEGER',
                  },
                  moodLabel: {
                    type: 'STRING',
                  },
                  empathyReply: {
                    type: 'STRING',
                  },
                  playlistTitle: {
                    type: 'STRING',
                  },
                },
                required: ['mood', 'targetBpm', 'moodLabel', 'empathyReply', 'playlistTitle'],
              },
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: 'ANY',
          allowedFunctionNames: ['recommend_music_by_mood'],
        },
      },
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        this.logger.warn(`Gemini API returned HTTP ${response.status}; falling back to local engine.`);
        return null;
      }

      const payload = (await response.json()) as GeminiGenerateContentResponse;
      const parts = payload.candidates?.[0]?.content?.parts ?? [];
      const callPart = parts.find(
        (part) => part.functionCall?.name === 'recommend_music_by_mood' && part.functionCall.args,
      );

      if (!callPart?.functionCall?.args) {
        this.logger.warn('Gemini response missing recommend_music_by_mood function call; falling back.');
        return null;
      }

      return this.normalizeFunctionArgs(callPart.functionCall.args);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Gemini API error (${reason}); falling back to local engine.`);
      return null;
    }
  }

  private normalizeFunctionArgs(args: Record<string, unknown>): MoodAnalysisResult | null {
    const rawMood = typeof args.mood === 'string' ? args.mood.trim().toLowerCase() : '';
    const mood: MoodType = ALLOWED_MOODS.has(rawMood as MoodType)
      ? (rawMood as MoodType)
      : 'chill';

    const parsedBpm = Number(args.targetBpm);
    const targetBpm =
      Number.isFinite(parsedBpm) && parsedBpm >= 40 && parsedBpm <= 220
        ? Math.round(parsedBpm)
        : DEFAULT_BPM_BY_MOOD[mood];

    const moodLabel =
      typeof args.moodLabel === 'string' && args.moodLabel.trim()
        ? args.moodLabel.trim()
        : `Tâm trạng ${mood}`;
    const empathyReply =
      typeof args.empathyReply === 'string' && args.empathyReply.trim()
        ? args.empathyReply.trim()
        : 'Em đã lắng nghe tâm trạng của anh và chọn những giai điệu phù hợp nhất dưới đây:';
    const playlistTitle =
      typeof args.playlistTitle === 'string' && args.playlistTitle.trim()
        ? args.playlistTitle.trim()
        : `DMPTiFy AI - ${moodLabel}`;

    return {
      mood,
      targetBpm,
      moodLabel,
      empathyReply,
      playlistTitle,
    };
  }
}
