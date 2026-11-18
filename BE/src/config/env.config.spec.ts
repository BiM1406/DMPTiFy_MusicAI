import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import {
  AppConfigModule,
  AppConfigService,
  loadAndValidateEnv,
} from './env.config.js';

describe('env.config & AppConfigService', () => {
  it('loads expected defaults when no overrides are given', () => {
    const env = loadAndValidateEnv({});

    expect(env.port).toBe(3001);
    expect(env.nodeEnv).toBe('development');
    expect(env.frontendUrl).toBe('http://localhost:3000');
    expect(env.databaseUrl).toBe('mysql://root:root@localhost:3306/dmptify_db');
    expect(env.dbMode).toBe('auto');
    expect(env.jwtExpiresInSeconds).toBe(86400);
    expect(env.geminiModel).toBe('gemini-2.5-flash');
    expect(env.googleClientId).toBe('');
    expect(env.geminiApiKey).toBe('');
    expect(env.youtubeApiKey).toBe('');
    expect(env.resendApiKey).toBe('');
    expect(env.cloudinaryCloudName).toBe('');
  });

  it('parses custom valid environment values', () => {
    const env = loadAndValidateEnv({
      PORT: '4000',
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://dmptify.example.com',
      DATABASE_URL: 'mysql://dmptify:secret@127.0.0.1:3306/dmptify_prod',
      DB_MODE: 'mysql',
      JWT_SECRET: 'super-secure-production-jwt-secret-key-2026',
      JWT_EXPIRES_IN_SECONDS: '3600',
      GEMINI_API_KEY: 'gem-key-123',
      GEMINI_MODEL: 'gemini-2.5-pro',
      YOUTUBE_API_KEY: 'yt-key-123',
    });

    expect(env.port).toBe(4000);
    expect(env.nodeEnv).toBe('production');
    expect(env.frontendUrl).toBe('https://dmptify.example.com');
    expect(env.dbMode).toBe('mysql');
    expect(env.jwtExpiresInSeconds).toBe(3600);
    expect(env.geminiApiKey).toBe('gem-key-123');
    expect(env.geminiModel).toBe('gemini-2.5-pro');
    expect(env.youtubeApiKey).toBe('yt-key-123');
  });

  it('fails fast on invalid PORT, DB_MODE, NODE_ENV, URLs, and JWT config', () => {
    expect(() => loadAndValidateEnv({ PORT: '0' })).toThrow(/PORT/i);
    expect(() => loadAndValidateEnv({ PORT: '70000' })).toThrow(/PORT/i);
    expect(() => loadAndValidateEnv({ PORT: '3001abc' })).toThrow(/PORT/i);
    expect(() => loadAndValidateEnv({ DB_MODE: 'postgres' })).toThrow(
      /DB_MODE/i,
    );
    expect(() => loadAndValidateEnv({ NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/i,
    );
    expect(() => loadAndValidateEnv({ FRONTEND_URL: 'not-a-url' })).toThrow(
      /FRONTEND_URL/i,
    );
    expect(() =>
      loadAndValidateEnv({ FRONTEND_URL: 'ftp://localhost:3000' }),
    ).toThrow(/FRONTEND_URL/i);
    expect(() =>
      loadAndValidateEnv({ DATABASE_URL: 'postgresql://localhost:5432/db' }),
    ).toThrow(/DATABASE_URL/i);
    expect(() =>
      loadAndValidateEnv({ JWT_EXPIRES_IN_SECONDS: '0' }),
    ).toThrow(/JWT_EXPIRES_IN_SECONDS/i);
    expect(() => loadAndValidateEnv({ JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET/i,
    );
    expect(() => loadAndValidateEnv({ NODE_ENV: 'production' })).toThrow(
      /JWT_SECRET/i,
    );
  });

  it('wires AppConfigModule and AppConfigService through NestJS DI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule],
    }).compile();

    const config = moduleRef.get(AppConfigService);
    expect(config).toBeInstanceOf(AppConfigService);
    expect(config.port).toBe(3001);
    expect(config.geminiModel).toBe('gemini-3.8');
    expect(typeof config.youtubeApiKey).toBe('string');
    await moduleRef.close();
  });
});
