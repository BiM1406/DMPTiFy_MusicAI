import { Injectable, Logger } from '@nestjs/common';

interface ItunesSearchResultItem {
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
}

interface ItunesSearchResponse {
  resultCount?: number;
  results?: ItunesSearchResultItem[];
}

export interface ItunesTrackMetadata {
  coverUrl: string;
  durationSec?: number;
  albumName?: string;
}

interface CacheEntry {
  value: ItunesTrackMetadata | null;
  expiresAt: number;
}

const ITUNES_CACHE_TTL_MS = 30 * 60 * 1000;
const ITUNES_TIMEOUT_MS = 2500;

export function toSquare600ArtworkUrl(artworkUrl: string): string {
  const trimmed = artworkUrl.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (/\d+x\d+bb(?:\.[a-z0-9]+)?(?=\?|$)/i.test(trimmed)) {
    return trimmed.replace(
      /\d+x\d+bb(?:\.[a-z0-9]+)?(?=\?|$)/i,
      '600x600bb.jpg',
    );
  }
  return trimmed.replace(/\/\d+x\d+[^/?]*(\?.*)?$/i, '/600x600bb.jpg$1');
}

function normalizeMatchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function stripNoisyTitleTags(value: string): string {
  return value
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\s+(?:ft\.?|feat\.?|prod\.?(?:\s+by)?)\s+.*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function splitArtistSegments(artist: string): string[] {
  return artist
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s*(?:,|&|\+|\||\/|\s+ft\.?\s+|\s+feat\.?\s+|\s+x\s+)\s*/i)
    .map((part) => normalizeMatchText(part))
    .filter((part) => part.length >= 2);
}

function extractPrimaryArtist(artist: string): string {
  return artist
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+(?:ft\.?|feat\.?|x|&|,|\|)\s+/i)[0]
    .trim();
}

function artistsMatch(queryArtist: string, candidateArtist: string): boolean {
  const normalizedQuery = normalizeMatchText(queryArtist);
  if (!normalizedQuery || normalizedQuery === 'youtube music') {
    return true;
  }

  const querySegments = splitArtistSegments(queryArtist);
  const candidateSegments = splitArtistSegments(candidateArtist);
  if (querySegments.length === 0 || candidateSegments.length === 0) {
    return false;
  }

  for (const qSeg of querySegments) {
    const qCompact = qSeg.replace(/\s+/g, '');
    for (const cSeg of candidateSegments) {
      const cCompact = cSeg.replace(/\s+/g, '');
      if (qSeg === cSeg || qCompact === cCompact) {
        return true;
      }
      if (
        qCompact.length >= 4 &&
        cCompact.length >= 4 &&
        (cCompact.includes(qCompact) || qCompact.includes(cCompact))
      ) {
        return true;
      }
    }
  }

  return false;
}

function titlesMatch(queryTitle: string, candidateTitle: string): boolean {
  const normQuery = normalizeMatchText(stripNoisyTitleTags(queryTitle));
  const normCandidate = normalizeMatchText(stripNoisyTitleTags(candidateTitle));
  if (!normQuery || !normCandidate) {
    return false;
  }
  if (normQuery === normCandidate) {
    return true;
  }

  const queryWords = normQuery.split(/\s+/).filter(Boolean);
  const candidateWords = normCandidate.split(/\s+/).filter(Boolean);
  if (queryWords.length === 0 || candidateWords.length === 0) {
    return false;
  }

  const [shorter, longer] =
    queryWords.length <= candidateWords.length
      ? [queryWords, candidateWords]
      : [candidateWords, queryWords];

  const longerSet = new Set(longer);
  const allShortPresent = shorter.every((word) => longerSet.has(word));
  if (!allShortPresent) {
    return false;
  }

  const sigShorter = shorter.filter((w) => w.length >= 2);
  const sigLonger = longer.filter((w) => w.length >= 2);
  const minCount = sigShorter.length || shorter.length;
  const maxCount = sigLonger.length || longer.length;
  return maxCount > 0 && minCount / maxCount >= 0.6;
}

@Injectable()
export class ItunesCoverService {
  private readonly logger = new Logger(ItunesCoverService.name);
  private readonly cache = new Map<string, CacheEntry>();

  async findSquareCover(title: string, artist?: string): Promise<string | null> {
    const metadata = await this.findTrackMetadata(title, artist);
    return metadata?.coverUrl ?? null;
  }

  async findTrackMetadata(
    title: string,
    artist?: string,
  ): Promise<ItunesTrackMetadata | null> {
    const cleanTitle = stripNoisyTitleTags(title);
    const cleanArtist = (artist ?? '').trim();
    const primaryArtist =
      cleanArtist && normalizeMatchText(cleanArtist) !== 'youtube music'
        ? extractPrimaryArtist(cleanArtist)
        : '';

    if (!cleanTitle && !primaryArtist) {
      return null;
    }

    const cacheKey = `${normalizeMatchText(cleanTitle)}|${normalizeMatchText(cleanArtist)}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const term = [cleanTitle, primaryArtist].filter(Boolean).join(' ');
    const endpoint = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=vn&entity=song&limit=8`;

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(ITUNES_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(`iTunes cover lookup failed with HTTP ${response.status}`);
        return null;
      }

      const payload = (await response.json()) as ItunesSearchResponse;
      const results = Array.isArray(payload.results) ? payload.results : [];
      const bestMatch = this.pickBestMatch(results, cleanTitle, cleanArtist);

      const metadata: ItunesTrackMetadata | null = bestMatch?.artworkUrl100
        ? {
            coverUrl: toSquare600ArtworkUrl(bestMatch.artworkUrl100),
            ...(typeof bestMatch.trackTimeMillis === 'number' &&
            bestMatch.trackTimeMillis > 0
              ? { durationSec: Math.round(bestMatch.trackTimeMillis / 1000) }
              : {}),
            ...(typeof bestMatch.collectionName === 'string' &&
            bestMatch.collectionName.trim()
              ? { albumName: bestMatch.collectionName.trim() }
              : {}),
          }
        : null;

      this.cache.set(cacheKey, {
        value: metadata,
        expiresAt: now + ITUNES_CACHE_TTL_MS,
      });
      return metadata;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`iTunes cover lookup error for "${term}": ${reason}`);
      return null;
    }
  }

  private pickBestMatch(
    results: ItunesSearchResultItem[],
    title: string,
    artist: string,
  ): ItunesSearchResultItem | undefined {
    const withArt = results.filter(
      (item) =>
        typeof item.artworkUrl100 === 'string' &&
        item.artworkUrl100.trim().length > 0,
    );
    if (withArt.length === 0) {
      return undefined;
    }

    return withArt.find((item) => {
      const artistMatches = artistsMatch(artist, item.artistName ?? '');
      const titleMatches = titlesMatch(title, item.trackName ?? '');
      return artistMatches && titleMatches;
    });
  }
}
