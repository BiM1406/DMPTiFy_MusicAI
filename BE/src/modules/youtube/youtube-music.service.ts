import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import type { MoodType, SongDto } from '../../common/types/domain.types.js';
import { AppConfigService } from '../../config/env.config.js';
import { DatabaseService } from '../../database/database.service.js';
import {
  MOOD_DEFAULT_COVER,
  VPOP_SHOWCASE_SONGS,
} from '../../database/seed-data.js';
import {
  ItunesCoverService,
  toSquare600ArtworkUrl,
} from './itunes-cover.service.js';

export interface YouTubeSearchOptions {
  mood?: MoodType;
  maxResults?: number;
  userId?: string;
  allowInTest?: boolean;
}

interface YouTubeSearchItem {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YouTubeSearchApiResponse {
  items?: YouTubeSearchItem[];
}

interface YouTubeVideoThumbnails {
  maxres?: { url?: string };
  standard?: { url?: string };
  high?: { url?: string };
  medium?: { url?: string };
  default?: { url?: string };
}

interface YouTubeVideosApiResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      thumbnails?: YouTubeVideoThumbnails;
    };
    contentDetails?: {
      duration?: string;
    };
  }>;
}

interface VideoMetadata {
  durationSec?: number;
  thumbnail16x9Url?: string;
}

interface ItunesSearchPayload {
  resultCount?: number;
  results?: Array<{
    trackId?: number;
    trackName?: string;
    artistName?: string;
    collectionName?: string;
    artworkUrl100?: string;
    trackTimeMillis?: number;
    previewUrl?: string;
  }>;
}

interface SearchCacheEntry {
  songs: SongDto[];
  expiresAt: number;
}

const YOUTUBE_SEARCH_CACHE_TTL_MS = 30 * 60 * 1000;
const YOUTUBE_TIMEOUT_MS = 5000;
const VALID_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const PRESERVED_UPPER_TOKENS = new Set([
  'M-TP',
  'OST',
  'DJ',
  'MC',
  'GREY',
  'T.R.I',
  'MIN',
  'HIEUTHUHAI',
  'TYGA',
  'V-POP',
  'US-UK',
  'K-POP',
  'R&B',
  'EDM',
  'II',
  'III',
]);

const LOWERCASE_CONNECTORS = new Set(['ft.', 'feat.', 'ft', 'feat', 'x']);

const MOOD_PROFILES: Record<MoodType, { moodLabel: string; bpm: number }> = {
  chill: { moodLabel: 'Thư giãn & Chill', bpm: 78 },
  sad: { moodLabel: 'U buồn & Hoài niệm', bpm: 68 },
  energetic: { moodLabel: 'Năng động & Phấn khởi', bpm: 115 },
  focus: { moodLabel: 'Tập trung cao độ', bpm: 72 },
  acoustic: { moodLabel: 'Mộc mạc & Thư thái', bpm: 82 },
};

