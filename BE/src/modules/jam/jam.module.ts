import { Module } from '@nestjs/common';
import { JamController } from './jam.controller.js';
import { JamService } from './jam.service.js';

@Module({
  controllers: [JamController],
  providers: [JamService],
  exports: [JamService],
})
export class JamModule {}
