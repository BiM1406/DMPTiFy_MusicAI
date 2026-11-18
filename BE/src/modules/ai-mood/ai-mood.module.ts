import { Module } from '@nestjs/common';
import { YouTubeModule } from '../youtube/youtube.module.js';
import { AiMoodController } from './ai-mood.controller.js';
import { AiMoodService } from './ai-mood.service.js';
import { GeminiClient } from './gemini.client.js';
import { MoodFallbackEngine } from './mood-fallback.engine.js';

@Module({
  imports: [YouTubeModule],
  controllers: [AiMoodController],
  providers: [MoodFallbackEngine, GeminiClient, AiMoodService],
  exports: [AiMoodService],
})
export class AiMoodModule {}
