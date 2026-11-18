import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Sse,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Public } from '../../common/decorators/auth.decorators.js';
import { JamService } from './jam.service.js';
import { JamActionPayload, JamSongPayload } from './jam.types.js';

@Controller('v1/jam')
export class JamController {
  constructor(private readonly jamService: JamService) {}

  @Public()
  @Post('rooms')
  public createRoom(
    @Body()
    body: {
      hostName?: string;
      hostId?: string;
      initialSong?: JamSongPayload;
      isPlaying?: boolean;
      currentTime?: number;
    },
  ) {
    const room = this.jamService.createRoom(
      body.hostName || 'Nguyễn Tuấn Đạt',
      body.hostId,
      body.initialSong,
      body.isPlaying,
      body.currentTime,
    );
    return { success: true, data: room };
  }

  @Public()
  @Get('rooms/:code')
  public getRoom(@Param('code') code: string) {
    const room = this.jamService.getRoom(code);
    if (!room) {
      throw new NotFoundException(`Phòng nghe ${code} không tồn tại hoặc đã giải tán.`);
    }
    return { success: true, data: room };
  }

  @Public()
  @Post('rooms/:code/join')
  public joinRoom(
    @Param('code') code: string,
    @Body() body: { memberName?: string; memberId?: string },
  ) {
    const room = this.jamService.joinRoom(code, body.memberName || '', body.memberId);
    if (!room) {
      throw new NotFoundException(`Phòng nghe ${code} không tồn tại.`);
    }
    return { success: true, data: room };
  }

  @Public()
  @Post('rooms/:code/leave')
  public leaveRoom(
    @Param('code') code: string,
    @Body() body: { memberId: string },
  ) {
    const room = this.jamService.leaveRoom(code, body.memberId);
    return { success: true, data: room };
  }

  @Public()
  @Post('rooms/:code/action')
  public handleAction(
    @Param('code') code: string,
    @Body() body: { action: JamActionPayload; memberId?: string },
  ) {
    const room = this.jamService.handleAction(code, body.action, body.memberId);
    if (!room) {
      throw new NotFoundException(`Phòng nghe ${code} không tồn tại.`);
    }
    return { success: true, data: room };
  }

  @Public()
  @Sse('rooms/:code/stream')
  public streamRoom(@Param('code') code: string): Observable<MessageEvent> {
    return this.jamService.getRoomStream(code);
  }
}
