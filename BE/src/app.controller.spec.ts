import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseService } from './database/database.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DatabaseService,
          useValue: {
            getHealth: async () => ({
              driver: 'mysql' as const,
              mode: 'in-memory-fallback' as const,
              connected: false,
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    it('should return health payload with database status', async () => {
      const health = await appController.getHealth();
      expect(health).toEqual({
        success: true,
        data: {
          status: 'ok',
          service: 'dmptify-be',
          database: {
            driver: 'mysql',
            mode: 'in-memory-fallback',
            connected: false,
          },
        },
      });
    });
  });
});
