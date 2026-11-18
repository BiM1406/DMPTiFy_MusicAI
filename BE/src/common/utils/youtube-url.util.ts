const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts an 11-character YouTube video ID from watch, shortlink, or embed URLs.
 */
export function extractYoutubeVideoId(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') {
    return undefined;
  }

  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('/')) {
    return undefined;
  }

  const normalizedUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\//i.test(
          trimmed,
        )
      ? `https://${trimmed}`
      : trimmed;

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return undefined;
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'youtu.be') {
    const candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    return YOUTUBE_VIDEO_ID_REGEX.test(candidate) ? candidate : undefined;
  }

  const isYoutubeHost =
    host === 'youtube.com' ||
    host.endsWith('.youtube.com') ||
    host === 'youtube-nocookie.com' ||
    host.endsWith('.youtube-nocookie.com');
  if (!isYoutubeHost) {
    return undefined;
  }

  const watchParam = parsed.searchParams.get('v')?.trim() ?? '';
  if (YOUTUBE_VIDEO_ID_REGEX.test(watchParam)) {
    return watchParam;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (
    segments.length >= 2 &&
    (segments[0] === 'embed' ||
      segments[0] === 'v' ||
      segments[0] === 'shorts' ||
      segments[0] === 'live')
  ) {
    const candidate = segments[1];
    return YOUTUBE_VIDEO_ID_REGEX.test(candidate) ? candidate : undefined;
  }

  return undefined;
}

export function isYoutubeUrl(url?: string | null): boolean {
  return extractYoutubeVideoId(url) !== undefined;
}
