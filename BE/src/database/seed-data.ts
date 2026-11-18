import {
  DEMO_USER_ID,
  type MoodType,
  type UserRecord,
} from '../common/types/domain.types.js';

export interface SeedSongRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  audioUrl: string;
  coverUrl: string;
  lyricsUrl: string;
  mood: MoodType;
  moodLabel: string;
  bpm: number;
  playCount: number;
  isVipOnly: boolean;
  createdAt: Date;
}

export interface SeedPlaylistRecord {
  id: string;
  userId: string | null;
  title: string;
  description: string;
  coverUrl: string;
  mood: MoodType;
  isAiGenerated: boolean;
  isPublic: boolean;
  songIds: string[];
  createdAt: Date;
}

const BASE_SEED_TIME = new Date('2026-11-18T00:00:00.000Z');

export const INITIAL_USER: UserRecord = {
  id: DEMO_USER_ID,
  email: 'dat.nguyen@dtu.edu.vn',
  passwordHash: null,
  fullName: 'Nguyễn Tuấn Đạt',
  avatarUrl: null,
  googleId: null,
  role: 'USER',
  planTier: 'FREE',
  vipExpiresAt: null,
  createdAt: BASE_SEED_TIME,
};

// Strictly for NODE_ENV === 'test' deterministic unit/E2E assertions.
export const INITIAL_SONGS: SeedSongRecord[] = [
  {
    id: 'song-1',
    title: 'Chuyện Đôi Ta',
    artist: 'Emcee L ft. Muộii',
    album: 'Acoustic Healing',
    duration: 30,
    audioUrl: '/audio/song-1.wav',
    coverUrl: '/covers/cover-1.svg',
    lyricsUrl: '/lyrics/song-1.lrc',
    mood: 'chill',
    moodLabel: 'Thư giãn & Chill',
    bpm: 78,
    playCount: 1540,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:01:00.000Z'),
  },
  {
    id: 'song-2',
    title: 'Mưa Tháng Sáu',
    artist: 'Văn Mai Hương x GREY D',
    album: 'Chiều Mưa Tâm Trạng',
    duration: 30,
    audioUrl: '/audio/song-2.wav',
    coverUrl: '/covers/cover-2.svg',
    lyricsUrl: '/lyrics/song-2.lrc',
    mood: 'sad',
    moodLabel: 'U buồn & Hoài niệm',
    bpm: 68,
    playCount: 1280,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:02:00.000Z'),
  },
  {
    id: 'song-3',
    title: 'Ánh Sao Và Bầu Trời',
    artist: 'T.R.I x Cá',
    album: 'Đêm Muộn Bình Yên',
    duration: 30,
    audioUrl: '/audio/song-3.wav',
    coverUrl: '/covers/cover-3.svg',
    lyricsUrl: '/lyrics/song-3.lrc',
    mood: 'acoustic',
    moodLabel: 'Mộc mạc & Thư thái',
    bpm: 85,
    playCount: 980,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:03:00.000Z'),
  },
  {
    id: 'song-4',
    title: 'Đi Giữa Trời Rực Rỡ',
    artist: 'Ngô Lan Hương',
    album: 'Bừng Sáng Năng Lượng',
    duration: 30,
    audioUrl: '/audio/song-4.wav',
    coverUrl: '/covers/cover-4.svg',
    lyricsUrl: '/lyrics/song-4.lrc',
    mood: 'energetic',
    moodLabel: 'Năng động & Phấn khởi',
    bpm: 115,
    playCount: 840,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:04:00.000Z'),
  },
  {
    id: 'song-5',
    title: 'Lofi Beats For Coding',
    artist: 'DMPTiFy Ambient',
    album: 'Deep Focus & Study',
    duration: 30,
    audioUrl: '/audio/song-5.wav',
    coverUrl: '/covers/cover-5.svg',
    lyricsUrl: '/lyrics/song-5.lrc',
    mood: 'focus',
    moodLabel: 'Tập trung cao độ',
    bpm: 72,
    playCount: 720,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:05:00.000Z'),
  },
];

