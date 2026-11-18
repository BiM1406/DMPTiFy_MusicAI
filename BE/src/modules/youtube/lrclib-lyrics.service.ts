import { Injectable, Logger } from '@nestjs/common';
import type { LyricLineDto } from '../../common/types/domain.types.js';
import { parseLrcLines } from './lrc-parser.util.js';

export interface ResolvedLyricsResult {
  isSynced: boolean;
  rawLrc: string;
  plainLyrics: string | null;
  lines: LyricLineDto[];
}

interface LrclibRecord {
  id?: number;
  trackName?: string;
  artistName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

interface LyricsOvhResponse {
  lyrics?: string;
}

interface CacheEntry {
  value: ResolvedLyricsResult | null;
  expiresAt: number;
}

const LYRICS_CACHE_TTL_MS = 30 * 60 * 1000;
const LYRICS_TIMEOUT_MS = 4000;
const LRCLIB_USER_AGENT = 'DMPTiFy/1.0 (https://dmptify.local)';

function normalizeCompare(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractPrimaryArtist(artist: string): string {
  return artist
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+(?:ft\.?|feat\.?|x|,|&|\|)\s+/i)[0]
    .trim();
}

function toPlainLyricsResult(plainText: string): ResolvedLyricsResult | null {
  const normalized = plainText.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return null;
  }
  const nonEmptyLines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (nonEmptyLines.length === 0) {
    return null;
  }
  return {
    isSynced: false,
    rawLrc: '',
    plainLyrics: normalized,
    lines: nonEmptyLines.map((text) => ({ time: 0, text })),
  };
}

function recordMatchesQuery(
  record: LrclibRecord,
  cleanTitle: string,
  cleanArtist: string,
): boolean {
  const normQueryArtist = cleanArtist
    ? normalizeCompare(extractPrimaryArtist(cleanArtist))
    : '';
  const normRecordArtist = normalizeCompare(record.artistName ?? '');

  if (normQueryArtist) {
    if (!normRecordArtist) {
      return false;
    }
    const qCompact = normQueryArtist.replace(/\s+/g, '');
    const rCompact = normRecordArtist.replace(/\s+/g, '');
    const artistMatched =
      normRecordArtist === normQueryArtist ||
      qCompact === rCompact ||
      (qCompact.length >= 4 &&
        (rCompact.includes(qCompact) || qCompact.includes(rCompact)));
    if (!artistMatched) {
      return false;
    }
  }

  const normQueryTitle = normalizeCompare(
    cleanTitle.replace(/\([^)]*\)|\[[^\]]*\]/g, ' '),
  );
  const normRecordTitle = normalizeCompare(
    (record.trackName ?? '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' '),
  );
  if (!normQueryTitle || !normRecordTitle) {
    return true;
  }

  const queryWords = normQueryTitle.split(/\s+/).filter((w) => w.length >= 2);
  const recordWordSet = new Set(normRecordTitle.split(/\s+/).filter(Boolean));
  if (queryWords.length === 0) {
    return normRecordTitle.includes(normQueryTitle);
  }
  const matchedWords = queryWords.filter((w) => recordWordSet.has(w)).length;
  return matchedWords / queryWords.length >= 0.5;
}

