export interface JamMember {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  joinedAt: number;
}

export interface JamReaction {
  id: string;
  emoji: string;
  sender: string;
  timestamp: number;
}

export interface JamSongPayload {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: number;
  audioUrl?: string;
  youtubeVideoId?: string;
}

export interface JamRoom {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  currentSong: JamSongPayload | null;
  currentTime: number;
  isPlaying: boolean;
  lastUpdated: number;
  members: JamMember[];
  queue: JamSongPayload[];
  reactions: JamReaction[];
}

export type JamActionType =
  | 'PLAY'
  | 'PAUSE'
  | 'SEEK'
  | 'TRACK_CHANGE'
  | 'QUEUE_ADD'
  | 'REACTION';

export interface JamActionPayload {
  type: JamActionType;
  time?: number;
  song?: JamSongPayload;
  emoji?: string;
  senderName?: string;
}
