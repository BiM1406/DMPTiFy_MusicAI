import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ok, type ApiResponse } from '../../common/api-response.js';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import {
  DEMO_USER_ID,
  type AiChatLogRecord,
  type AuthenticatedUser,
} from '../../common/types/domain.types.js';
import {
  AiMoodService,
  type AiChatRequestDto,
  type AiChatResponseDto,
} from './ai-mood.service.js';

@Controller('v1/ai')
export class AiMoodController {
  constructor(@Inject(AiMoodService) private readonly aiMoodService: AiMoodService) {}

  @Public()
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('chat')
  async chat(
    @Body() body: AiChatRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ApiResponse<AiChatResponseDto>> {
    const result = await this.aiMoodService.chat(body, user?.id ?? DEMO_USER_ID);
    return ok(result);
  }

  @Public()
  @Get('history')
  async history(
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ApiResponse<AiChatLogRecord[]>> {
    const logs = await this.aiMoodService.getHistory(user?.id ?? DEMO_USER_ID);
    return ok(logs);
  }
}
