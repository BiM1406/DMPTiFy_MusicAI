import type { PrismaClient } from '@prisma/client';
import {
  INITIAL_PLAYLISTS,
  INITIAL_SONGS,
  INITIAL_USER,
  INITIAL_USER_LIKED_SONG_IDS,
} from './seed-data.js';

export async function seedPrismaDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.user.upsert({
    where: { id: INITIAL_USER.id },
    update: {
      email: INITIAL_USER.email,
      fullName: INITIAL_USER.fullName,
      role: INITIAL_USER.role,
    },
    create: {
      id: INITIAL_USER.id,
      email: INITIAL_USER.email,
      passwordHash: INITIAL_USER.passwordHash,
      fullName: INITIAL_USER.fullName,
      avatarUrl: INITIAL_USER.avatarUrl,
      googleId: INITIAL_USER.googleId,
      role: INITIAL_USER.role,
      planTier: INITIAL_USER.planTier,
      vipExpiresAt: INITIAL_USER.vipExpiresAt,
      createdAt: INITIAL_USER.createdAt,
    },
  });

  for (const song of INITIAL_SONGS) {
    await prisma.song.upsert({
      where: { id: song.id },
      update: {
        title: song.title,
        artist: song.artist,
        album: song.album,
        duration: song.duration,
        audioUrl: song.audioUrl,
        coverUrl: song.coverUrl,
        lyricsUrl: song.lyricsUrl,
        mood: song.mood,
        moodLabel: song.moodLabel,
        bpm: song.bpm,
        isVipOnly: song.isVipOnly,
      },
      create: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        duration: song.duration,
        audioUrl: song.audioUrl,
        coverUrl: song.coverUrl,
        lyricsUrl: song.lyricsUrl,
        mood: song.mood,
        moodLabel: song.moodLabel,
        bpm: song.bpm,
        playCount: song.playCount,
        isVipOnly: song.isVipOnly,
        createdAt: song.createdAt,
      },
    });
  }

  for (const songId of INITIAL_USER_LIKED_SONG_IDS) {
    await prisma.userSongLike.upsert({
      where: {
        userId_songId: {
          userId: INITIAL_USER.id,
          songId,
        },
      },
      update: {},
      create: {
        userId: INITIAL_USER.id,
        songId,
      },
    });
  }

  for (const playlist of INITIAL_PLAYLISTS) {
    await prisma.playlist.upsert({
      where: { id: playlist.id },
      update: {
        title: playlist.title,
        description: playlist.description,
        coverUrl: playlist.coverUrl,
        mood: playlist.mood,
        isAiGenerated: playlist.isAiGenerated,
        isPublic: playlist.isPublic,
      },
      create: {
        id: playlist.id,
        userId: playlist.userId,
        title: playlist.title,
        description: playlist.description,
        coverUrl: playlist.coverUrl,
        mood: playlist.mood,
        isAiGenerated: playlist.isAiGenerated,
        isPublic: playlist.isPublic,
        createdAt: playlist.createdAt,
      },
    });

    await prisma.playlistSong.deleteMany({
      where: { playlistId: playlist.id },
    });

    if (playlist.songIds.length > 0) {
      await prisma.playlistSong.createMany({
        data: playlist.songIds.map((songId, index) => ({
          playlistId: playlist.id,
          songId,
          position: index,
        })),
      });
    }
  }
}