function decodeHtmlEntities(input: string): string {
  return input
    .replaceAll('&amp;', '&')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function normalizeCompactCompare(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function extractPrimaryArtistForMatch(input: string): string {
  return input.split(/\s+(?:x|ft\.?|feat\.?|&|,)\s+/i)[0]?.trim() ?? input;
}

function matchesArtistName(segment: string, channelArtist: string): boolean {
  if (!channelArtist || channelArtist === 'YouTube Music') {
    return false;
  }
  const normChannel = normalizeCompactCompare(channelArtist);
  const normFull = normalizeCompactCompare(segment);
  const normPrimary = normalizeCompactCompare(
    extractPrimaryArtistForMatch(segment),
  );
  if (!normChannel || normChannel.length < 2) {
    return false;
  }
  return [normFull, normPrimary].some(
    (cand) =>
      cand.length >= 2 &&
      (cand === normChannel ||
        (Math.min(cand.length, normChannel.length) >= 4 &&
          (cand.includes(normChannel) || normChannel.includes(cand)))),
  );
}

function toSmartTitleCase(input: string): string {
  const tokens = input.split(/\s+/);
  const allCapsTokens = tokens.filter(
    (token) =>
      token.length >= 2 &&
      token === token.toUpperCase() &&
      /\p{Lu}/u.test(token) &&
      !PRESERVED_UPPER_TOKENS.has(token.toUpperCase()),
  );
  if (allCapsTokens.length < 2) {
    return input;
  }

  return tokens
    .map((token) => {
      const upper = token.toUpperCase();
      if (PRESERVED_UPPER_TOKENS.has(upper)) {
        return upper;
      }
      if (LOWERCASE_CONNECTORS.has(token.toLowerCase())) {
        return token.toLowerCase();
      }
      if (token !== token.toUpperCase() || !/\p{L}/u.test(token)) {
        return token;
      }
      return token.replace(
        /^([^\p{L}]*)(\p{L})(\p{L}*)(.*)$/u,
        (_m, prefix: string, first: string, rest: string, suffix: string) =>
          `${prefix}${first.toUpperCase()}${rest.toLowerCase()}${suffix.toLowerCase()}`,
      );
    })
    .join(' ');
}

function pickBetterArtistLabel(segment: string, channelArtist: string): string {
  if (/\P{ASCII}/u.test(segment)) {
    return toSmartTitleCase(segment);
  }
  if (/\P{ASCII}/u.test(channelArtist)) {
    return channelArtist;
  }
  return toSmartTitleCase(segment);
}

function titleMatchesExpected(
  rawTitle?: string | null,
  expectedTitle?: string | null,
): boolean {
  if (!rawTitle || !expectedTitle) {
    return false;
  }
  const normExpected = normalizeCompactCompare(
    expectedTitle.replace(/\([^)]*\)|\[[^\]]*\]/g, ' '),
  );
  const normCandidate = normalizeCompactCompare(decodeHtmlEntities(rawTitle));
  if (!normExpected || !normCandidate) {
    return false;
  }
  if (normCandidate.includes(normExpected)) {
    return true;
  }
  const cleanWords = expectedTitle
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
  if (cleanWords.length === 0) {
    return false;
  }
  const normCandSpaced = decodeHtmlEntities(rawTitle)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
  const hits = cleanWords.filter((w) => normCandSpaced.includes(w)).length;
  return hits / cleanWords.length >= 0.75;
}

export function isCompilationOrJunkVideo(
  rawTitle?: string | null,
  durationSec?: number,
): boolean {
  if (
    typeof durationSec === 'number' &&
    durationSec > 0 &&
    (durationSec < 65 || durationSec > 600)
  ) {
    return true;
  }
  const decoded = decodeHtmlEntities(rawTitle ?? '');
  return /(những\s+bản\s+hit|tổng\s*hợp|liên\s*khúc|nonstop|playlist|full\s*album|1\s*hour|1\s*tiếng|2\s*tiếng|mashup|teaser|trailer|karaoke|beat\s*chuẩn|reaction|making\s*of|tự\s*học|hướng\s*dẫn|hợp\s*âm)/i.test(
    decoded,
  );
}

export function scoreAudioCandidate(
  rawTitle?: string | null,
  channelTitle?: string | null,
  durationSec?: number,
  targetStudioDurationSec?: number,
  expectedTitle?: string,
): number {
  const title = decodeHtmlEntities(rawTitle ?? '');
  const channel = decodeHtmlEntities(channelTitle ?? '');
  let score = 0;

  if (/\s*-\s*topic$/i.test(channel)) {
    score += 60;
  } else if (/official/i.test(channel)) {
    score += 30;
  }

  if (/official\s+audio|\(audio\)|\[audio\]|\|\s*audio|lyric\s*video/i.test(title)) {
    score += 25;
  }
  if (/official\s+(?:music\s+video|mv|m\/v)/i.test(title)) {
    score -= 10;
  }

  const wantsVariant = expectedTitle ?? '';
  if (!/(live|concert|tour)/i.test(wantsVariant) && /\b(live|live\s+session|concert|tour|in\s+the\s+moonlight)\b/i.test(title)) {
    score -= 70;
  }
  if (!/(remix|tiktok|lofi|speed|slowed)/i.test(wantsVariant) && /\b(remix|tiktok|speed\s*up|slowed|nightcore|lofi)\b/i.test(title)) {
    score -= 80;
  }
  if (!/(cover|piano|acoustic|guitar)/i.test(wantsVariant) && /\b(cover)\b/i.test(title)) {
    score -= 50;
  }
  if (expectedTitle && !titleMatchesExpected(title, expectedTitle)) {
    score -= 120;
  }

  if (
    typeof targetStudioDurationSec === 'number' &&
    targetStudioDurationSec > 0 &&
    typeof durationSec === 'number' &&
    durationSec > 0
  ) {
    const absDiff = Math.abs(durationSec - targetStudioDurationSec);
    if (absDiff <= 6) {
      score += 45;
    } else if (absDiff <= 15) {
      score += 20;
    } else if (absDiff > 22) {
      score -= 70;
    }
  }

  return score;
}

