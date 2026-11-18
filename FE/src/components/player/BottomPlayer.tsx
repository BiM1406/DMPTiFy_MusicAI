'use client';

import React, { useRef, useEffect, useState, useCallback, type CSSProperties } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Mic2,
  MessageCircle,
  PictureInPicture2,
  Layers,
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { CoverImage } from '../common/CoverImage';
import { resolveEmbeddableSong } from '../../lib/api-client';
import { useTabVisibility } from '../../hooks/useTabVisibility';
import { FloatingMiniPip } from './FloatingMiniPip';
import {
  extractYoutubeVideoId,
  loadYouTubeIframeApi,
  type YouTubePlayerInstance,
} from '../../lib/youtube';

const YT_RECOVERY_ERROR_CODES = new Set([2, 5, 100, 101, 150]);

/**
 * Spotify-style Crossfade settings badge and duration slider popover
 */
const CrossfadeControl: React.FC = () => {
  const crossfadeEnabled = useAudioStore((s) => s.crossfadeEnabled);
  const crossfadeDuration = useAudioStore((s) => s.crossfadeDuration);
  const isCrossfading = useAudioStore((s) => s.isCrossfading);
  const toggleCrossfade = useAudioStore((s) => s.toggleCrossfade);
  const setCrossfadeDuration = useAudioStore((s) => s.setCrossfadeDuration);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        onClick={toggleCrossfade}
        aria-label={
          crossfadeEnabled
            ? `Tắt chuyển bài mượt (${crossfadeDuration}s)`
            : 'Bật chuyển bài mượt'
        }
        title={
          crossfadeEnabled
            ? `Crossfade ${crossfadeDuration}s đang bật`
            : 'Bật Crossfade chuyển bài mượt'
        }
        aria-pressed={crossfadeEnabled}
        className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95 ${
          crossfadeEnabled && crossfadeDuration > 0
            ? 'text-emerald-500 font-semibold bg-emerald-500/10'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
        }`}
      >
        <Layers
          size={18}
          className={
            isCrossfading ? 'motion-safe:animate-pulse text-emerald-400' : ''
          }
        />
      </button>

      {/* Duration Badge & Popover Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Cài đặt thời gian hòa âm Crossfade"
        title="Chỉnh thời gian hòa âm (0s - 12s)"
        aria-expanded={isOpen}
        className={`-ml-2 flex h-6 items-center px-1.5 rounded-full text-[11px] font-mono font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95 ${
          crossfadeEnabled && crossfadeDuration > 0
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30'
            : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/15'
        }`}
      >
        {crossfadeEnabled && crossfadeDuration > 0 ? `${crossfadeDuration}s` : '0s'}
      </button>

      {/* Popover Slider Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Cài đặt chuyển bài mượt Crossfade"
          className="absolute bottom-full mb-2 right-0 z-50 w-64 rounded-xl border border-border-hairline bg-surface-raised p-3 shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              Hòa âm Crossfade
            </span>
            <span className="text-xs font-mono font-bold text-emerald-500">
              {crossfadeEnabled && crossfadeDuration > 0
                ? `${crossfadeDuration} giây`
                : 'Tắt'}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-tight">
            Chuyển bài mượt không khoảng lặng theo tiêu chuẩn Spotify Dual-Deck.
          </p>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">0s</span>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={crossfadeEnabled ? crossfadeDuration : 0}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setCrossfadeDuration(val);
              }}
              aria-label="Thời gian hòa âm Crossfade (giây)"
              className="player-range flex-1 cursor-pointer accent-emerald-500"
              style={
                {
                  '--range-progress': `${
                    ((crossfadeEnabled ? crossfadeDuration : 0) / 12) * 100
                  }%`,
                } as CSSProperties
              }
            />
            <span className="text-[10px] font-mono text-slate-400">12s</span>
          </div>

          <div className="mt-2.5 flex justify-between items-center pt-2 border-t border-border-hairline text-[11px]">
            <button
              type="button"
              onClick={toggleCrossfade}
              className={`font-medium transition-colors ${
                crossfadeEnabled
                  ? 'text-emerald-500 hover:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              {crossfadeEnabled ? 'Đang bật' : 'Đang tắt'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const BottomPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dual-Deck Architecture: Deck A and Deck B
  const activeDeckRef = useRef<'A' | 'B'>('A');
  const playerARef = useRef<YouTubePlayerInstance | null>(null);
  const playerBRef = useRef<YouTubePlayerInstance | null>(null);
  const readyARef = useRef(false);
  const readyBRef = useRef(false);
  const loadedVideoIdARef = useRef<string | null>(null);
  const loadedVideoIdBRef = useRef<string | null>(null);

  const isCrossfadingRef = useRef(false);
  const isBlendingRef = useRef(false);
  const crossfadeTriggeredRef = useRef<string | null>(null);
  const recoveryAttemptedSongIdRef = useRef<string | null>(null);
  const ytErroredRef = useRef(false);

  // Audio Handshake State:
  // Outgoing track NEVER stops until incoming track is confirmed outputting audio stream (onStateChange === 1).
  const handshakeActiveRef = useRef(false);
  const handshakeBlendingRef = useRef(false);
  const blendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handshakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { showInTabMiniPlayer, openDocumentPip, closeMiniPlayer } =
    useTabVisibility();

  const currentSong = useAudioStore((s) => s.currentSong);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const currentTime = useAudioStore((s) => s.currentTime);
  const duration = useAudioStore((s) => s.duration);
  const volume = useAudioStore((s) => s.volume);
  const isMuted = useAudioStore((s) => s.isMuted);
  const isShuffle = useAudioStore((s) => s.isShuffle);
  const repeatMode = useAudioStore((s) => s.repeatMode);
  const togglePlay = useAudioStore((s) => s.togglePlay);
  const nextSong = useAudioStore((s) => s.nextSong);
  const prevSong = useAudioStore((s) => s.prevSong);
  const setCurrentTime = useAudioStore((s) => s.setCurrentTime);
  const setDuration = useAudioStore((s) => s.setDuration);
  const setVolume = useAudioStore((s) => s.setVolume);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  const toggleShuffle = useAudioStore((s) => s.toggleShuffle);
  const toggleRepeat = useAudioStore((s) => s.toggleRepeat);
  const toggleLike = useAudioStore((s) => s.toggleLike);
  const toggleLyrics = useAudioStore((s) => s.toggleLyrics);
  const isLyricsOpen = useAudioStore((s) => s.isLyricsOpen);
  const toggleAiDrawer = useAudioStore((s) => s.toggleAiDrawer);
  const isAiDrawerOpen = useAudioStore((s) => s.isAiDrawerOpen);
  const seekTarget = useAudioStore((s) => s.seekTarget);
  const clearSeekTarget = useAudioStore((s) => s.clearSeekTarget);
  const playbackError = useAudioStore((s) => s.playbackError);
  const setPlaybackError = useAudioStore((s) => s.setPlaybackError);
  const playbackRequest = useAudioStore((s) => s.playbackRequest);
  const crossfadeDuration = useAudioStore((s) => s.crossfadeDuration);

  const songId = currentSong?.id;
  const ytVideoId = extractYoutubeVideoId(currentSong);
  const hasYtVideo = Boolean(ytVideoId);

  // Deck accessor helpers
  const getActivePlayer = () =>
    activeDeckRef.current === 'A' ? playerARef.current : playerBRef.current;
  const getInactivePlayer = () =>
    activeDeckRef.current === 'A' ? playerBRef.current : playerARef.current;
  const isActiveReady = () =>
    activeDeckRef.current === 'A' ? readyARef.current : readyBRef.current;
  const isInactiveReady = () =>
    activeDeckRef.current === 'A' ? readyBRef.current : readyARef.current;

  // Retrieve upcoming track in the queue: queue[(currentIndex + 1) % queue.length]
  const getUpcomingSong = useCallback(() => {
    const { queue, currentSong: activeSong, repeatMode: activeRepeat } =
      useAudioStore.getState();
    if (!queue.length || !activeSong) return null;
    if (activeRepeat === 'one') return activeSong;
    const currentIdx = queue.findIndex((s) => s.id === activeSong.id);
    if (currentIdx === -1) return queue[0] ?? null;
    if (currentIdx === queue.length - 1 && activeRepeat === 'off') return null;
    return queue[(currentIdx + 1) % queue.length] ?? null;
  }, []);

  // Pre-buffering: Inactive deck cues upcoming track in queue at 0 volume
  const prebufferNextTrack = useCallback(() => {
    const inactivePlayer = getInactivePlayer();
    const inactiveReady = isInactiveReady();
    if (!inactivePlayer || !inactiveReady) return;

    const upcoming = getUpcomingSong();
    if (!upcoming) return;

    const nextYtId = extractYoutubeVideoId(upcoming);
    if (!nextYtId) return;

    const inactiveDeck = activeDeckRef.current === 'A' ? 'B' : 'A';
    const inactiveLoadedRef =
      inactiveDeck === 'A' ? loadedVideoIdARef : loadedVideoIdBRef;

    if (inactiveLoadedRef.current !== nextYtId) {
      inactiveLoadedRef.current = nextYtId;
      try {
        inactivePlayer.setVolume(0);
        inactivePlayer.cueVideoById(nextYtId, 0);
      } catch {
        // Player may still be initializing
      }
    }
  }, [getUpcomingSong]);

  // Reset per-song error recovery state and seed initial YouTube duration
  useEffect(() => {
    recoveryAttemptedSongIdRef.current = null;
    ytErroredRef.current = false;
    const activeSong = useAudioStore.getState().currentSong;
    if (
      activeSong &&
      extractYoutubeVideoId(activeSong) &&
      activeSong.duration > 0
    ) {
      setDuration(activeSong.duration);
    }
  }, [songId, setDuration]);

  // Sync seekTarget from external triggers (Karaoke click, prevSong rewind, etc.)
  useEffect(() => {
    if (seekTarget === null) return;
    if (ytVideoId) {
      const activePlayer = getActivePlayer();
      if (activePlayer && isActiveReady()) {
        activePlayer.seekTo(seekTarget, true);
        clearSeekTarget();
      }
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = seekTarget;
      clearSeekTarget();
    }
  }, [seekTarget, clearSeekTarget, playbackRequest, ytVideoId]);

  // Sync native <audio> play/pause when playing local/direct audio assets
  useEffect(() => {
    if (!audioRef.current) return;
    if (ytVideoId) {
      audioRef.current.pause();
      return;
    }
    let cancelled = false;
    if (isPlaying) {
      if (audioRef.current.error) audioRef.current.load();
      audioRef.current.play().catch((err) => {
        if (!cancelled && err.name !== 'AbortError') {
          setPlaybackError(
            'Không phát được bài hát. Anh thử phát lại hoặc chọn bài khác nhé.',
          );
        }
      });
    } else {
      audioRef.current.pause();
    }
    return () => {
      cancelled = true;
    };
  }, [isPlaying, songId, playbackRequest, setPlaybackError, ytVideoId]);

  // Sync volume & mute across both engines and dual decks
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    const activePlayer = getActivePlayer();
    const inactivePlayer = getInactivePlayer();

    if (ytVideoId && activePlayer && isActiveReady()) {
      if (isMuted || volume === 0) {
        activePlayer.setVolume(0);
        activePlayer.mute();
      } else {
        activePlayer.unMute();
        if (!isCrossfadingRef.current && !isBlendingRef.current && !handshakeBlendingRef.current) {
          activePlayer.setVolume(Math.round(volume * 100));
        }
      }
    }

    if (inactivePlayer && isInactiveReady()) {
      try {
        inactivePlayer.setVolume(0);
        inactivePlayer.mute();
      } catch {
        // Ignore
      }
    }
  }, [volume, isMuted, ytVideoId]);

  // Audio Handshake (Sequential 2-Phase):
  // Phase 1: Fade-out outgoing player to 0% while incoming player is strictly HARD-MUTED.
  // Phase 2: Once outgoing reaches 0%, pause outgoing, switch active deck, unmute incoming and fade-in to base volume.
  // 100% Zero-Overlap, Zero-Leak.
  const executeSequentialHandshake = useCallback(
    (incomingDeck: 'A' | 'B', fadeOutSec: number, fadeInSec: number) => {
      if (blendTimerRef.current) {
        clearInterval(blendTimerRef.current);
        blendTimerRef.current = null;
      }
      if (handshakeTimeoutRef.current) {
        clearTimeout(handshakeTimeoutRef.current);
        handshakeTimeoutRef.current = null;
      }

      const outgoingPlayer = getActivePlayer();
      const incomingPlayer =
        incomingDeck === 'A' ? playerARef.current : playerBRef.current;

      const state = useAudioStore.getState();
      const baseVolume = state.isMuted ? 0 : state.volume;

      if (!outgoingPlayer || !incomingPlayer) {
        try {
          outgoingPlayer?.pauseVideo();
          outgoingPlayer?.setVolume(0);
          outgoingPlayer?.mute();
        } catch {
          // Ignore
        }
        activeDeckRef.current = incomingDeck;
        handshakeActiveRef.current = false;
        handshakeBlendingRef.current = false;
        isCrossfadingRef.current = false;
        isBlendingRef.current = false;
        useAudioStore.getState().setIsCrossfading(false);
        state.nextSong();
        return;
      }

      handshakeBlendingRef.current = true;
      useAudioStore.getState().setIsCrossfading(true);

      // Strictly hard-mute incoming player during Phase 1 to prevent any 1s YouTube audio leak
      try {
        incomingPlayer.mute();
        incomingPlayer.setVolume(0);
      } catch {
        // Ignore
      }

      // --- PHASE 1: Fade-out outgoing player ---
      const fadeOutMs = Math.max(400, fadeOutSec * 1000);
      const startFadeOut = Date.now();
      const initialOutVolume = baseVolume;

      blendTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startFadeOut;
        const progress = Math.min(1, elapsed / fadeOutMs);
        const vol = initialOutVolume * (1 - progress);

        try {
          outgoingPlayer.setVolume(Math.round(vol * 100));
          // Re-enforce mute on incoming just in case
          incomingPlayer.setVolume(0);
          incomingPlayer.mute();
        } catch {
          // Ignore transient volume set errors
        }

        if (progress >= 1) {
          if (blendTimerRef.current) {
            clearInterval(blendTimerRef.current);
            blendTimerRef.current = null;
          }

          // Complete Phase 1: Mute & pause outgoing
          try {
            outgoingPlayer.pauseVideo();
            outgoingPlayer.setVolume(0);
            outgoingPlayer.mute();
          } catch {
            // Ignore
          }

          // Swap active deck reference and advance store song
          activeDeckRef.current = incomingDeck;
          crossfadeTriggeredRef.current = null;
          useAudioStore.getState().nextSong();

          // --- PHASE 2: Fade-in incoming player ---
          const fadeInMs = Math.max(400, fadeInSec * 1000);
          const startFadeIn = Date.now();

          try {
            incomingPlayer.setVolume(0);
            incomingPlayer.unMute();
            incomingPlayer.playVideo();
          } catch {
            // Ignore
          }

          blendTimerRef.current = setInterval(() => {
            const inElapsed = Date.now() - startFadeIn;
            const inProgress = Math.min(1, inElapsed / fadeInMs);
            const inVol = baseVolume * inProgress;

            try {
              incomingPlayer.setVolume(Math.round(inVol * 100));
            } catch {
              // Ignore
            }

            if (inProgress >= 1) {
              if (blendTimerRef.current) {
                clearInterval(blendTimerRef.current);
                blendTimerRef.current = null;
              }
              try {
                incomingPlayer.setVolume(Math.round(baseVolume * 100));
              } catch {
                // Ignore
              }

              handshakeActiveRef.current = false;
              handshakeBlendingRef.current = false;
              isCrossfadingRef.current = false;
              isBlendingRef.current = false;
              useAudioStore.getState().setIsCrossfading(false);
            }
          }, 30);
        }
      }, 30);
    },
    [],
  );

  // Audio Handshake: Initiates preload on inactive player in HARD-MUTE mode and executes sequential transition
  const initiateAudioHandshake = useCallback(
    (trigger: 'auto' | 'manual', fadeOutSec: number, fadeInSec: number) => {
      if (handshakeActiveRef.current) return;

      const upcoming = getUpcomingSong();
      if (!upcoming) return;
      const nextYtId = extractYoutubeVideoId(upcoming);
      if (!nextYtId) return;

      const inactivePlayer = getInactivePlayer();
      if (!inactivePlayer || !isInactiveReady()) {
        if (trigger === 'manual') useAudioStore.getState().nextSong();
        return;
      }

      handshakeActiveRef.current = true;
      handshakeBlendingRef.current = false;
      const incomingDeck = activeDeckRef.current === 'A' ? 'B' : 'A';
      const incomingLoadedRef =
        incomingDeck === 'A' ? loadedVideoIdARef : loadedVideoIdBRef;

      // Strictly hard-mute before loading next video
      try {
        inactivePlayer.setVolume(0);
        inactivePlayer.mute();
      } catch {
        // Ignore
      }

      incomingLoadedRef.current = nextYtId;
      try {
        inactivePlayer.loadVideoById(nextYtId, 0);
      } catch {
        if (trigger === 'manual') useAudioStore.getState().nextSong();
        return;
      }

      executeSequentialHandshake(incomingDeck, fadeOutSec, fadeInSec);
    },
    [getUpcomingSong, executeSequentialHandshake],
  );

  // Mount & tear down Dual-Deck YouTube IFrame Players
  useEffect(() => {
    if (!hasYtVideo) {
      return;
    }

    let cancelled = false;
    let localPlayerA: YouTubePlayerInstance | null = null;
    let localPlayerB: YouTubePlayerInstance | null = null;

    const handleYtEnded = () => {
      const state = useAudioStore.getState();
      const activePlayer = getActivePlayer();
      const activeReady = isActiveReady();

      if (state.repeatMode === 'one') {
        if (activePlayer && activeReady) {
          activePlayer.seekTo(0, true);
          activePlayer.playVideo();
        }
        state.setCurrentTime(0);
        return;
      }

      const prevId = state.currentSong?.id;
      state.nextSong();
      const next = useAudioStore.getState();
      if (
        next.isPlaying &&
        next.currentSong?.id === prevId &&
        activePlayer &&
        activeReady
      ) {
        activePlayer.seekTo(0, true);
        activePlayer.playVideo();
        next.setCurrentTime(0);
      }
    };

    const handleYtError = async (errorCode: number) => {
      ytErroredRef.current = true;
      const state = useAudioStore.getState();
      const failingSong = state.currentSong;
      const failingYtId = extractYoutubeVideoId(failingSong);

      if (!failingSong || !YT_RECOVERY_ERROR_CODES.has(errorCode)) {
        state.setPlaybackError(
          'Không phát được bài hát này từ YouTube. Anh thử bài khác nhé.',
        );
        return;
      }

      if (recoveryAttemptedSongIdRef.current === failingSong.id) {
        state.setPlaybackError(
          'Không phát được bài hát này từ YouTube. Anh thử bài khác nhé.',
        );
        return;
      }

      recoveryAttemptedSongIdRef.current = failingSong.id;

      const recovered = await resolveEmbeddableSong(failingSong.id);
      if (cancelled) {
        return;
      }

      const latest = useAudioStore.getState();
      const recoveredYtId = extractYoutubeVideoId(recovered);
      if (recovered && recoveredYtId && recoveredYtId !== failingYtId) {
        latest.mergeSongsIntoCatalog([recovered]);
        if (latest.currentSong?.id === failingSong.id) {
          latest.playSong(recovered);
        }
        return;
      }

      if (latest.currentSong?.id === failingSong.id) {
        latest.setPlaybackError(
          'Không phát được bài hát này từ YouTube. Anh thử bài khác nhé.',
        );
      }
    };

    void loadYouTubeIframeApi().then((yt) => {
      if (cancelled) {
        return;
      }
      if (!yt || typeof yt.Player !== 'function') {
        setPlaybackError(
          'Không phát được bài hát này từ YouTube. Anh thử bài khác nhé.',
        );
        return;
      }

      const hostA =
        typeof document !== 'undefined'
          ? document.getElementById('dmptify-yt-player-a')
          : null;
      const hostB =
        typeof document !== 'undefined'
          ? document.getElementById('dmptify-yt-player-b')
          : null;
      if (!hostA || !hostB) {
        return;
      }

      readyARef.current = false;
      readyBRef.current = false;
      loadedVideoIdARef.current = null;
      loadedVideoIdBRef.current = null;

      const initDeck = (deck: 'A' | 'B', hostId: string) => {
        return new yt.Player(hostId, {
          width: '160',
          height: '90',
          playerVars: {
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              const player = event.target;
              if (deck === 'A') {
                playerARef.current = player;
                readyARef.current = true;
              } else {
                playerBRef.current = player;
                readyBRef.current = true;
              }
              ytErroredRef.current = false;

              const state = useAudioStore.getState();
              if (deck === activeDeckRef.current) {
                player.setVolume(Math.round(state.volume * 100));
                if (state.isMuted || state.volume === 0) {
                  player.mute();
                } else {
                  player.unMute();
                }

                const targetId = extractYoutubeVideoId(state.currentSong);
                if (targetId) {
                  const pendingSeek = state.seekTarget;
                  const startSeconds =
                    pendingSeek !== null && pendingSeek > 0 ? pendingSeek : 0;
                  if (pendingSeek !== null) {
                    state.clearSeekTarget();
                  }

                  if (deck === 'A') {
                    loadedVideoIdARef.current = targetId;
                  } else {
                    loadedVideoIdBRef.current = targetId;
                  }

                  if (state.isPlaying) {
                    player.loadVideoById(targetId, startSeconds);
                  } else {
                    player.cueVideoById(targetId, startSeconds);
                  }

                  const reportedDuration = player.getDuration();
                  if (
                    typeof reportedDuration === 'number' &&
                    reportedDuration > 0
                  ) {
                    state.setDuration(reportedDuration);
                  }
                }
              } else {
                // Inactive standby deck starts silent
                player.setVolume(0);
                prebufferNextTrack();
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const player = event.target;
              if (deck === activeDeckRef.current) {
                if (event.data === 1 || event.data === 5) {
                  const reportedDuration = player.getDuration();
                  if (
                    typeof reportedDuration === 'number' &&
                    reportedDuration > 0
                  ) {
                    useAudioStore.getState().setDuration(reportedDuration);
                  }
                }
                if (event.data === 0) {
                  if (!isCrossfadingRef.current && !handshakeActiveRef.current) {
                    handleYtEnded();
                  }
                }
              } else {
                // Inactive standby deck: strictly enforce hardware mute to kill any 1s YouTube audio leak
                try {
                  player.setVolume(0);
                  player.mute();
                } catch {
                  // Ignore
                }
              }
            },
            onError: (event) => {
              if (cancelled) return;
              if (deck === activeDeckRef.current) {
                void handleYtError(event.data);
              }
            },
          },
        });
      };

      localPlayerA = initDeck('A', 'dmptify-yt-player-a');
      localPlayerB = initDeck('B', 'dmptify-yt-player-b');
      playerARef.current = localPlayerA;
      playerBRef.current = localPlayerB;
    });

    return () => {
      cancelled = true;
      readyARef.current = false;
      readyBRef.current = false;
      loadedVideoIdARef.current = null;
      loadedVideoIdBRef.current = null;
      ytErroredRef.current = false;
      isCrossfadingRef.current = false;
      isBlendingRef.current = false;
      if (blendTimerRef.current) {
        clearInterval(blendTimerRef.current);
        blendTimerRef.current = null;
      }
      if (handshakeTimeoutRef.current) {
        clearTimeout(handshakeTimeoutRef.current);
        handshakeTimeoutRef.current = null;
      }
      handshakeActiveRef.current = false;
      handshakeBlendingRef.current = false;
      if (localPlayerA) {
        try {
          localPlayerA.destroy();
        } catch {
          // Ignore teardown errors
        }
      }
      if (localPlayerB) {
        try {
          localPlayerB.destroy();
        } catch {
          // Ignore teardown errors
        }
      }
      if (playerARef.current === localPlayerA) {
        playerARef.current = null;
      }
      if (playerBRef.current === localPlayerB) {
        playerBRef.current = null;
      }
    };
  }, [
    hasYtVideo,
    setPlaybackError,
    prebufferNextTrack,
  ]);

  // Sync YouTube track switches & play/pause once active player is ready
  useEffect(() => {
    if (!ytVideoId) return;
    const activePlayer = getActivePlayer();
    if (!activePlayer || !isActiveReady()) return;

    const activeDeck = activeDeckRef.current;
    const activeLoadedRef =
      activeDeck === 'A' ? loadedVideoIdARef : loadedVideoIdBRef;

    // If active player is already playing this video (e.g. smoothly transitioned via crossfade), do not restart
    if (activeLoadedRef.current !== ytVideoId) {
      activeLoadedRef.current = ytVideoId;
      ytErroredRef.current = false;
      isCrossfadingRef.current = false;
      useAudioStore.getState().setIsCrossfading(false);
      crossfadeTriggeredRef.current = null;

      const store = useAudioStore.getState();
      const startSeconds =
        store.seekTarget !== null && store.seekTarget > 0
          ? store.seekTarget
          : 0;
      if (store.seekTarget !== null) {
        store.clearSeekTarget();
      }
      store.setCurrentTime(startSeconds);

      const baseVolume = store.isMuted ? 0 : store.volume;
      activePlayer.setVolume(Math.round(baseVolume * 100));

      if (isPlaying) {
        activePlayer.loadVideoById(ytVideoId, startSeconds);
      } else {
        activePlayer.cueVideoById(ytVideoId, startSeconds);
      }

      prebufferNextTrack();
      return;
    }

    if (isPlaying) {
      if (ytErroredRef.current) {
        ytErroredRef.current = false;
        activePlayer.loadVideoById(ytVideoId);
      } else {
        activePlayer.playVideo();
      }
    } else {
      activePlayer.pauseVideo();
    }

    prebufferNextTrack();
  }, [ytVideoId, isPlaying, playbackRequest, songId, prebufferNextTrack]);

  // Dual-Deck Overlapping Equal-Power Crossfade & Polling Loop
  useEffect(() => {
    if (!ytVideoId || !isPlaying) {
      crossfadeTriggeredRef.current = null;
      isCrossfadingRef.current = false;
      useAudioStore.getState().setIsCrossfading(false);
      return;
    }

    const intervalId = setInterval(() => {
      const activePlayer = getActivePlayer();
      const activeReady = isActiveReady();
      const activeDeck = activeDeckRef.current;
      const activeLoaded =
        activeDeck === 'A'
          ? loadedVideoIdARef.current
          : loadedVideoIdBRef.current;

      if (!activePlayer || !activeReady || activeLoaded !== ytVideoId) {
        return;
      }

      const nextDuration = activePlayer.getDuration();
      if (
        typeof nextDuration === 'number' &&
        Number.isFinite(nextDuration) &&
        nextDuration > 0
      ) {
        if (Math.abs(useAudioStore.getState().duration - nextDuration) > 0.5) {
          setDuration(nextDuration);
        }
      }

      const playerState =
        typeof activePlayer.getPlayerState === 'function'
          ? activePlayer.getPlayerState()
          : 1;
      if (playerState !== 1) {
        return;
      }

      const nextTime = activePlayer.getCurrentTime();
      if (
        typeof nextTime !== 'number' ||
        !Number.isFinite(nextTime) ||
        nextTime < 0
      ) {
        return;
      }

      setCurrentTime(nextTime);

      const state = useAudioStore.getState();
      const curDuration = state.duration;
      const xfDuration = state.crossfadeDuration;
      const isXfEnabled = state.crossfadeEnabled && xfDuration > 0;

      // Sequential 2-Phase Handshake when entering last crossfadeDuration seconds:
      // Fade-out outgoing track completely to 0%, then fade-in incoming track from 0%.
      if (
        isXfEnabled &&
        curDuration > xfDuration * 2 &&
        nextTime >= curDuration - Math.min(xfDuration, 3.5)
      ) {
        if (!handshakeActiveRef.current && crossfadeTriggeredRef.current !== songId) {
          crossfadeTriggeredRef.current = songId ?? null;
          initiateAudioHandshake('auto', 2.0, 1.5);
        }
      } else if (!handshakeBlendingRef.current && !isBlendingRef.current) {
        if (!state.isMuted) {
          activePlayer.setVolume(Math.round(state.volume * 100));
        }
      }
    }, 200);

    return () => clearInterval(intervalId);
  }, [
    ytVideoId,
    isPlaying,
    setCurrentTime,
    setDuration,
    songId,
    initiateAudioHandshake,
  ]);

  // Manual Next Track Skip: Smooth Sequential Handshake (Fade out current -> Fade in next)
  const handleManualNext = () => {
    if (handshakeActiveRef.current) return;

    const state = useAudioStore.getState();
    if (!state.isPlaying || !ytVideoId) {
      state.nextSong();
      return;
    }

    initiateAudioHandshake('manual', 0.6, 1.0);
  };

  // Time update event handler for native audio
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Loaded metadata event handler for native audio
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 30);
    }
  };

  // Seekbar change handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (ytVideoId) {
      const activePlayer = getActivePlayer();
      if (activePlayer && isActiveReady()) {
        activePlayer.seekTo(newTime, true);
        const curDuration = duration || 30;
        const xfDuration = crossfadeDuration;
        if (newTime < curDuration - xfDuration && isCrossfadingRef.current) {
          isCrossfadingRef.current = false;
          useAudioStore.getState().setIsCrossfading(false);
          const inactivePlayer = getInactivePlayer();
          try {
            inactivePlayer?.pauseVideo();
            inactivePlayer?.setVolume(0);
          } catch {
            // Ignore
          }
          prebufferNextTrack();
        }
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  // Song end handler for native audio
  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current
          .play()
          .catch(() => setPlaybackError('Không thể phát lại bài hát.'));
      }
    } else {
      nextSong();
      const next = useAudioStore.getState();
      if (
        next.isPlaying &&
        next.currentSong?.id === currentSong?.id &&
        audioRef.current
      ) {
        audioRef.current.currentTime = 0;
        audioRef.current
          .play()
          .catch(() => setPlaybackError('Không thể phát lại bài hát.'));
      }
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  if (!currentSong) return null;

  const seekMax = duration > 0 ? duration : 30;
  const seekProgressPercent = Math.min(
    100,
    Math.max(0, (currentTime / seekMax) * 100),
  );
  const volumeProgressPercent = Math.min(
    100,
    Math.max(0, (isMuted ? 0 : volume) * 100),
  );

  const actions = (
    <>
      <CrossfadeControl />
      <button
        type="button"
        onClick={openDocumentPip}
        aria-label="Thu nhỏ trình phát nổi (Picture-in-Picture)"
        title="Picture-in-Picture khi đổi tab"
        className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 transition-colors"
      >
        <PictureInPicture2 size={18} />
      </button>
      <button
        type="button"
        onClick={toggleLyrics}
        aria-label="Lời bài hát Karaoke"
        aria-expanded={isLyricsOpen}
        className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
          isLyricsOpen
            ? 'bg-emerald-500 text-slate-950'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
        }`}
      >
        <Mic2 size={18} />
      </button>
      <button
        type="button"
        onClick={toggleAiDrawer}
        aria-label="Trò chuyện"
        aria-expanded={isAiDrawerOpen}
        className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
          isAiDrawerOpen
            ? 'bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
        }`}
      >
        <MessageCircle size={18} />
      </button>
      <div className="hidden lg:flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          aria-pressed={isMuted}
          className="flex h-11 w-11 items-center justify-center text-slate-600 dark:text-slate-400"
        >
          {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          type="range"
          aria-label="Âm lượng"
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={
            { '--range-progress': `${volumeProgressPercent}%` } as CSSProperties
          }
          className="player-range w-20 cursor-pointer accent-emerald-500"
        />
      </div>
    </>
  );

  return (
    <footer
      data-player
      aria-label="Thanh phát nhạc"
      className="fixed bottom-0 left-0 right-0 z-50 grid h-player select-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-t border-border-hairline bg-surface-chrome px-3 transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] sm:gap-x-3 lg:gap-x-4 lg:px-6"
    >
      {playbackError && (
        <div
          role="alert"
          className="absolute bottom-full left-0 right-0 flex items-center justify-between gap-2 bg-rose-950 px-4 py-2 text-xs text-white"
        >
          <span>{playbackError}</span>
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 font-medium transition-colors"
            onClick={() => {
              recoveryAttemptedSongIdRef.current = null;
              if (currentSong) useAudioStore.getState().playSong(currentSong);
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        src={ytVideoId ? undefined : currentSong.audioUrl}
        onTimeUpdate={ytVideoId ? undefined : handleTimeUpdate}
        onLoadedMetadata={ytVideoId ? undefined : handleLoadedMetadata}
        onEnded={ytVideoId ? undefined : handleEnded}
        onError={
          ytVideoId
            ? undefined
            : () =>
                setPlaybackError(
                  'Không tải được audio. Anh thử lại hoặc chọn bài khác nhé.',
                )
        }
      />

      {/* Off-screen dual-deck YouTube IFrame Player mount hosts (kept in viewport with 0.01 opacity to avoid Chrome background throttling) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-0 z-[-1] h-[90px] w-[160px] overflow-hidden opacity-[0.01]"
      >
        <div id="dmptify-yt-player-a" />
        <div id="dmptify-yt-player-b" />
      </div>

      {/* Left: Track Information */}
      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2.5">
        <div className="relative w-8 h-8 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-slate-800 shrink-0 ring-1 ring-border-hairline">
          <CoverImage
            src={currentSong.coverUrl}
            alt=""
            sizes="48px"
            iconSize={18}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
          <span
            title={currentSong.title}
            className="font-semibold text-slate-900 dark:text-white text-sm truncate"
          >
            {currentSong.title}
          </span>
          <span
            title={currentSong.artist}
            className="hidden sm:block text-xs text-slate-600 dark:text-slate-400 truncate"
          >
            {currentSong.artist}
          </span>
        </div>

        <button
          type="button"
          aria-label={
            currentSong.liked ? 'Bỏ thích bài đang phát' : 'Thích bài đang phát'
          }
          aria-pressed={Boolean(currentSong.liked)}
          onClick={() => toggleLike(currentSong.id)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors shrink-0"
        >
          <Heart
            className={`w-4 h-4 ${
              currentSong.liked ? 'text-rose-500 fill-rose-500' : ''
            }`}
          />
        </button>
      </div>

      <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-1.5 sm:hidden">
        {actions}
      </div>

      {/* Center: Controls & Seekbar */}
      <div className="col-span-2 row-start-2 flex w-full max-w-xl min-w-0 flex-col items-center justify-center justify-self-center sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <div className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-label="Phát ngẫu nhiên"
            aria-pressed={isShuffle}
            className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
              isShuffle
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={prevSong}
            aria-label="Bài trước"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Master Play / Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
            className="group flex h-11 w-11 items-center justify-center rounded-full"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-slate-950 transition-colors group-hover:bg-emerald-400">
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-slate-950" />
              ) : (
                <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={handleManualNext}
            aria-label="Bài tiếp theo"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={toggleRepeat}
            aria-label={`Lặp: ${
              repeatMode === 'off'
                ? 'tắt'
                : repeatMode === 'one'
                  ? 'một bài'
                  : 'tất cả'
            }`}
            aria-pressed={repeatMode !== 'off'}
            className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors relative ${
              repeatMode !== 'off'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Progress Seekbar */}
        <div className="-my-3 flex w-full items-center gap-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400 sm:-mt-3.5 sm:-mb-3">
          <span className="min-w-[2.5rem] text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              aria-label="Vị trí phát"
              min={0}
              max={duration || 30}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              style={
                {
                  '--range-progress': `${seekProgressPercent}%`,
                } as CSSProperties
              }
              className="player-range w-full cursor-pointer accent-emerald-500"
            />
          </div>
          <span className="min-w-[2.5rem] text-left">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <div className="hidden min-w-0 items-center justify-end gap-1.5 sm:col-start-3 sm:row-start-1 sm:flex lg:gap-2">
        {actions}
      </div>
      {showInTabMiniPlayer && <FloatingMiniPip onClose={closeMiniPlayer} />}
    </footer>
  );
};
