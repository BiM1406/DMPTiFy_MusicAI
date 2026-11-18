import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ok } from '../../common/api-response.js';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators.js';
import type { AuthenticatedUser } from '../../common/types/domain.types.js';
import { CatalogService, type CatalogView } from './catalog.service.js';

@Controller('v1/songs')
export class SongsController {
  constructor(
    @Inject(CatalogService) private readonly catalogService: CatalogService,
  ) {}

  @Public()
  @Get()
  async getSongs(
    @Query('mood') mood?: string,
    @Query('q') q?: string,
    @Query('view') view?: CatalogView,
    @CurrentUser() user?: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const songs = await this.catalogService.getSongs({ mood, q, view }, user?.id);
    const paginated = this.catalogService.paginateSongs(songs, page, limit);
    return paginated.meta
      ? ok(paginated.items, { ...paginated.meta })
      : ok(paginated.items);
  }

  @Public()
  @Get('charts')
  async getCharts(@CurrentUser() user?: AuthenticatedUser) {
    const songs = await this.catalogService.getCharts(user?.id);
    return ok(songs);
  }

  @Public()
  @Get('youtube-search')
  async searchYouTube(
    @Query('q') q?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const songs = await this.catalogService.searchYouTube(q ?? '', user?.id);
    return ok(songs);
  }

  @Public()
  @Get(':id/lyrics')
  async getLyrics(@Param('id') id: string) {
    const lyrics = await this.catalogService.getSongLyrics(id);
    return ok(lyrics);
  }

  @Public()
  @Get(':id')
  async getSongById(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    const song = await this.catalogService.getSongById(id, user?.id);
    return ok(song);
  }

  @Public()
  @Post(':id/play')
  @HttpCode(HttpStatus.OK)
  async recordPlay(@Param('id') id: string) {
    const song = await this.catalogService.recordPlay(id);
    return ok(song);
  }

  @Public()
  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async toggleLike(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    const result = await this.catalogService.toggleLike(id, user?.id);
    return ok(result);
  }

  @Public()
  @Post(':id/resolve-embeddable')
  @HttpCode(HttpStatus.OK)
  async resolveEmbeddable(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const song = await this.catalogService.resolveEmbeddable(id, user?.id);
    return ok(song);
  }
}
