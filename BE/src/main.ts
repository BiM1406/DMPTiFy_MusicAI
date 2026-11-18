import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { AppConfigService } from './config/env.config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(AppConfigService);

  app.disable('x-powered-by');
  app.useBodyParser('json', { limit: '256kb' });
  app.enableCors({
    origin: config.frontendUrl,
    credentials: true,
  });
  app.setGlobalPrefix('api');

  const port = config.port;
  await app.listen(port);
  console.log(`🚀 NestJS Backend running at: http://localhost:${port}/api`);
  console.log(`📘 OpenAPI Swagger Docs at: http://localhost:${port}/api/docs`);
}
await bootstrap();
