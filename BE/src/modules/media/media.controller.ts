import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ok, type ApiResponse } from '../../common/api-response.js';
import { Roles } from '../../common/decorators/auth.decorators.js';
import {
  MediaService,
  type UploadMediaDto,
  type UploadMediaResult,
} from './media.service.js';

@Controller('v1/media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly mediaService: MediaService) {}

  @Roles('ADMIN')
  @Post('upload')
  async upload(@Body() body: UploadMediaDto): Promise<ApiResponse<UploadMediaResult>> {
    const result = await this.mediaService.upload(body);
    return ok(result);
  }
}
