export interface YouTubePlayerVars {
  autoplay?: 0 | 1;
  controls?: 0 | 1;
  disablekb?: 0 | 1;
  enablejsapi?: 0 | 1;
  fs?: 0 | 1;
  modestbranding?: 0 | 1;
  origin?: string;
  playsinline?: 0 | 1;
  rel?: 0 | 1;
}

export interface YouTubePlayerEvent {
  target: YouTubePlayerInstance;
  data: number;
}

export interface YouTubePlayerOptions {
  width?: string | number;
  height?: string | number;
  videoId?: string;
  playerVars?: YouTubePlayerVars;
  events?: {
    onReady?: (event: { target: YouTubePlayerInstance }) => void;
    onStateChange?: (event: YouTubePlayerEvent) => void;
    onError?: (event: YouTubePlayerEvent) => void;
  };
}

export interface YouTubePlayerInstance {
  loadVideoById(videoId: string, startSeconds?: number): void;
  cueVideoById(videoId: string, startSeconds?: number): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

export interface YouTubeIframeNamespace {
  Player: new (
    elementId: string | HTMLElement,
    options: YouTubePlayerOptions,
  ) => YouTubePlayerInstance;
  PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
}

declare global {
  interface Window {
    YT?: YouTubeIframeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YOUTUBE_IFRAME_API_URL = 'https://www.youtube.com/iframe_api';
const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{6,32}$/;
const YOUTUBE_URL_PATTERN =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,32})/i;

let ytApiPromise: Promise<YouTubeIframeNamespace | null> | null = null;

function extractYoutubeIdFromUrl(rawUrl?: string | null): string | null {
  if (typeof rawUrl !== 'string') {
    return null;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(YOUTUBE_URL_PATTERN);
  return match && match[1] ? match[1] : null;
}

/**
 * Extracts a YouTube video ID from either a Song-like object (`youtubeVideoId` / `audioUrl`)
 * or a raw YouTube URL string (`watch?v=`, `youtu.be/`, `embed/`).
 */
export function extractYoutubeVideoId(
  songOrUrl?: { youtubeVideoId?: string; audioUrl?: string } | string | null,
): string | null {
  if (!songOrUrl) {
    return null;
  }

  if (typeof songOrUrl === 'string') {
    return extractYoutubeIdFromUrl(songOrUrl);
  }

  if (typeof songOrUrl.youtubeVideoId === 'string') {
    const rawId = songOrUrl.youtubeVideoId.trim();
    if (rawId) {
      if (YOUTUBE_VIDEO_ID_PATTERN.test(rawId)) {
        return rawId;
      }
      const fromFieldUrl = extractYoutubeIdFromUrl(rawId);
      if (fromFieldUrl) {
        return fromFieldUrl;
      }
    }
  }

  return extractYoutubeIdFromUrl(songOrUrl.audioUrl);
}

/**
 * Singleton loader for the YouTube IFrame Player API (`https://www.youtube.com/iframe_api`).
 * Returns `null` safely in SSR or Node VM environments without DOM globals.
 */
export function loadYouTubeIframeApi(): Promise<YouTubeIframeNamespace | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT);
  }

  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise<YouTubeIframeNamespace | null>((resolve) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finish = (yt: YouTubeIframeNamespace | null) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutId !== null && typeof clearTimeout === 'function') {
        clearTimeout(timeoutId);
      }
      if (!yt || typeof yt.Player !== 'function') {
        ytApiPromise = null;
        resolve(null);
        return;
      }
      resolve(yt);
    };

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') {
        try {
          prevReady();
        } catch {
          // Ignore third-party callback failures.
        }
      }
      finish(window.YT ?? null);
    };

    if (typeof setTimeout === 'function') {
      timeoutId = setTimeout(() => {
        finish(window.YT && typeof window.YT.Player === 'function' ? window.YT : null);
      }, 12000);
    }

    try {
      const existingScript =
        typeof document.querySelector === 'function'
          ? document.querySelector(`script[src="${YOUTUBE_IFRAME_API_URL}"]`)
          : null;

      if (existingScript) {
        if (window.YT && typeof window.YT.Player === 'function') {
          finish(window.YT);
          return;
        }
        if (typeof existingScript.addEventListener === 'function') {
          existingScript.addEventListener('error', () => finish(null), {
            once: true,
          });
        }
        return;
      }

      const script = document.createElement('script');
      script.src = YOUTUBE_IFRAME_API_URL;
      script.async = true;
      script.onerror = () => finish(null);
      const container = document.head ?? document.body ?? document.documentElement;
      if (!container) {
        finish(null);
        return;
      }
      container.appendChild(script);
    } catch {
      finish(null);
    }
  });

  return ytApiPromise;
}
