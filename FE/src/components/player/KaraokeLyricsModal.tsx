'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Mic2, Disc } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { LyricLine } from '../../types/music';
import { usePanelFocus } from '../../hooks/usePanelFocus';
import { preferredScrollBehavior } from '../../lib/motion';
import { fetchSongLyrics } from '../../lib/api-client';

function parseLrcText(text: string): LyricLine[] {
  const parsed: LyricLine[] = [];
  const lines = text.split('\n');
  lines.forEach((line) => {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const rawFrac = match[3];
      const fractional =
        rawFrac.length === 3
          ? parseInt(rawFrac, 10) / 1000
          : parseInt(rawFrac, 10) / 100;
      const totalSecs = minutes * 60 + seconds + fractional;
      parsed.push({
        time: totalSecs,
        text: match[4].trim(),
      });
    }
  });
  return parsed;
}

export const KaraokeLyricsModal: React.FC = () => {
  const currentSong = useAudioStore((s) => s.currentSong);
  const currentTime = useAudioStore((s) => s.currentTime);
  const isLyricsOpen = useAudioStore((s) => s.isLyricsOpen);
  const toggleLyrics = useAudioStore((s) => s.toggleLyrics);
  const seekTo = useAudioStore((s) => s.seekTo);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const panelRef = useRef<HTMLDivElement>(null);
  usePanelFocus(panelRef, isLyricsOpen, true);

  const [lyricsState, setLyricsState] = useState<{
    key: string;
    lines: LyricLine[];
    isSynced: boolean;
    plainLyrics: string | null;
    status?: 'ready' | 'error';
  }>({ key: '', lines: [], isSynced: true, plainLyrics: null });
  const [offsetsBySong, setOffsetsBySong] = useState<Record<string, number>>({});
  const [retry, setRetry] = useState(0);
  const songId = currentSong?.id ?? '';
  const lyricOffset = offsetsBySong[songId] ?? 0;
  const lyricsUrl = currentSong?.lyricsUrl;
  const activeLineRef = useRef<HTMLButtonElement | null>(null);
  const isSynced = lyricsState.key === songId ? lyricsState.isSynced : true;
  const lyricsLines =
    lyricsState.key === songId && isSynced ? lyricsState.lines : [];
  const plainLines =
    lyricsState.key === songId && !isSynced
      ? lyricsState.plainLyrics && lyricsState.plainLyrics.trim().length > 0
        ? lyricsState.plainLyrics.split(/\r?\n/)
        : lyricsState.lines.map((line) => line.text)
      : [];
  const hasDisplayableLyrics = isSynced
    ? lyricsLines.length > 0
    : plainLines.some((line) => line.trim().length > 0);

  // Load 2-tier lyrics only when modal is open so mount never aborts an unused pre-fetch
  useEffect(() => {
    if (!isLyricsOpen || (!songId && !lyricsUrl)) return;
    const controller = new AbortController();

    void (async () => {
      if (songId) {
        const apiLyrics = await fetchSongLyrics(songId, controller.signal);
        if (controller.signal.aborted) return;
        if (apiLyrics) {
          const synced = apiLyrics.isSynced !== false;
          if (synced && apiLyrics.lines.length > 0) {
            setLyricsState({
              key: songId,
              lines: apiLyrics.lines,
              isSynced: true,
              plainLyrics: null,
              status: 'ready',
            });
            return;
          }
          const hasPlain =
            !synced &&
            ((typeof apiLyrics.plainLyrics === 'string' &&
              apiLyrics.plainLyrics.trim().length > 0) ||
              apiLyrics.lines.length > 0);
          if (hasPlain) {
            setLyricsState({
              key: songId,
              lines: apiLyrics.lines,
              isSynced: false,
              plainLyrics: apiLyrics.plainLyrics ?? null,
              status: 'ready',
            });
            return;
          }
        }
      }

      if (!lyricsUrl) {
        if (!controller.signal.aborted) {
          setLyricsState({
            key: songId,
            lines: [],
            isSynced: true,
            plainLyrics: null,
            status: 'ready',
          });
        }
        return;
      }

      try {
        const res = await fetch(lyricsUrl, { signal: controller.signal });
        if (!res.ok) throw new Error('Lyrics unavailable');
        const text = await res.text();
        if (!controller.signal.aborted) {
          setLyricsState({
            key: songId,
            lines: parseLrcText(text),
            isSynced: true,
            plainLyrics: null,
            status: 'ready',
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setLyricsState({
            key: songId,
            lines: [],
            isSynced: true,
            plainLyrics: null,
            status: 'error',
          });
        }
      }
    })();

    return () => controller.abort();
  }, [isLyricsOpen, songId, lyricsUrl, retry]);

  useEffect(() => {
    if (!isLyricsOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') toggleLyrics(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isLyricsOpen, toggleLyrics]);

  const adjustLyricOffset = (delta: number) => {
    if (!songId) return;
    setOffsetsBySong((prev) => {
      const next = Math.max(-60, Math.min(60, Math.round(((prev[songId] ?? 0) + delta) * 10) / 10));
      return { ...prev, [songId]: next };
    });
  };

  const resetLyricOffset = () => {
    if (!songId) return;
    setOffsetsBySong((prev) => ({ ...prev, [songId]: 0 }));
  };

  const formattedOffset =
    lyricOffset === 0
      ? '0.0s'
      : `${lyricOffset > 0 ? '+' : ''}${lyricOffset.toFixed(1)}s`;

  // Determine which line is currently active (Tier 1 synced lyrics only)
  const syncedTime = Math.max(0, currentTime + lyricOffset);
  let activeIndex = -1;
  if (isSynced) {
    for (let i = 0; i < lyricsLines.length; i++) {
      if (syncedTime >= lyricsLines[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  // Scroll active line into view smoothly ONLY when activeIndex changes or modal opens
  useEffect(() => {
    if (isSynced && activeLineRef.current && isLyricsOpen && activeIndex !== -1) {
      activeLineRef.current.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: 'center',
      });
    }
  }, [activeIndex, isLyricsOpen, isSynced]);

  if (!isLyricsOpen || !currentSong) return null;

  return (
    <div data-overlay-panel ref={panelRef} role="dialog" aria-label="Lời bài hát · có thể sử dụng thanh phát nhạc" tabIndex={-1} className="fixed left-0 right-0 md:left-64 top-0 bottom-player z-40 bg-surface-chrome flex flex-col justify-between p-4 sm:p-6 lg:p-12 animate-in fade-in transition-colors">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-border-hairline">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
            <Mic2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="truncate">
                {isSynced ? 'Đồng Bộ Lời Bài Hát (Karaoke LRC)' : 'Lời Bài Hát'}
              </span>
              {isPlaying && (
                <Disc className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 animate-spin-slow" />
              )}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
              {currentSong.title} · {currentSong.artist}
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
          {isSynced && hasDisplayableLyrics && (
            <div
              role="group"
              aria-label="Điều chỉnh đồng bộ nhịp lời bài hát"
              className="flex flex-wrap items-center gap-1 rounded-xl border border-border-hairline bg-surface-raised p-1"
            >
              <button
                type="button"
                onClick={() => adjustLyricOffset(-2)}
                aria-label="Lùi nhịp lời 2 giây"
                title="Lùi lời -2.0s (nếu lời chạy trước nhạc)"
                className="min-h-11 rounded-lg px-2.5 text-xs font-medium font-mono tabular-nums text-slate-700 hover:bg-surface-card dark:text-slate-200 transition-colors"
              >
                -2s
              </button>
              <button
                type="button"
                onClick={() => adjustLyricOffset(-0.5)}
                aria-label="Lùi nhịp lời 0.5 giây"
                title="Lùi lời -0.5s (nếu lời chạy trước nhạc)"
                className="min-h-11 rounded-lg px-2.5 text-xs font-medium font-mono tabular-nums text-slate-700 hover:bg-surface-card dark:text-slate-200 transition-colors"
              >
                -0.5s
              </button>
              <button
                type="button"
                onClick={resetLyricOffset}
                aria-label="Đặt lại độ lệch nhịp lời về chuẩn"
                title="Bấm để đặt lại về 0.0s"
                className={`min-h-11 rounded-lg px-3 text-xs font-medium transition-colors ${
                  lyricOffset === 0
                    ? 'text-slate-600 dark:text-slate-300'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                <span>Nhịp lời: </span>
                <span className="font-mono tabular-nums">{formattedOffset}</span>
              </button>
              <button
                type="button"
                onClick={() => adjustLyricOffset(0.5)}
                aria-label="Đẩy nhịp lời thêm 0.5 giây"
                title="Đẩy lời +0.5s (nếu lời chạy sau nhạc)"
                className="min-h-11 rounded-lg px-2.5 text-xs font-medium font-mono tabular-nums text-slate-700 hover:bg-surface-card dark:text-slate-200 transition-colors"
              >
                +0.5s
              </button>
              <button
                type="button"
                onClick={() => adjustLyricOffset(2)}
                aria-label="Đẩy nhịp lời thêm 2 giây"
                title="Đẩy lời +2.0s (nếu lời chạy sau nhạc)"
                className="min-h-11 rounded-lg px-2.5 text-xs font-medium font-mono tabular-nums text-slate-700 hover:bg-surface-card dark:text-slate-200 transition-colors"
              >
                +2s
              </button>
            </div>
          )}

          <button
            type="button"
            aria-label="Đóng lời bài hát"
            onClick={toggleLyrics}
            className="w-11 h-11 shrink-0 rounded-lg bg-surface-raised hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:hover:bg-white/15 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors"
            title="Đóng lời bài hát"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Lyrics Body */}
      <div className="min-h-0 flex-1 overflow-y-auto py-8 flex flex-col items-center gap-6 spotify-scroll text-center select-none">
        {!hasDisplayableLyrics ? (
          <div className="text-slate-600 dark:text-slate-400 text-sm my-auto flex flex-col items-center gap-3">
            <p>
              {!songId && !lyricsUrl ? 'Bài hát này chưa có lời đồng bộ.' : lyricsState.key !== songId ? 'Đang tải lời bài hát…' : lyricsState.status === 'error' ? 'Không tải được lời bài hát.' : 'Bài hát này chưa có lời đồng bộ.'}
            </p>
            {lyricsState.key === songId && lyricsState.status === 'error' && (
              <button type="button" className="min-h-11 rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium text-slate-900 dark:text-white hover:bg-surface-card-hover transition-colors" onClick={() => setRetry(n => n + 1)}>
                Thử lại
              </button>
            )}
          </div>
        ) : !isSynced ? (
          <div className="flex w-full max-w-2xl flex-col items-center gap-2.5 px-4">
            {plainLines.map((line, idx) =>
              line.trim() ? (
                <p
                  key={idx}
                  className="text-base sm:text-lg font-medium leading-relaxed text-slate-800 dark:text-slate-200 select-text"
                >
                  {line}
                </p>
              ) : (
                <div key={idx} aria-hidden="true" className="h-3" />
              ),
            )}
          </div>
        ) : (
          lyricsLines.map((line, idx) => {
            if (!line.text.trim()) {
              return <div key={idx} aria-hidden="true" className="h-2 shrink-0" />;
            }
            const isActive = idx === activeIndex;

            return (
              <button
                type="button"
                key={idx}
                ref={isActive ? activeLineRef : null}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => seekTo(Math.max(0, line.time - lyricOffset))}
                className={`min-h-11 shrink-0 cursor-pointer transition-colors max-w-2xl px-4 py-2 ${
                  isActive
                    ? 'text-2xl lg:text-3xl font-bold text-emerald-700 dark:text-emerald-400'
                    : 'text-lg lg:text-xl font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {line.text}
              </button>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-border-hairline text-center text-xs text-slate-600 dark:text-slate-400">
        {!isSynced && hasDisplayableLyrics
          ? 'Lời bài hát văn bản · chưa có mốc thời gian từng câu'
          : 'Bấm vào bất kỳ câu hát nào để tua nhanh tới mốc thời gian đó'}
      </div>
    </div>
  );
};
