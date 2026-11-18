import 'reflect-metadata';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { DatabaseService } from './../src/database/database.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prevDbMode: string | undefined;
  let prevNodeEnv: string | undefined;

  beforeAll(() => {
    prevDbMode = process.env.DB_MODE;
    prevNodeEnv = process.env.NODE_ENV;
    process.env.DB_MODE = 'memory';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    if (prevDbMode === undefined) {
      delete process.env.DB_MODE;
    } else {
      process.env.DB_MODE = prevDbMode;
    }
    if (prevNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    const db = app.get(DatabaseService);
    await db.resetForTesting();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});