export function parseIso8601Duration(iso?: string | null): number {
  if (!iso || typeof iso !== 'string') {
    return 210;
  }
  const match = iso.trim().match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) {
    return 210;
  }
  const hours = Number.parseInt(match[1] ?? '0', 10);
  const minutes = Number.parseInt(match[2] ?? '0', 10);
  const seconds = Number.parseInt(match[3] ?? '0', 10);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : 210;
}

export function cleanYouTubeArtist(channelTitle?: string | null): string {
  const decoded = decodeHtmlEntities(channelTitle ?? '');
  const cleaned = decoded
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\s*vevo$/i, '')
    .replace(/\s+official(?:\s+channel)?$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || 'YouTube Music';
}

export function cleanYouTubeTitle(
  rawTitle?: string | null,
  channelTitle?: string | null,
): { title: string; artist: string } {
  const artistFromChannel = cleanYouTubeArtist(channelTitle);
  const decoded = decodeHtmlEntities(rawTitle ?? '');

  let title = decoded
    .replace(
      /\([^)]*(?:official|music\s*video|lyric|lyrics|audio|mv|m\/v|hd|4k|visualizer|vietsub|karaoke|full\s*hd|live\s*session|prod\.?|ost|teaser|trailer)[^)]*\)|\[[^\]]*(?:official|music\s*video|lyric|lyrics|audio|mv|m\/v|hd|4k|visualizer|vietsub|karaoke|full\s*hd|live\s*session|prod\.?|ost|teaser|trailer)[^\]]*\]/gi,
      ' ',
    )
    .replace(
      /\s*(?:\||-|–|—)\s*(?:official(?:\s+music)?(?:\s+mv|\s+m\/v|\s+audio|\s+video)?|lyrics?(?:\s+video)?|4k|hd|mv|m\/v|visualizer|ost).*$/i,
      '',
    )
    .replace(
      /\s+(?:official\s+(?:mv|m\/v|music\s+video|audio|lyric\s+video)|4k|hd)$/i,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–—|/]+|[\s\-–—|/]+$/g, '')
    .trim();

  let artist = artistFromChannel;

  const pipeParts = title
    .split(/\s*\|\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const parts =
    pipeParts.length >= 2
      ? [pipeParts[0], pipeParts.slice(1).join(' | ')]
      : title
          .split(/\s+(?:-|–|—)\s+/)
          .map((p) => p.trim())
          .filter(Boolean);

  if (parts.length === 2 && parts[0] && parts[1]) {
    const left = parts[0];
    const right = parts[1];

    if (matchesArtistName(left, artistFromChannel)) {
      artist =
        normalizeCompactCompare(left) ===
        normalizeCompactCompare(artistFromChannel)
          ? pickBetterArtistLabel(left, artistFromChannel)
          : toSmartTitleCase(left);
      title = right;
    } else if (matchesArtistName(right, artistFromChannel)) {
      title = left;
      artist =
        normalizeCompactCompare(right) ===
        normalizeCompactCompare(artistFromChannel)
          ? pickBetterArtistLabel(right, artistFromChannel)
          : toSmartTitleCase(right);
    } else if (pipeParts.length >= 2 && left.length <= 42) {
      artist = toSmartTitleCase(left);
      title = right;
    }
  }

  return {
    title: toSmartTitleCase(title) || 'Untitled Track',
    artist: toSmartTitleCase(artist) || 'YouTube Music',
  };
}

