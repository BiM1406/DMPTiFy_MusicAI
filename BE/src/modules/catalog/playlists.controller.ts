import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ok } from '../../common/api-response.js';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators.js';
import type { AuthenticatedUser } from '../../common/types/domain.types.js';
import { CatalogService, type CreatePlaylistInput } from './catalog.service.js';

interface UpdatePlaylistSongsBody {
  songIds: string[];
}

@Controller('v1/playlists')
export class PlaylistsController {
  constructor(
    @Inject(CatalogService) private readonly catalogService: CatalogService,
  ) {}

  @Public()
  @Get()
  async getPlaylists(@CurrentUser() user?: AuthenticatedUser) {
    const playlists = await this.catalogService.getPlaylists(user?.id);
    return ok(playlists);
  }

  @Public()
  @Post()
  async createPlaylist(
    @Body() body: CreatePlaylistInput,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const playlist = await this.catalogService.createPlaylist(body, user?.id);
    return ok(playlist);
  }

  @Public()
  @Patch(':id/songs')
  async updatePlaylistSongs(
    @Param('id') id: string,
    @Body() body: UpdatePlaylistSongsBody,
  ) {
    const playlist = await this.catalogService.updatePlaylistSongs(id, body?.songIds);
    return ok(playlist);
  }
}
