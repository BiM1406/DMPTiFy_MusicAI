import 'reflect-metadata';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { AppConfigService } from '../src/config/env.config.js';
import { DatabaseService } from '../src/database/database.service.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { VnpaySigner } from '../src/modules/billing/vnpay.signer.js';
import { NotificationsService } from '../src/modules/notifications/notifications.service.js';

describe('CS445 5-Pillar Architecture (e2e)', () => {
  let app: INestApplication<App>;
  let database: DatabaseService;
  let notifications: NotificationsService;
  let vnpaySigner: VnpaySigner;
  let config: AppConfigService;
  let passwordService: PasswordService;

  const savedEnv: Record<string, string | undefined> = {};
  const envOverrides: Record<string, string> = {
    DB_MODE: 'memory',
    NODE_ENV: 'test',
    GEMINI_API_KEY: '',
    YOUTUBE_API_KEY: '',
    RESEND_API_KEY: '',
    CLOUDINARY_CLOUD_NAME: '',
    CLOUDINARY_API_KEY: '',
    CLOUDINARY_API_SECRET: '',
  };

  beforeAll(async () => {
    for (const [key, value] of Object.entries(envOverrides)) {
      savedEnv[key] = process.env[key];
      process.env[key] = value;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    database = app.get(DatabaseService);
    notifications = app.get(NotificationsService);
    vnpaySigner = app.get(VnpaySigner);
    config = app.get(AppConfigService);
    passwordService = app.get(PasswordService);
  });

  beforeEach(async () => {
    await database.resetForTesting();
    notifications.clearSentEmails();
  });

  afterAll(async () => {
    await app.close();
    for (const [key, original] of Object.entries(savedEnv)) {
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  });

  it('Pillar 1 (Health): GET /api/v1/health reports service and in-memory database health', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(res.body).toEqual({
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

  it('Pillar 2 (Catalog & Playlists): filters songs, records plays to reorder charts, toggles likes, serves lyrics, and manages playlists', async () => {
    const listRes = await request(app.getHttpServer()).get('/api/v1/songs').expect(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data).toHaveLength(5);

    const moodRes = await request(app.getHttpServer())
      .get('/api/v1/songs')
      .query({ mood: 'sad' })
      .expect(200);
    expect(moodRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(moodRes.body.data.every((s: { mood: string }) => s.mood === 'sad')).toBe(true);

    const searchRes = await request(app.getHttpServer())
      .get('/api/v1/songs')
      .query({ q: 'Mưa' })
      .expect(200);
    expect(searchRes.body.data.some((s: { id: string }) => s.id === 'song-2')).toBe(true);

    const initialCharts = await request(app.getHttpServer())
      .get('/api/v1/songs/charts')
      .expect(200);
    const initialIds = initialCharts.body.data.map((s: { id: string }) => s.id);
    expect(initialIds).toEqual(['song-1', 'song-2', 'song-3', 'song-4', 'song-5']);

    // Increment song-5 from 720 -> 841 so it overtakes song-4 (840) in charts
    const firstPlay = await request(app.getHttpServer())
      .post('/api/v1/songs/song-5/play')
      .expect(200);
    expect(firstPlay.body.data.playCount).toBe(721);

    for (let i = 0; i < 120; i++) {
      await request(app.getHttpServer()).post('/api/v1/songs/song-5/play').expect(200);
    }

    const updatedCharts = await request(app.getHttpServer())
      .get('/api/v1/songs/charts')
      .expect(200);
    const updatedIds = updatedCharts.body.data.map((s: { id: string }) => s.id);
    expect(updatedIds.indexOf('song-5')).toBeLessThan(updatedIds.indexOf('song-4'));

    const likeRes = await request(app.getHttpServer())
      .post('/api/v1/songs/song-2/like')
      .expect(200);
    expect(likeRes.body).toEqual({
      success: true,
      data: { songId: 'song-2', liked: true },
    });

    const unlikeRes = await request(app.getHttpServer())
      .post('/api/v1/songs/song-2/like')
      .expect(200);
    expect(unlikeRes.body).toEqual({
      success: true,
      data: { songId: 'song-2', liked: false },
    });

    const lyricsRes = await request(app.getHttpServer())
      .get('/api/v1/songs/song-1/lyrics')
      .expect(200);
    expect(lyricsRes.body.success).toBe(true);
    expect(lyricsRes.body.data.songId).toBe('song-1');
    expect(lyricsRes.body.data.isSynced).toBe(true);
    expect(lyricsRes.body.data.plainLyrics).toBeNull();
    expect(typeof lyricsRes.body.data.rawLrc).toBe('string');
    expect(Array.isArray(lyricsRes.body.data.lines)).toBe(true);
    expect(lyricsRes.body.data.lines.length).toBeGreaterThan(0);

    const ytSearchRes = await request(app.getHttpServer())
      .get('/api/v1/songs/youtube-search')
      .query({ q: 'Mưa' })
      .expect(200);
    expect(ytSearchRes.body.success).toBe(true);
    expect(Array.isArray(ytSearchRes.body.data)).toBe(true);
    expect(ytSearchRes.body.data.some((s: { id: string }) => s.id === 'song-2')).toBe(true);

    const resolveExistingRes = await request(app.getHttpServer())
      .post('/api/v1/songs/song-1/resolve-embeddable')
      .expect(200);
    expect(resolveExistingRes.body.success).toBe(true);
    expect(resolveExistingRes.body.data.id).toBe('song-1');

    await request(app.getHttpServer())
      .post('/api/v1/songs/nonexistent-song/resolve-embeddable')
      .expect(404);

    const playlistsBefore = await request(app.getHttpServer())
      .get('/api/v1/playlists')
      .expect(200);
    expect(playlistsBefore.body.data).toHaveLength(4);

    const createdPlaylist = await request(app.getHttpServer())
      .post('/api/v1/playlists')
      .send({
        title: 'E2E Chill Mix',
        description: 'Playlist created during E2E suite',
        mood: 'chill',
        songIds: ['song-1', 'song-2'],
      })
      .expect(201);
    expect(createdPlaylist.body.success).toBe(true);
    expect(createdPlaylist.body.data.title).toBe('E2E Chill Mix');
    expect(createdPlaylist.body.data.songIds).toEqual(['song-1', 'song-2']);

    const playlistsAfter = await request(app.getHttpServer())
      .get('/api/v1/playlists')
      .expect(200);
    expect(playlistsAfter.body.data).toHaveLength(5);
  });

  it('Pillar 3 (Auth & RBAC): handles register, login, mock-google, /me guards (401/200), and ADMIN RBAC on media upload (403/201)', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);

    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'nguyenvana@dtu.edu.vn',
        password: 'password123',
        fullName: 'Nguyễn Văn A',
      })
      .expect(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.user.role).toBe('USER');
    const userToken = regRes.body.data.accessToken as string;

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'nguyenvana@dtu.edu.vn',
        password: 'password123',
      })
      .expect(200);
    expect(loginRes.body.data.user.email).toBe('nguyenvana@dtu.edu.vn');

    const googleRes = await request(app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({
        idToken: 'mock-google:nguyenvanb@dtu.edu.vn:Nguyễn Văn B',
      })
      .expect(200);
    expect(googleRes.body.data.user.email).toBe('nguyenvanb@dtu.edu.vn');
    expect(googleRes.body.data.user.fullName).toBe('Nguyễn Văn B');

    const authMeRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(authMeRes.body.data.email).toBe('nguyenvana@dtu.edu.vn');

    const usersMeRes = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(usersMeRes.body.data.email).toBe('nguyenvana@dtu.edu.vn');

    // USER role is forbidden from uploading media
    await request(app.getHttpServer())
      .post('/api/v1/media/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ fileName: 'demo-track.mp3' })
      .expect(403);

    // ADMIN role is allowed to upload media
    const adminPasswordHash = await passwordService.hash('admin123456');
    await database.createUser({
      email: 'admin@dmptify.local',
      passwordHash: adminPasswordHash,
      fullName: 'DMPTiFy Admin',
      role: 'ADMIN',
      planTier: 'VIP',
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@dmptify.local',
        password: 'admin123456',
      })
      .expect(200);
    const adminToken = adminLogin.body.data.accessToken as string;

    const uploadRes = await request(app.getHttpServer())
      .post('/api/v1/media/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fileName: 'demo-track.mp3', folder: 'dmptify/e2e' })
      .expect(201);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.data.publicId).toBe('dmptify/e2e/demo-track');
    expect(uploadRes.body.data.resourceType).toBe('video');
    expect(uploadRes.body.data.provider).toBe('sandbox');
  });

  it('Pillar 4 (AI Mood Engine): POST /api/v1/ai/chat analyzes mood, recommends songs, and writes to /api/v1/ai/history', async () => {
    const prompt = 'Hôm nay mưa buồn, áp lực thi cử mệt mỏi quá...';
    const chatRes = await request(app.getHttpServer())
      .post('/api/v1/ai/chat')
      .send({ message: prompt, createPlaylist: true })
      .expect(201);

    expect(chatRes.body.success).toBe(true);
    expect(typeof chatRes.body.data.replyText).toBe('string');
    expect(chatRes.body.data.replyText.length).toBeGreaterThan(0);
    expect(typeof chatRes.body.data.detectedMood).toBe('string');
    expect(chatRes.body.data.moodCode).toBe('sad');
    expect(chatRes.body.data.targetBpm).toBe(68);
    expect(Array.isArray(chatRes.body.data.recommendedSongs)).toBe(true);
    expect(chatRes.body.data.recommendedSongs.length).toBeGreaterThan(0);
    expect(chatRes.body.data.generatedPlaylist).not.toBeNull();

    const historyRes = await request(app.getHttpServer())
      .get('/api/v1/ai/history')
      .expect(200);
    expect(historyRes.body.success).toBe(true);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(historyRes.body.data[0].userMessage).toBe(prompt);
    expect(historyRes.body.data[0].targetBpm).toBe(68);
  });

  it('Pillar 5 (VNPay Billing & Notifications): verifies HMAC-SHA512 IPN, raw responses (00/02/97), VIP upgrade, and invoice email idempotency', async () => {
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'vip.listener@dtu.edu.vn',
        password: 'password123',
        fullName: 'VIP Listener',
      })
      .expect(201);
    const userToken = regRes.body.data.accessToken as string;

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/payments/vnpay/create-url')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amountVnd: 49000 })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const { txnRef, amountVnd, paymentUrl } = createRes.body.data as {
      txnRef: string;
      amountVnd: number;
      paymentUrl: string;
    };
    expect(amountVnd).toBe(49000);
    expect(paymentUrl).toContain(txnRef);

    const ipnParams = {
      vnp_TxnRef: txnRef,
      vnp_Amount: String(amountVnd * 100),
      vnp_ResponseCode: '00',
      vnp_TransactionNo: '14123456',
    };
    const signedUrl = vnpaySigner.createSignedUrl(
      'http://localhost/ipn',
      ipnParams,
      config.vnpayHashSecret,
    );
    const validQuery = Object.fromEntries(new URL(signedUrl).searchParams.entries());

    // Tampered signature must return RAW { RspCode: '97', ... }
    const tamperedRes = await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/ipn')
      .query({ ...validQuery, vnp_SecureHash: 'f'.repeat(128) })
      .expect(200);
    expect(tamperedRes.body).toEqual({
      RspCode: '97',
      Message: 'Invalid Checksum',
    });
    expect('success' in tamperedRes.body).toBe(false);

    // Valid IPN returns RAW { RspCode: '00', Message: 'Confirm Success' }, upgrades user to VIP, and queues invoice email
    const validIpnRes = await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/ipn')
      .query(validQuery)
      .expect(200);
    expect(validIpnRes.body).toEqual({
      RspCode: '00',
      Message: 'Confirm Success',
    });
    expect('success' in validIpnRes.body).toBe(false);

    const meAfterVip = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(meAfterVip.body.data.planTier).toBe('VIP');
    expect(meAfterVip.body.data.vipExpiresAt).not.toBeNull();

    const sentEmails = notifications.getSentEmails();
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].template).toBe('vip-invoice');
    expect(sentEmails[0].to).toBe('vip.listener@dtu.edu.vn');
    expect(sentEmails[0].metadata?.txnRef).toBe(txnRef);

    // Replaying identical signed IPN must be idempotent -> RAW { RspCode: '02', ... }
    const replayRes = await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/ipn')
      .query(validQuery)
      .expect(200);
    expect(replayRes.body).toEqual({
      RspCode: '02',
      Message: 'Order already confirmed',
    });
    expect('success' in replayRes.body).toBe(false);
    expect(notifications.getSentEmails()).toHaveLength(1);

    // Return endpoint verifies signed params cleanly
    const returnRes = await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/return')
      .query(validQuery)
      .expect(200);
    expect(returnRes.body).toEqual({
      success: true,
      data: { verified: true, code: '00', txnRef },
    });
  });

  it('Hardening & Swagger Docs: exposes /api/docs + OpenAPI 3.1 (without billing), sets security & rate-limit headers, and supports song pagination', async () => {
    const openapiRes = await request(app.getHttpServer())
      .get('/api/docs/openapi.json')
      .expect(200);
    expect(openapiRes.body.openapi).toBe('3.1.0');
    expect(openapiRes.body.paths).toHaveProperty('/api/v1/songs');
    expect(openapiRes.body.paths).toHaveProperty('/api/v1/songs/youtube-search');
    expect(openapiRes.body.paths).toHaveProperty('/api/v1/songs/{id}/resolve-embeddable');
    expect(openapiRes.body.paths).toHaveProperty('/api/v1/auth/login');
    expect(openapiRes.body.paths).toHaveProperty('/api/v1/ai/chat');
    const exposedPaths = Object.keys(openapiRes.body.paths as Record<string, unknown>);
    expect(exposedPaths.some((p) => p.includes('/vnpay/'))).toBe(false);

    const docsHtmlRes = await request(app.getHttpServer()).get('/api/docs').expect(200);
    expect(docsHtmlRes.headers['content-type']).toContain('text/html');
    expect(docsHtmlRes.text).toContain('DMPTiFy');

    const paginated = await request(app.getHttpServer())
      .get('/api/v1/songs')
      .query({ page: 1, limit: 2 })
      .expect(200);
    expect(paginated.headers['x-content-type-options']).toBe('nosniff');
    expect(paginated.headers['x-frame-options']).toBe('DENY');
    expect(paginated.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(paginated.headers['x-permitted-cross-domain-policies']).toBe('none');
    expect(paginated.headers['permissions-policy']).toContain('camera=()');
    expect(Number(paginated.headers['x-ratelimit-limit'])).toBeGreaterThan(0);
    expect(paginated.body.success).toBe(true);
    expect(paginated.body.data).toHaveLength(2);
    expect(paginated.body.meta).toEqual({
      page: 1,
      limit: 2,
      totalItems: 5,
      totalPages: 3,
    });

    const sanitizedPlaylist = await request(app.getHttpServer())
      .post('/api/v1/playlists')
      .set('Content-Type', 'application/json')
      .send('{"title":"Clean\\u0000 Mix","__proto__":{"polluted":true}}')
      .expect(201);
    expect(sanitizedPlaylist.body.data.title).toBe('Clean Mix');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