export function inferMoodProfile(
  title: string,
  artist: string,
  query = '',
  preferredMood?: MoodType,
): { mood: MoodType; moodLabel: string; bpm: number } {
  if (preferredMood && preferredMood in MOOD_PROFILES) {
    return { mood: preferredMood, ...MOOD_PROFILES[preferredMood] };
  }

  const haystack = `${title} ${artist} ${query}`.toLowerCase();
  if (
    /(lofi|study|coding|piano|instrumental|tập trung|không lời|alpha|ambient|deep focus)/.test(
      haystack,
    )
  ) {
    return { mood: 'focus', ...MOOD_PROFILES.focus };
  }
  if (
    /(buồn|mưa|khóc|chia tay|cô đơn|nhớ|hẹn một mai|bước qua nhau|thất tình|ballad|sad)/.test(
      haystack,
    )
  ) {
    return { mood: 'sad', ...MOOD_PROFILES.sad };
  }
  if (
    /(remix|edm|dance|party|quẩy|see tình|sôi động|năng lượng|workout|không thể say|energetic)/.test(
      haystack,
    )
  ) {
    return { mood: 'energetic', ...MOOD_PROFILES.energetic };
  }
  if (
    /(acoustic|mộc|guitar|unplugged|nàng thơ|tháng tư|nhẹ nhàng)/.test(haystack)
  ) {
    return { mood: 'acoustic', ...MOOD_PROFILES.acoustic };
  }
  return { mood: 'chill', ...MOOD_PROFILES.chill };
}

