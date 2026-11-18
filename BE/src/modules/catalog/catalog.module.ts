import { Module } from '@nestjs/common';
import { YouTubeModule } from '../youtube/youtube.module.js';
import { CatalogService } from './catalog.service.js';
import { PlaylistsController } from './playlists.controller.js';
import { SongsController } from './songs.controller.js';

@Module({
  imports: [YouTubeModule],
  controllers: [SongsController, PlaylistsController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