export const INITIAL_USER_LIKED_SONG_IDS: string[] = [
  'song-1',
  'song-3',
  'song-5',
];

export const INITIAL_PLAYLISTS: SeedPlaylistRecord[] = [
  {
    id: 'pl-1',
    userId: DEMO_USER_ID,
    title: 'Vỗ Về Ngày Mưa',
    description:
      'Tuyển tập những giai điệu mộc mạc xoa dịu những chiều mưa u buồn',
    coverUrl: '/covers/cover-2.svg',
    mood: 'sad',
    isAiGenerated: true,
    isPublic: true,
    songIds: ['song-2'],
    createdAt: new Date('2026-11-18T00:01:00.000Z'),
  },
  {
    id: 'pl-2',
    userId: DEMO_USER_ID,
    title: 'Chill Cafe Cuối Tuần',
    description:
      'Thư giãn cùng tách cà phê và những bản Acoustic dịu êm',
    coverUrl: '/covers/cover-1.svg',
    mood: 'chill',
    isAiGenerated: false,
    isPublic: true,
    songIds: ['song-1', 'song-3'],
    createdAt: new Date('2026-11-18T00:02:00.000Z'),
  },
  {
    id: 'pl-3',
    userId: DEMO_USER_ID,
    title: 'Deep Focus Coding',
    description:
      'Sóng não Alpha BPM 70-75 hỗ trợ tập trung lập trình & ôn thi',
    coverUrl: '/covers/cover-5.svg',
    mood: 'focus',
    isAiGenerated: true,
    isPublic: true,
    songIds: ['song-5'],
    createdAt: new Date('2026-11-18T00:03:00.000Z'),
  },
  {
    id: 'pl-4',
    userId: DEMO_USER_ID,
    title: 'Sạc Đầy Năng Lượng',
    description:
      'Những giai điệu sôi động xua tan mệt mỏi cho ngày mới',
    coverUrl: '/covers/cover-4.svg',
    mood: 'energetic',
    isAiGenerated: false,
    isPublic: true,
    songIds: ['song-4'],
    createdAt: new Date('2026-11-18T00:04:00.000Z'),
  },
];