@Injectable()
export class YouTubeMusicService implements OnApplicationBootstrap {
  private readonly logger = new Logger(YouTubeMusicService.name);
  private readonly searchCache = new Map<string, SearchCacheEntry>();

  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ItunesCoverService) private readonly itunesCover: ItunesCoverService,
  ) {}

  onApplicationBootstrap(): void {
    const apiKey = this.config.youtubeApiKey?.trim() ?? '';
    if (this.config.nodeEnv !== 'test' && apiKey.length > 0) {
      void this.hydrateShowcaseSongs();
    }
  }

  async searchAndCacheTracks(
    query: string,
    options: YouTubeSearchOptions = {},
  ): Promise<SongDto[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }
    if (this.config.nodeEnv === 'test' && !options.allowInTest) {
      return [];
    }

    const maxResults = Math.max(1, Math.min(12, options.maxResults ?? 8));
    const cacheKey = `${trimmedQuery.toLowerCase()}|${options.mood ?? ''}|${maxResults}`;
    const now = Date.now();
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.songs;
    }

    const apiKey = this.config.youtubeApiKey?.trim() ?? '';
    if (!apiKey) {
      return this.searchItunesFallback(trimmedQuery, options, maxResults, cacheKey);
    }

    const fetchCount = Math.min(15, maxResults + 5);
    const searchUrl =
      'https://www.googleapis.com/youtube/v3/search' +
      `?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&regionCode=VN` +
      `&maxResults=${fetchCount}&q=${encodeURIComponent(trimmedQuery)}` +
      `&key=${encodeURIComponent(apiKey)}`;

    try {
      const searchRes = await fetch(searchUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(YOUTUBE_TIMEOUT_MS),
      });

      if (!searchRes.ok) {
        this.logger.warn(
          `YouTube Data API search failed with HTTP ${searchRes.status}, falling back to iTunes search...`,
        );
        return this.searchItunesFallback(
          trimmedQuery,
          options,
          maxResults,
          cacheKey,
        );
      }

      const searchPayload = (await searchRes.json()) as YouTubeSearchApiResponse;
      const validItems = (searchPayload.items ?? []).filter((item) => {
        const videoId = item.id?.videoId?.trim() ?? '';
        return (
          VALID_VIDEO_ID_REGEX.test(videoId) &&
          !isCompilationOrJunkVideo(item.snippet?.title)
        );
      });

      if (validItems.length === 0) {
        return this.searchItunesFallback(
          trimmedQuery,
          options,
          maxResults,
          cacheKey,
        );
      }

      const videoIds = Array.from(
        new Set(validItems.map((item) => item.id?.videoId?.trim() as string)),
      );
      const metadataMap = await this.fetchVideoMetadata(videoIds, apiKey);

      const candidates = await Promise.all(
        validItems.map(async (item, index) => {
          const videoId = item.id?.videoId?.trim() as string;
          const meta = metadataMap.get(videoId);
          const duration = meta?.durationSec;
          if (isCompilationOrJunkVideo(item.snippet?.title, duration)) {
            return null;
          }

          const cleaned = cleanYouTubeTitle(
            item.snippet?.title,
            item.snippet?.channelTitle,
          );
          const itunesMeta = await this.itunesCover.findTrackMetadata(
            cleaned.title,
            cleaned.artist,
          );
          const fallbackThumb =
            meta?.thumbnail16x9Url ??
            item.snippet?.thumbnails?.medium?.url ??
            `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
          const coverUrl = itunesMeta?.coverUrl ?? fallbackThumb;
          const moodProfile = inferMoodProfile(
            cleaned.title,
            cleaned.artist,
            trimmedQuery,
            options.mood,
          );
          const qualityScore =
            scoreAudioCandidate(
              item.snippet?.title,
              item.snippet?.channelTitle,
              duration,
              itunesMeta?.durationSec,
            ) + (itunesMeta ? 25 : 0);

          return {
            index,
            qualityScore,
            payload: {
              id: `yt-${videoId}`,
              title: cleaned.title,
              artist: cleaned.artist,
              album: itunesMeta?.albumName ?? 'YouTube Music',
              duration: duration ?? 210,
              audioUrl: `https://www.youtube.com/watch?v=${videoId}`,
              youtubeVideoId: videoId,
              coverUrl,
              mood: moodProfile.mood,
              moodLabel: moodProfile.moodLabel,
              bpm: moodProfile.bpm,
              playCount: 0,
              isVipOnly: false,
            },
          };
        }),
      );

      const ranked = candidates
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .sort((a, b) => {
          const aTier = a.qualityScore >= 0 ? 1 : 0;
          const bTier = b.qualityScore >= 0 ? 1 : 0;
          if (aTier !== bTier) {
            return bTier - aTier;
          }
          return a.index - b.index;
        })
        .slice(0, maxResults);

      const songs = await Promise.all(
        ranked.map((entry) =>
          this.database.upsertSong(entry.payload, options.userId),
        ),
      );

      this.searchCache.set(cacheKey, {
        songs,
        expiresAt: now + YOUTUBE_SEARCH_CACHE_TTL_MS,
      });

      return songs;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `YouTube search error for "${trimmedQuery}": ${reason}, falling back to iTunes search...`,
      );
      return this.searchItunesFallback(
        trimmedQuery,
        options,
        maxResults,
        cacheKey,
      );
    }
  }

  private async resolveYoutubeVideoIdForQuery(
    searchQuery: string,
  ): Promise<string | undefined> {
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        return undefined;
      }
      const html = await res.text();
      const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  private async searchItunesFallback(
    query: string,
    options: YouTubeSearchOptions = {},
    maxResults = 8,
    cacheKey?: string,
  ): Promise<SongDto[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    const limit = Math.max(10, maxResults);
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(trimmedQuery)}&entity=song&limit=${limit}&country=VN`;

    try {
      const itunesRes = await fetch(itunesUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      });

      if (!itunesRes.ok) {
        this.logger.warn(
          `iTunes fallback search returned HTTP ${itunesRes.status} for "${trimmedQuery}"`,
        );
        return [];
      }

      const payload = (await itunesRes.json()) as ItunesSearchPayload;
      const validResults = (payload.results ?? []).filter(
        (item) => item.trackName && item.trackName.trim().length > 0,
      );

      if (validResults.length === 0) {
        return [];
      }

      const targetItems = validResults.slice(0, maxResults);

      const songs = await Promise.all(
        targetItems.map(async (item, index) => {
          const rawTitle = item.trackName?.trim() || 'Untitled Track';
          const rawArtist = item.artistName?.trim() || 'Unknown Artist';
          const cleanTitle = toSmartTitleCase(rawTitle);
          const cleanArtist = toSmartTitleCase(rawArtist);
          const album = item.collectionName?.trim() || 'Single';
          const duration = Math.max(
            30,
            Math.round((item.trackTimeMillis ?? 210000) / 1000),
          );
          const moodProfile = inferMoodProfile(
            cleanTitle,
            cleanArtist,
            trimmedQuery,
            options.mood,
          );
          const coverUrl =
            (item.artworkUrl100
              ? toSquare600ArtworkUrl(item.artworkUrl100)
              : null) || MOOD_DEFAULT_COVER[moodProfile.mood];

          // Resolve YouTube playback video ID or valid playable format
          const searchQuery = `${cleanTitle} ${cleanArtist} Official Audio`;
          const videoId = await this.resolveYoutubeVideoIdForQuery(searchQuery);

          const id = videoId
            ? `yt-${videoId}`
            : item.trackId
              ? `itunes-${item.trackId}`
              : `itunes-${index + 1}`;

          const audioUrl = videoId
            ? `https://www.youtube.com/watch?v=${videoId}`
            : item.previewUrl?.trim() ||
              `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

          return this.database.upsertSong(
            {
              id,
              title: cleanTitle,
              artist: cleanArtist,
              album,
              duration,
              audioUrl,
              ...(videoId ? { youtubeVideoId: videoId } : {}),
              coverUrl,
              mood: moodProfile.mood,
              moodLabel: moodProfile.moodLabel,
              bpm: moodProfile.bpm,
              playCount: 0,
              isVipOnly: false,
            },
            options.userId,
          );
        }),
      );

      if (cacheKey && songs.length > 0) {
        this.searchCache.set(cacheKey, {
          songs,
          expiresAt: Date.now() + YOUTUBE_SEARCH_CACHE_TTL_MS,
        });
      }

      return songs;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `iTunes fallback search failed for "${trimmedQuery}": ${reason}`,
      );
      return [];
    }
  }

  async resolveAlternativeEmbeddable(
    song: SongDto,
    userId?: string,
    options: { allowInTest?: boolean } = {},
  ): Promise<SongDto> {
    const apiKey = this.config.youtubeApiKey?.trim() ?? '';
    if (!apiKey) {
      return song;
    }
    if (this.config.nodeEnv === 'test' && !options.allowInTest) {
      return song;
    }

    const query = `${song.title} ${song.artist} Official Audio`.trim();
    const searchUrl =
      'https://www.googleapis.com/youtube/v3/search' +
      `?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&regionCode=VN` +
      `&maxResults=5&q=${encodeURIComponent(query)}` +
      `&key=${encodeURIComponent(apiKey)}`;

    try {
      const searchRes = await fetch(searchUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(YOUTUBE_TIMEOUT_MS),
      });
      if (!searchRes.ok) {
        this.logger.warn(
          `YouTube alternative embeddable search returned HTTP ${searchRes.status}, trying HTML scrape fallback...`,
        );
        const fallbackId = await this.resolveYoutubeVideoIdForQuery(query);
        if (fallbackId && fallbackId !== song.youtubeVideoId) {
          const updated = await this.database.updateSongMedia(
            song.id,
            {
              audioUrl: `https://www.youtube.com/watch?v=${fallbackId}`,
              youtubeVideoId: fallbackId,
            },
            userId,
          );
          return updated ?? song;
        }
        return song;
      }

      const payload = (await searchRes.json()) as YouTubeSearchApiResponse;
      const validAlternatives = (payload.items ?? []).filter((item) => {
        const videoId = item.id?.videoId?.trim() ?? '';
        return (
          VALID_VIDEO_ID_REGEX.test(videoId) &&
          videoId !== song.youtubeVideoId &&
          !isCompilationOrJunkVideo(item.snippet?.title)
        );
      });

      if (validAlternatives.length === 0) {
        return song;
      }

      const altIds = validAlternatives.map(
        (item) => item.id?.videoId?.trim() as string,
      );
      const metadataMap = await this.fetchVideoMetadata(altIds, apiKey);
      const scored = validAlternatives
        .map((item, idx) => {
          const id = item.id?.videoId?.trim() as string;
          const meta = metadataMap.get(id);
          return {
            item,
            id,
            meta,
            idx,
            score: scoreAudioCandidate(
              item.snippet?.title,
              item.snippet?.channelTitle,
              meta?.durationSec,
              song.duration,
            ),
          };
        })
        .filter(
          (cand) =>
            !isCompilationOrJunkVideo(
              cand.item.snippet?.title,
              cand.meta?.durationSec,
            ),
        )
        .sort((a, b) => b.score - a.score || a.idx - b.idx);

      const best = scored[0];
      if (!best) {
        return song;
      }

      const duration = best.meta?.durationSec;
      const needsSquareCover =
        !song.coverUrl ||
        song.coverUrl.startsWith('/covers/') ||
        song.coverUrl.includes('ytimg.com');
      const itunesMeta = needsSquareCover
        ? await this.itunesCover.findTrackMetadata(song.title, song.artist)
        : null;
      const nextCoverUrl = needsSquareCover
        ? (itunesMeta?.coverUrl ??
          best.meta?.thumbnail16x9Url ??
          `https://i.ytimg.com/vi/${best.id}/mqdefault.jpg`)
        : undefined;

      const updated = await this.database.updateSongMedia(
        song.id,
        {
          audioUrl: `https://www.youtube.com/watch?v=${best.id}`,
          youtubeVideoId: best.id,
          ...(duration ? { duration } : {}),
          ...(nextCoverUrl ? { coverUrl: nextCoverUrl } : {}),
        },
        userId,
      );

      return updated ?? song;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to resolve alternative embeddable video for ${song.id}: ${reason}`,
      );
      try {
        const fallbackId = await this.resolveYoutubeVideoIdForQuery(query);
        if (fallbackId && fallbackId !== song.youtubeVideoId) {
          const updated = await this.database.updateSongMedia(
            song.id,
            {
              audioUrl: `https://www.youtube.com/watch?v=${fallbackId}`,
              youtubeVideoId: fallbackId,
            },
            userId,
          );
          return updated ?? song;
        }
      } catch {
        // Ignore fallback error
      }
      return song;
    }
  }

  async hydrateShowcaseSongs(): Promise<void> {
    const apiKey = this.config.youtubeApiKey?.trim() ?? '';
    if (!apiKey) {
      return;
    }

    try {
      for (const showcase of VPOP_SHOWCASE_SONGS) {
        try {
          const existing = await this.database.findSongById(showcase.id);
          if (!existing) {
            continue;
          }

          if (
            existing.youtubeVideoId &&
            existing.coverUrl &&
            !existing.coverUrl.startsWith('/covers/') &&
            !existing.coverUrl.includes('hqdefault.jpg')
          ) {
            continue;
          }

          const itunesMeta = await this.itunesCover.findTrackMetadata(
            showcase.title,
            showcase.artist,
          );
          const studioDuration = itunesMeta?.durationSec;
          const mvDurationMismatch =
            Boolean(studioDuration) &&
            Boolean(existing.youtubeVideoId) &&
            Math.abs(existing.duration - (studioDuration ?? 0)) > 20;

          let videoId = mvDurationMismatch ? undefined : existing.youtubeVideoId;
          let duration = mvDurationMismatch ? undefined : existing.duration;
          let fallback16x9: string | undefined;

          if (!videoId) {
            const query = `${showcase.title} ${showcase.artist}`.trim();
            const searchUrl =
              'https://www.googleapis.com/youtube/v3/search' +
              `?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&regionCode=VN` +
              `&maxResults=8&q=${encodeURIComponent(query)}` +
              `&key=${encodeURIComponent(apiKey)}`;

            const searchRes = await fetch(searchUrl, {
              headers: { Accept: 'application/json' },
              signal: AbortSignal.timeout(YOUTUBE_TIMEOUT_MS),
            });

            if (searchRes.status === 403 || searchRes.status === 429) {
              this.logger.warn(
                `YouTube quota/rate limit (${searchRes.status}) during showcase hydration; stopping remaining YouTube lookups.`,
              );
              break;
            }
            if (searchRes.ok) {
              const payload =
                (await searchRes.json()) as YouTubeSearchApiResponse;
              const candidates = (payload.items ?? []).filter((item) => {
                const candidateId = item.id?.videoId?.trim() ?? '';
                return (
                  VALID_VIDEO_ID_REGEX.test(candidateId) &&
                  !isCompilationOrJunkVideo(item.snippet?.title)
                );
              });

              const candidateIds = candidates.map(
                (item) => item.id?.videoId?.trim() as string,
              );
              const metaMap = await this.fetchVideoMetadata(candidateIds, apiKey);

              const best = candidates
                .map((item, idx) => {
                  const id = item.id?.videoId?.trim() as string;
                  const meta = metaMap.get(id);
                  return {
                    item,
                    id,
                    meta,
                    idx,
                    score: scoreAudioCandidate(
                      item.snippet?.title,
                      item.snippet?.channelTitle,
                      meta?.durationSec,
                      studioDuration,
                      showcase.title,
                    ),
                  };
                })
                .filter(
                  (entry) =>
                    !isCompilationOrJunkVideo(
                      entry.item.snippet?.title,
                      entry.meta?.durationSec,
                    ),
                )
                .sort((a, b) => b.score - a.score || a.idx - b.idx)[0];

              if (best) {
                videoId = best.id;
                duration = best.meta?.durationSec;
                fallback16x9 =
                  best.meta?.thumbnail16x9Url ??
                  best.item.snippet?.thumbnails?.medium?.url;
              }
            }
          }

          const coverUrl =
            itunesMeta?.coverUrl ??
            fallback16x9 ??
            (videoId
              ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
              : undefined);

          if (videoId || coverUrl) {
            await this.database.updateSongMedia(showcase.id, {
              ...(videoId
                ? {
                    audioUrl: `https://www.youtube.com/watch?v=${videoId}`,
                    youtubeVideoId: videoId,
                  }
                : {}),
              ...(coverUrl ? { coverUrl } : {}),
              ...(duration ? { duration } : {}),
            });
          }
        } catch (songError) {
          const reason =
            songError instanceof Error ? songError.message : String(songError);
          this.logger.warn(
            `Showcase hydration skipped for ${showcase.id}: ${reason}`,
          );
        }
      }

      await this.database.refreshPlaylistCoversFromFirstSong();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Showcase hydration aborted cleanly: ${reason}`);
    }
  }

  private async fetchVideoMetadata(
    videoIds: string[],
    apiKey: string,
  ): Promise<Map<string, VideoMetadata>> {
    const metadataMap = new Map<string, VideoMetadata>();
    if (videoIds.length === 0) {
      return metadataMap;
    }

    const videosUrl =
      'https://www.googleapis.com/youtube/v3/videos' +
      `?part=contentDetails,snippet&id=${encodeURIComponent(videoIds.join(','))}` +
      `&key=${encodeURIComponent(apiKey)}`;

    try {
      const res = await fetch(videosUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(YOUTUBE_TIMEOUT_MS),
      });
      if (!res.ok) {
        this.logger.warn(
          `YouTube videos metadata returned HTTP ${res.status}`,
        );
        return metadataMap;
      }

      const payload = (await res.json()) as YouTubeVideosApiResponse;
      for (const item of payload.items ?? []) {
        if (!item.id) {
          continue;
        }
        const thumbs = item.snippet?.thumbnails;
        const thumbnail16x9Url =
          thumbs?.maxres?.url ?? thumbs?.medium?.url ?? undefined;
        metadataMap.set(item.id, {
          durationSec: item.contentDetails?.duration
            ? parseIso8601Duration(item.contentDetails.duration)
            : undefined,
          thumbnail16x9Url,
        });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`YouTube videos metadata lookup failed: ${reason}`);
    }

    return metadataMap;
  }
}
