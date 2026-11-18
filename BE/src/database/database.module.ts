import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../config/env.config.js';
import { DatabaseService } from './database.service.js';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