// Production / development V-Pop showcase catalog (verified studio streams + square album art).
export const VPOP_SHOWCASE_SONGS: SeedSongRecord[] = [
  {
    id: 'vpop-1',
    title: 'Đừng Làm Trái Tim Anh Đau',
    artist: 'Sơn Tùng M-TP',
    album: 'Đừng Làm Trái Tim Anh Đau (Single)',
    duration: 278,
    audioUrl: 'https://www.youtube.com/watch?v=bbVTzpI2njk',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e3/0b/38/e30b383e-5818-321a-7626-557b7b0f8ba3/24UMGIM61359.rgb.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'chill',
    moodLabel: 'Thư giãn & Chill',
    bpm: 100,
    playCount: 3450,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:01:00.000Z'),
  },
  {
    id: 'vpop-2',
    title: 'Chúng Ta Của Hiện Tại',
    artist: 'Sơn Tùng M-TP',
    album: 'Chúng Ta',
    duration: 303,
    audioUrl: 'https://www.youtube.com/watch?v=Z8pMSslQpKM',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/19/c5/b4/19c5b46f-62a3-e9aa-f9a1-ca3af338c1eb/24UMGIM48787.rgb.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'sad',
    moodLabel: 'U buồn & Hoài niệm',
    bpm: 76,
    playCount: 3280,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:02:00.000Z'),
  },
  {
    id: 'vpop-3',
    title: 'Chuyện Đôi Ta',
    artist: 'Emcee L ft. Muộii',
    album: 'Chuyện Đôi Ta (Single)',
    duration: 204,
    audioUrl: 'https://www.youtube.com/watch?v=BwWmzRQWex0',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/cb/30/16/cb301693-14d3-a03e-9e3d-fa4f6a20baf5/190296357480.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'chill',
    moodLabel: 'Thư giãn & Chill',
    bpm: 78,
    playCount: 2940,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:03:00.000Z'),
  },
  {
    id: 'vpop-4',
    title: 'Bước Qua Nhau',
    artist: 'Vũ.',
    album: 'Một Vạn Năm',
    duration: 252,
    audioUrl: 'https://www.youtube.com/watch?v=gqC_RcJD-Ho',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/08/a5/f6/08a5f654-e62a-704f-db92-eedca8fea651/190296352317.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'sad',
    moodLabel: 'U buồn & Hoài niệm',
    bpm: 70,
    playCount: 2790,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:04:00.000Z'),
  },
  {
    id: 'vpop-5',
    title: 'Nàng Thơ',
    artist: 'Hoàng Dũng',
    album: '25',
    duration: 255,
    audioUrl: 'https://www.youtube.com/watch?v=0SJAzTGh1SE',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/c9/64/54/c964545a-6f25-53e1-5ea9-8aef0749704c/190296180927.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'acoustic',
    moodLabel: 'Mộc mạc & Thư thái',
    bpm: 80,
    playCount: 2680,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:05:00.000Z'),
  },
  {
    id: 'vpop-6',
    title: 'Mưa Tháng Sáu',
    artist: 'Văn Mai Hương',
    album: 'Minh Tinh',
    duration: 261,
    audioUrl: 'https://www.youtube.com/watch?v=dNNpfmUpxck',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/1c/83/c9/1c83c94e-0f7b-66b6-031b-b590c182ace4/197338709351.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'sad',
    moodLabel: 'U buồn & Hoài niệm',
    bpm: 68,
    playCount: 2450,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:06:00.000Z'),
  },
  {
    id: 'vpop-7',
    title: 'Ánh Sao Và Bầu Trời',
    artist: 'T.R.I',
    album: 'Ánh Sao Và Bầu Trời (Single)',
    duration: 258,
    audioUrl: 'https://www.youtube.com/watch?v=9vaLkYElidg',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/00/b0/60/00b060c0-b9fe-57bc-7627-94a66a158fe9/190296486593.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'acoustic',
    moodLabel: 'Mộc mạc & Thư thái',
    bpm: 85,
    playCount: 2310,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:07:00.000Z'),
  },
  {
    id: 'vpop-8',
    title: 'Có Chắc Yêu Là Đây',
    artist: 'Sơn Tùng M-TP',
    album: 'Chúng Ta',
    duration: 216,
    audioUrl: 'https://www.youtube.com/watch?v=rg5cPEf18IU',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/38/66/29/38662963-6827-88c3-23c8-28571ceeb1a2/23UM1IM08525.rgb.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'chill',
    moodLabel: 'Thư giãn & Chill',
    bpm: 94,
    playCount: 2890,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:08:00.000Z'),
  },
  {
    id: 'vpop-9',
    title: 'Ngày Đầu Tiên',
    artist: 'Đức Phúc',
    album: 'Ngày Đầu Tiên (Single)',
    duration: 209,
    audioUrl: 'https://www.youtube.com/watch?v=R6aQJWWWTy4',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/51/60/16/51601607-1a01-d11f-6692-50f3fe4c5565/886449882595.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'chill',
    moodLabel: 'Thư giãn & Chill',
    bpm: 86,
    playCount: 1920,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:09:00.000Z'),
  },
  {
    id: 'vpop-10',
    title: 'Hẹn Một Mai',
    artist: 'Bùi Anh Tuấn',
    album: '4 Năm, 2 Chàng, 1 Tình Yêu',
    duration: 280,
    audioUrl: 'https://www.youtube.com/watch?v=tdV_jKCrRUo',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/2f/c6/be/2fc6bee5-8109-1175-8676-8d5d823dec5c/cover.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'sad',
    moodLabel: 'U buồn & Hoài niệm',
    bpm: 66,
    playCount: 1760,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:10:00.000Z'),
  },
  {
    id: 'vpop-11',
    title: 'Tháng Tư Là Lời Nói Dối Của Em',
    artist: 'Hà Anh Tuấn',
    album: 'Fragile',
    duration: 311,
    audioUrl: 'https://www.youtube.com/watch?v=kdLfaZPrIHY',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/a4/1e/87/a41e8763-8d49-e47a-2dc2-598f7fee8218/190296317842.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'acoustic',
    moodLabel: 'Mộc mạc & Thư thái',
    bpm: 76,
    playCount: 2640,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:11:00.000Z'),
  },
  {
    id: 'vpop-12',
    title: 'See Tình',
    artist: 'Hoàng Thùy Linh',
    album: 'LINK',
    duration: 186,
    audioUrl: 'https://www.youtube.com/watch?v=UfMEtjxzpBk',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/80/bc/67/80bc6745-2237-0025-d13e-fb1874b2b39a/886449935581.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'energetic',
    moodLabel: 'Năng động & Phấn khởi',
    bpm: 118,
    playCount: 3120,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:12:00.000Z'),
  },
  {
    id: 'vpop-13',
    title: 'Bài Này Chill Phết',
    artist: 'Đen ft. MIN',
    album: 'Đen ft. MIN (Single)',
    duration: 277,
    audioUrl: 'https://www.youtube.com/watch?v=xEXyWsgk9EY',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/5a/37/c8/5a37c86e-2ca3-48e0-04b5-d47a175dd651/cover.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'chill',
    moodLabel: 'Thư giãn & Chill',
    bpm: 88,
    playCount: 2580,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:13:00.000Z'),
  },
  {
    id: 'vpop-14',
    title: 'Không Thể Say',
    artist: 'HIEUTHUHAI',
    album: 'Ai Cũng Phải Bắt Đầu Từ Đâu Đó',
    duration: 228,
    audioUrl: 'https://www.youtube.com/watch?v=d6pgocXnK8U',
    coverUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/28/fa/35/28fa35d2-5d80-cbd8-690e-a1313a4c3c34/602455711786_Cover.jpg/600x600bb.jpg',
    lyricsUrl: '',
    mood: 'energetic',
    moodLabel: 'Năng động & Phấn khởi',
    bpm: 110,
    playCount: 2750,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:14:00.000Z'),
  },
  {
    id: 'vpop-15',
    title: 'Lạ Lùng',
    artist: 'Vũ.',
    album: 'Hành Tinh Song Song',
    duration: 262,
    audioUrl: 'https://www.youtube.com/watch?v=gQL9Uq0sLw8',
    coverUrl: 'https://i.ytimg.com/vi/gQL9Uq0sLw8/maxresdefault.jpg',
    lyricsUrl: '',
    mood: 'focus',
    moodLabel: 'Tập trung cao độ',
    bpm: 75,
    playCount: 3820,
    isVipOnly: false,
    createdAt: new Date('2026-11-18T00:15:00.000Z'),
  },
];

export const VPOP_INITIAL_LIKED_SONG_IDS: string[] = [];

export const SEED_PLAYLISTS: SeedPlaylistRecord[] = [];

export const VPOP_SHOWCASE_PLAYLISTS: SeedPlaylistRecord[] = SEED_PLAYLISTS;

export const MOOD_DEFAULT_COVER: Record<MoodType, string> = {
  chill:
    'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e3/0b/38/e30b383e-5818-321a-7626-557b7b0f8ba3/24UMGIM61359.rgb.jpg/600x600bb.jpg',
  sad:
    'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/19/c5/b4/19c5b46f-62a3-e9aa-f9a1-ca3af338c1eb/24UMGIM48787.rgb.jpg/600x600bb.jpg',
  acoustic:
    'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/c9/64/54/c964545a-6f25-53e1-5ea9-8aef0749704c/190296180927.jpg/600x600bb.jpg',
  energetic:
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/80/bc/67/80bc6745-2237-0025-d13e-fb1874b2b39a/886449935581.jpg/600x600bb.jpg',
  focus: 'https://i.ytimg.com/vi/roWTJfex8Ks/maxresdefault.jpg',
};
