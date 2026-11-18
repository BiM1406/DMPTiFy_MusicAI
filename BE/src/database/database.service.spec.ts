import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEMO_USER_ID } from '../common/types/domain.types.js';
import { AppConfigService } from '../config/env.config.js';
import { DatabaseModule } from './database.module.js';
import { DatabaseService } from './database.service.js';

describe('DatabaseService (3NF In-Memory & Auto Fallback)', () => {
  let db: DatabaseService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(
        AppConfigService.fromRawEnv({
          DB_MODE: 'memory',
          NODE_ENV: 'test',
        }),
      )
      .compile();

    await moduleRef.init();
    db = moduleRef.get(DatabaseService);
    await db.resetForTesting();
  });

  afterEach(async () => {
    if (db) {
      await db.onModuleDestroy();
    }
  });

  it('reports in-memory fallback health in memory mode and auto-falls back when MySQL is unreachable', async () => {
    const health = await db.getHealth();
    expect(health).toEqual({
      driver: 'mysql',
      mode: 'in-memory-fallback',
      connected: false,
    });

    const autoDb = new DatabaseService(
      AppConfigService.fromRawEnv({
        DB_MODE: 'auto',
        DATABASE_URL: 'mysql://root:root@127.0.0.1:33999/dmptify_db',
      }),
    );
    await autoDb.onModuleInit();
    const autoHealth = await autoDb.getHealth();
    expect(autoHealth.mode).toBe('in-memory-fallback');
    expect(autoHealth.driver).toBe('mysql');
    await autoDb.onModuleDestroy();
  });

  it('seeds demo user Nguyễn Tuấn Đạt, 5 songs, user likes, and 4 playlists', async () => {
    const demoUser = await db.findUserById(DEMO_USER_ID);
    expect(demoUser).not.toBeNull();
    expect(demoUser?.fullName).toBe('Nguyễn Tuấn Đạt');
    expect(demoUser?.email).toBe('dat.nguyen@dtu.edu.vn');
    expect(demoUser?.role).toBe('USER');
    expect(demoUser?.planTier).toBe('FREE');

    const songs = await db.listSongs({ userId: DEMO_USER_ID });
    expect(songs).toHaveLength(5);
    expect(songs.find((s) => s.id === 'song-1')?.liked).toBe(true);
    expect(songs.find((s) => s.id === 'song-2')?.liked).toBe(false);
    expect(songs.find((s) => s.id === 'song-3')?.liked).toBe(true);
    expect(songs.find((s) => s.id === 'song-4')?.liked).toBe(false);
    expect(songs.find((s) => s.id === 'song-5')?.liked).toBe(true);

    const playlists = await db.listPlaylists(DEMO_USER_ID);
    expect(playlists).toHaveLength(4);
    expect(playlists.find((p) => p.id === 'pl-2')?.songIds).toEqual([
      'song-1',
      'song-3',
    ]);
    expect(playlists.find((p) => p.id === 'pl-2')?.songsCount).toBe(2);
  });

  it('manages users, Google linking, and VIP upgrades', async () => {
    const created = await db.createUser({
      email: 'Test.User@Example.COM',
      passwordHash: 'scrypt:salt:hash',
      fullName: 'Nguyễn Văn A',
    });
    expect(created.email).toBe('test.user@example.com');

    const byEmail = await db.findUserByEmail('test.user@example.com');
    expect(byEmail?.id).toBe(created.id);

    const linked = await db.updateUserGoogleLink(
      created.id,
      'google-uid-999',
      'https://example.com/avatar.png',
    );
    expect(linked.googleId).toBe('google-uid-999');
    expect(linked.avatarUrl).toBe('https://example.com/avatar.png');

    const byGoogle = await db.findUserByGoogleId('google-uid-999');
    expect(byGoogle?.id).toBe(created.id);

    const vipUntil = new Date(Date.now() + 30 * 86_400_000);
    const upgraded = await db.upgradeUserToVip(created.id, vipUntil);
    expect(upgraded.planTier).toBe('VIP');
    expect(upgraded.vipExpiresAt?.getTime()).toBe(vipUntil.getTime());
  });

  it('supports song filtering, charts ordering, library view, play counts, and likes', async () => {
    const sadSongs = await db.listSongs({ mood: 'sad' });
    expect(sadSongs).toHaveLength(1);
    expect(sadSongs[0]?.id).toBe('song-2');

    const queried = await db.listSongs({ query: 'mua thang sau' });
    expect(queried.map((s) => s.id)).toEqual(['song-2']);

    const library = await db.listSongs({
      view: 'library',
      userId: DEMO_USER_ID,
    });
    expect(library.map((s) => s.id)).toEqual(['song-1', 'song-3', 'song-5']);

    const chartsBefore = await db.listSongs({ view: 'charts' });
    expect(chartsBefore[0]?.playCount).toBeGreaterThanOrEqual(
      chartsBefore[1]?.playCount ?? 0,
    );

    const beforeSong5 = await db.findSongById('song-5');
    const afterPlay = await db.incrementSongPlayCount('song-5');
    expect(afterPlay?.playCount).toBe((beforeSong5?.playCount ?? 0) + 1);
    expect(await db.incrementSongPlayCount('missing-song')).toBeNull();

    const toggledOn = await db.toggleSongLike(DEMO_USER_ID, 'song-2');
    expect(toggledOn).toEqual({ songId: 'song-2', liked: true });
    const toggledOff = await db.toggleSongLike(DEMO_USER_ID, 'song-2');
    expect(toggledOff).toEqual({ songId: 'song-2', liked: false });
    expect(await db.toggleSongLike(DEMO_USER_ID, 'missing-song')).toBeNull();
  });

  it('creates and updates playlists with deduplicated valid songIds and logs AI chats', async () => {
    const createdPlaylist = await db.createPlaylist({
      userId: DEMO_USER_ID,
      title: 'Đêm Code Chill',
      mood: 'focus',
      isAiGenerated: true,
      songIds: ['song-5', 'song-1', 'song-5', 'non-existent'],
    });

    expect(createdPlaylist.songIds).toEqual(['song-5', 'song-1']);
    expect(createdPlaylist.songsCount).toBe(2);
    expect(createdPlaylist.isAiGenerated).toBe(true);

    const updated = await db.updatePlaylistSongs(createdPlaylist.id, [
      'song-3',
      'song-2',
      'song-3',
    ]);
    expect(updated?.songIds).toEqual(['song-3', 'song-2']);
    expect(updated?.songsCount).toBe(2);
    expect(await db.updatePlaylistSongs('missing-pl', ['song-1'])).toBeNull();

    const chat = await db.createAiChatLog({
      userId: DEMO_USER_ID,
      userMessage: 'Hôm nay trời mưa buồn quá',
      aiReply: 'Nghe Mưa Tháng Sáu nhé',
      detectedMood: 'sad',
      targetBpm: 68,
      generatedPlaylistId: createdPlaylist.id,
    });
    expect(chat.id).toMatch(/^ai-/);

    const history = await db.listAiChatLogs(DEMO_USER_ID, 10);
    expect(history).toHaveLength(1);
    expect(history[0]?.detectedMood).toBe('sad');
  });

  it('processes payment confirmation atomically and enforces IPN idempotency', async () => {
    const missing = await db.confirmPaymentAndUpgradeVip({
      txnRef: 'MISSING-TXN',
      vnpTransactionNo: 'VNP000',
      rawIpnPayload: {},
      paidStatus: 'PAID',
    });
    expect(missing.outcome).toBe('NOT_FOUND');

    const txn = await db.createPaymentTransaction({
      txnRef: 'TXN-VIP-001',
      userId: DEMO_USER_ID,
      amountVnd: 49000,
    });
    expect(txn.status).toBe('PENDING');

    const found = await db.findPaymentByTxnRef('TXN-VIP-001');
    expect(found?.amountVnd).toBe(49000);

    const paidResult = await db.confirmPaymentAndUpgradeVip({
      txnRef: 'TXN-VIP-001',
      vnpTransactionNo: '14001234',
      rawIpnPayload: { vnp_ResponseCode: '00' },
      paidStatus: 'PAID',
      vipDays: 30,
    });
    expect(paidResult.outcome).toBe('UPDATED_PAID');
    expect(paidResult.transaction?.status).toBe('PAID');
    expect(paidResult.user?.planTier).toBe('VIP');
    expect(paidResult.user?.vipExpiresAt).not.toBeNull();

    const replayResult = await db.confirmPaymentAndUpgradeVip({
      txnRef: 'TXN-VIP-001',
      vnpTransactionNo: '14001234',
      rawIpnPayload: { vnp_ResponseCode: '00' },
      paidStatus: 'PAID',
      vipDays: 30,
    });
    expect(replayResult.outcome).toBe('ALREADY_CONFIRMED');

    await db.createPaymentTransaction({
      txnRef: 'TXN-FAIL-002',
      userId: DEMO_USER_ID,
      amountVnd: 49000,
    });
    const failedResult = await db.confirmPaymentAndUpgradeVip({
      txnRef: 'TXN-FAIL-002',
      vnpTransactionNo: '14009999',
      rawIpnPayload: { vnp_ResponseCode: '24' },
      paidStatus: 'FAILED',
    });
    expect(failedResult.outcome).toBe('UPDATED_FAILED');
    expect(failedResult.transaction?.status).toBe('FAILED');

    await db.resetForTesting();
    const resetUser = await db.findUserById(DEMO_USER_ID);
    expect(resetUser?.planTier).toBe('FREE');
    expect(await db.findPaymentByTxnRef('TXN-VIP-001')).toBeNull();
  });

  it('loads 15 V-Pop showcase tracks without legacy SVG stubs in non-test env, and supports upsertSong/updateSongMedia', async () => {
    const devDb = new DatabaseService(
      AppConfigService.fromRawEnv({
        DB_MODE: 'memory',
        NODE_ENV: 'development',
      }),
    );
    await devDb.onModuleInit();

    const devSongs = await devDb.listSongs();
    expect(devSongs).toHaveLength(15);
    expect(devSongs.some((s) => s.id.startsWith('song-'))).toBe(false);
    expect(devSongs.every((s) => s.id.startsWith('vpop-'))).toBe(true);
    expect(devSongs[0].id).toBe('vpop-1');

    const upserted = await devDb.upsertSong({
      id: 'yt-dQw4w9WgXcQ',
      title: 'Nàng Thơ',
      artist: 'Hoàng Dũng',
      album: 'YouTube Music',
      duration: 254,
      audioUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/600x600bb.jpg',
      mood: 'acoustic',
      moodLabel: 'Mộc mạc & Thư thái',
      bpm: 80,
    });
    expect(upserted.youtubeVideoId).toBe('dQw4w9WgXcQ');
    expect((await devDb.listSongs()).length).toBe(16);

    const updated = await devDb.updateSongMedia('vpop-7', {
      audioUrl: 'https://youtu.be/abc123def45',
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/600x600bb.jpg',
      duration: 260,
    });
    expect(updated?.youtubeVideoId).toBe('abc123def45');
    expect(updated?.duration).toBe(260);

    expect(await devDb.updateSongMedia('nonexistent-id', { duration: 100 })).toBeNull();

    await devDb.resetForTesting();
    expect(await devDb.listSongs()).toHaveLength(5);
    await devDb.onModuleDestroy();
  });
});
