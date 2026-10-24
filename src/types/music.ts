export type MoodType = 'chill' | 'sad' | 'energetic' | 'focus' | 'acoustic';

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  audioUrl: string;
  coverUrl: string;
  lyricsUrl?: string;
  mood: MoodType;
  moodLabel: string;
  bpm: number;
  liked?: boolean;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  songsCount: number;
  mood?: MoodType;
  isAiGenerated?: boolean;
}
