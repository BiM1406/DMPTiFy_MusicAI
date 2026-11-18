export type MoodType = 'chill' | 'sad' | 'energetic' | 'focus' | 'acoustic';
export type UserRole = 'USER' | 'ADMIN';
export type PlanTier = 'FREE' | 'VIP';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export const DEMO_USER_ID = 'user-dat-01';

export interface LyricLineDto {
  time: number;
  text: string;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  fullName: string;
  avatarUrl: string | null;
  googleId: string | null;
  role: UserRole;
  planTier: PlanTier;
  vipExpiresAt: Date | null;
  createdAt: Date;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  planTier: PlanTier;
  vipExpiresAt: string | null;
  avatarUrl: string | null;
}

export interface SongDto {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  audioUrl: string;
  coverUrl: string;
  lyricsUrl?: string;
  youtubeVideoId?: string;
  mood: MoodType;
  moodLabel: string;
  bpm: number;
  liked: boolean;
  playCount: number;
  isVipOnly: boolean;
}

export interface PlaylistDto {
  id: string;
  userId: string | null;
  title: string;
  description: string;
  coverUrl: string;
  songIds: string[];
  songsCount: number;
  mood?: MoodType;
  isAiGenerated: boolean;
  isPublic: boolean;
}

export interface AiChatLogRecord {
  id: string;
  userId: string | null;
  userMessage: string;
  aiReply: string;
  detectedMood: string;
  targetBpm: number;
  generatedPlaylistId: string | null;
  createdAt: Date;
}

export interface PaymentTransactionRecord {
  id: string;
  txnRef: string;
  userId: string;
  amountVnd: number;
  status: PaymentStatus;
  vnpTransactionNo: string | null;
  rawIpnPayload: Record<string, unknown> | null;
  paidAt: Date | null;
  createdAt: Date;
}
