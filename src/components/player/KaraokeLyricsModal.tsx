'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Mic2, Disc } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { LyricLine } from '../../types/music';
import { usePanelFocus } from '../../hooks/usePanelFocus';
import { preferredScrollBehavior } from '../../lib/motion';

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
    url: string;
    lines: LyricLine[];
    status?: 'ready' | 'error';
  }>({ url: '', lines: [] });
  const [retry, setRetry] = useState(0);
  const lyricsUrl = currentSong?.lyricsUrl;
  const activeLineRef = useRef<HTMLButtonElement | null>(null);
  const lyricsLines =
    lyricsState.url === currentSong?.lyricsUrl ? lyricsState.lines : [];

  // Fetch and parse LRC file when currentSong changes
  useEffect(() => {
    if (!lyricsUrl) return;
    const controller = new AbortController();
    fetch(lyricsUrl, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error('Lyrics unavailable'); return res.text(); })
      .then((text) => {
        const parsed: LyricLine[] = [];
        const lines = text.split('\n');

        lines.forEach((line) => {
          // Support both 2 and 3 decimal places [mm:ss.xx] and [mm:ss.xxx]
          const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
          if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const rawFrac = match[3];
            const fractional = rawFrac.length === 3 ? parseInt(rawFrac, 10) / 1000 : parseInt(rawFrac, 10) / 100;
            const totalSecs = minutes * 60 + seconds + fractional;
            parsed.push({
              time: totalSecs,
              text: match[4].trim(),
            });
          }
        });

        if (!controller.signal.aborted) setLyricsState({ url: lyricsUrl, lines: parsed, status: 'ready' });
      })
      .catch(() => { if (!controller.signal.aborted) setLyricsState({ url: lyricsUrl, lines: [], status: 'error' }); });
    return () => controller.abort();
  }, [lyricsUrl, retry]);

  useEffect(() => {
    if (!isLyricsOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') toggleLyrics(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isLyricsOpen, toggleLyrics]);

  // Determine which line is currently active
  let activeIndex = -1;
  for (let i = 0; i < lyricsLines.length; i++) {
    if (currentTime >= lyricsLines[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Scroll active line into view smoothly ONLY when activeIndex changes or modal opens
  useEffect(() => {
    if (activeLineRef.current && isLyricsOpen && activeIndex !== -1) {
      activeLineRef.current.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: 'center',
      });
    }
  }, [activeIndex, isLyricsOpen]);

  if (!isLyricsOpen || !currentSong) return null;

  return (
    <div ref={panelRef} role="dialog" aria-label="Lời bài hát · có thể sử dụng thanh phát nhạc" tabIndex={-1} className="fixed left-0 right-0 md:left-64 top-0 bottom-[132px] sm:bottom-[88px] z-40 bg-white dark:bg-[#070A10] flex flex-col justify-between p-4 sm:p-6 lg:p-12 animate-in fade-in transition-colors">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
            <Mic2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Đồng Bộ Lời Bài Hát (Karaoke LRC)</span>
              {isPlaying && (
                <Disc className="w-4 h-4 text-emerald-500 dark:text-emerald-400 animate-spin-slow" />
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentSong.title} — {currentSong.artist}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleLyrics}
          className="w-11 h-11 shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/15 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors"
          title="Đóng lời bài hát"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Lyrics Body */}
      <div className="min-h-0 flex-1 overflow-y-auto py-8 flex flex-col items-center gap-6 spotify-scroll text-center select-none">
        {lyricsLines.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-400 text-sm italic my-auto">
              {!lyricsUrl ? 'Bài hát này chưa có lời đồng bộ.' : lyricsState.url !== lyricsUrl ? 'Đang tải lời bài hát...' : lyricsState.status === 'error' ? 'Không tải được lời bài hát.' : 'Bài hát này chưa có lời đồng bộ.'}
              {lyricsState.url === lyricsUrl && lyricsState.status === 'error' && <button type="button" className="ml-2 underline" onClick={() => setRetry(n => n + 1)}>Thử lại</button>}
          </p>
        ) : (
          lyricsLines.map((line, idx) => {
            const isActive = idx === activeIndex;

            return (
              <button
                type="button"
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => seekTo(line.time)}
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
      <div className="pt-4 border-t border-slate-200 dark:border-white/5 text-center text-xs text-slate-500 dark:text-slate-400">
        Bấm vào bất kỳ câu hát nào để tua nhanh tới mốc thời gian đó
      </div>
    </div>
  );
};