function selectLrclibRecord(
  records: LrclibRecord[],
  cleanTitle: string,
  cleanArtist: string,
  targetDurationSec?: number,
): ResolvedLyricsResult | null {
  const vocalRecords = records.filter((record) => record.instrumental !== true);
  if (vocalRecords.length === 0) {
    return null;
  }

  const artistMatched = cleanArtist
    ? vocalRecords.filter((record) =>
        recordMatchesQuery(record, cleanTitle, cleanArtist),
      )
    : vocalRecords;
  const pool = artistMatched.length > 0 ? artistMatched : vocalRecords;

  const syncedCandidates: Array<{
    record: LrclibRecord;
    lines: LyricLineDto[];
    diff: number;
    index: number;
  }> = [];

  for (let i = 0; i < pool.length; i++) {
    const record = pool[i];
    if (typeof record.syncedLyrics === 'string' && record.syncedLyrics.trim()) {
      const lines = parseLrcLines(record.syncedLyrics);
      if (lines.length > 0) {
        const diff =
          typeof targetDurationSec === 'number' &&
          targetDurationSec > 0 &&
          typeof record.duration === 'number' &&
          record.duration > 0
            ? Math.abs(record.duration - targetDurationSec)
            : Number.MAX_SAFE_INTEGER;
        syncedCandidates.push({ record, lines, diff, index: i });
      }
    }
  }

  if (syncedCandidates.length > 0) {
    if (typeof targetDurationSec === 'number' && targetDurationSec > 0) {
      syncedCandidates.sort((a, b) => a.diff - b.diff || a.index - b.index);
    }
    const best = syncedCandidates[0];
    const plainLyrics =
      typeof best.record.plainLyrics === 'string' && best.record.plainLyrics.trim()
        ? best.record.plainLyrics.trim()
        : null;
    return {
      isSynced: true,
      rawLrc: (best.record.syncedLyrics ?? '').trim(),
      plainLyrics,
      lines: best.lines,
    };
  }

  for (const record of pool) {
    if (typeof record.plainLyrics === 'string' && record.plainLyrics.trim()) {
      const plainResult = toPlainLyricsResult(record.plainLyrics);
      if (plainResult) {
        return plainResult;
      }
    }
  }

  return null;
}

@Injectable()
export class LrclibLyricsService {
  private readonly logger = new Logger(LrclibLyricsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  async findLyrics(
    title: string,
    artist?: string,
    targetDurationSec?: number,
  ): Promise<ResolvedLyricsResult | null> {
    const stripped = title.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').trim();
    const cleanTitle = stripped || title.trim();
    const cleanArtist = (artist ?? '').trim();
    if (!cleanTitle) {
      return null;
    }

    const durBucket =
      typeof targetDurationSec === 'number' && targetDurationSec > 0
        ? Math.round(targetDurationSec / 5) * 5
        : 0;
    const cacheKey = `${cleanTitle.toLowerCase()}|${cleanArtist.toLowerCase()}|${durBucket}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    let resolved: ResolvedLyricsResult | null = null;
    const primaryArtist = cleanArtist ? extractPrimaryArtist(cleanArtist) : '';

    if (primaryArtist) {
      const exactUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(primaryArtist)}`;
      resolved = await this.queryLrclib(
        exactUrl,
        cleanTitle,
        primaryArtist,
        targetDurationSec,
      );
    }

    if (!resolved) {
      const qTerm = [cleanTitle, primaryArtist].filter(Boolean).join(' ');
      const fallbackUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(qTerm)}`;
      resolved = await this.queryLrclib(
        fallbackUrl,
        cleanTitle,
        primaryArtist,
        targetDurationSec,
      );
    }

    if (!resolved && primaryArtist) {
      resolved = await this.queryLyricsOvh(cleanTitle, primaryArtist);
    }

    this.cache.set(cacheKey, {
      value: resolved,
      expiresAt: now + LYRICS_CACHE_TTL_MS,
    });
    return resolved;
  }

  private async queryLrclib(
    url: string,
    cleanTitle: string,
    cleanArtist: string,
    targetDurationSec?: number,
  ): Promise<ResolvedLyricsResult | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': LRCLIB_USER_AGENT,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(LYRICS_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(`LRCLIB search returned HTTP ${response.status}`);
        return null;
      }

      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload)) {
        return null;
      }
      return selectLrclibRecord(
        payload as LrclibRecord[],
        cleanTitle,
        cleanArtist,
        targetDurationSec,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`LRCLIB search failed: ${reason}`);
      return null;
    }
  }

  private async queryLyricsOvh(
    title: string,
    artist: string,
  ): Promise<ResolvedLyricsResult | null> {
    if (!title || !artist) {
      return null;
    }
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(LYRICS_TIMEOUT_MS),
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as LyricsOvhResponse;
      if (typeof payload.lyrics === 'string') {
        return toPlainLyricsResult(payload.lyrics);
      }
      return null;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`lyrics.ovh lookup failed: ${reason}`);
      return null;
    }
  }
}
