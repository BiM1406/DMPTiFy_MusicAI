import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service.js';
import { ok } from './common/api-response.js';
import { Public } from './common/decorators/auth.decorators.js';
import { DatabaseService } from './database/database.service.js';

@Controller()
export class AppController {
  constructor(
    @Inject(AppService) private readonly appService: AppService,
    @Inject(DatabaseService) private readonly db: DatabaseService,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('v1/health')
  async getHealth() {
    return ok({
      status: 'ok',
      service: 'dmptify-be',
      database: await this.db.getHealth(),
    });
  }
}
