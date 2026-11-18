import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { GlobalHttpExceptionFilter } from './common/filters/global-http-exception.filter.js';
import { RateLimitGuard } from './common/guards/rate-limit.guard.js';
import { SecurityHeadersInterceptor } from './common/interceptors/security-headers.interceptor.js';
import { SanitizePayloadPipe } from './common/pipes/sanitize-payload.pipe.js';
import { AppConfigModule } from './config/env.config.js';
import { DatabaseModule } from './database/database.module.js';
import { AiMoodModule } from './modules/ai-mood/ai-mood.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './modules/auth/guards/roles.guard.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { DocsModule } from './modules/docs/docs.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { JamModule } from './modules/jam/jam.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { YouTubeModule } from './modules/youtube/youtube.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    YouTubeModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    AiMoodModule,
    BillingModule,
    MediaModule,
    NotificationsModule,
    JamModule,
    DocsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_PIPE,
      useClass: SanitizePayloadPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityHeadersInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter,
    },
  ],
})
export class AppModule {}
