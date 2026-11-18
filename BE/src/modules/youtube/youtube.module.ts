import { Module } from '@nestjs/common';
import { ItunesCoverService } from './itunes-cover.service.js';
import { LrclibLyricsService } from './lrclib-lyrics.service.js';
import { YouTubeMusicService } from './youtube-music.service.js';

@Module({
  providers: [ItunesCoverService, LrclibLyricsService, YouTubeMusicService],
  exports: [YouTubeMusicService, ItunesCoverService, LrclibLyricsService],
})
export class YouTubeModule {}
