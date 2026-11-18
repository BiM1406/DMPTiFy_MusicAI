import type { LyricLineDto } from '../../common/types/domain.types.js';

const LRC_LINE_REGEX = /\[(\d{1,3}):(\d{2})\.(\d{2,3})\](.*)/;

export function parseLrcLines(rawLrc: string): LyricLineDto[] {
  const parsed: LyricLineDto[] = [];
  const rawLines = rawLrc.split(/\r?\n/);

  for (const rawLine of rawLines) {
    const match = rawLine.trim().match(LRC_LINE_REGEX);
    if (!match) {
      continue;
    }

    const minutes = Number.parseInt(match[1], 10);
    const seconds = Number.parseInt(match[2], 10);
    const rawFrac = match[3];
    const fractional =
      rawFrac.length === 3
        ? Number.parseInt(rawFrac, 10) / 1000
        : Number.parseInt(rawFrac, 10) / 100;

    const time = Number((minutes * 60 + seconds + fractional).toFixed(3));
    parsed.push({
      time,
      text: match[4].trim(),
    });
  }

  return parsed.sort((a, b) => a.time - b.time);
}
