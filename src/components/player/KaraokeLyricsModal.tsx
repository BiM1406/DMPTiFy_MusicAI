'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { X, Mic2, Disc } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { LyricLine } from '../../types/music';

export const KaraokeLyricsModal: React.FC = () => {
  const { currentSong, currentTime, isLyricsOpen, toggleLyrics, seekTo, isPlaying } =
    useAudioStore();
  const [lyricsLines, setLyricsLines] = useState<LyricLine[]>([]);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);

  // Fetch and parse LRC file when currentSong changes
  useEffect(() => {
    if (!currentSong?.lyricsUrl) return;

    fetch(currentSong.lyricsUrl)
      .then((res) => res.text())
      .then((text) => {
        const parsed: LyricLine[] = [];
        const lines = text.split('\n');

        lines.forEach((line) => {
          const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/);
          if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const hundredths = parseInt(match[3], 10);
            const totalSecs = minutes * 60 + seconds + hundredths / 100;
            parsed.push({
              time: totalSecs,
              text: match[4].trim(),
            });
          }
        });

        setLyricsLines(parsed);
      })
      .catch((err) => console.warn('Could not load lyrics:', err));
  }, [currentSong]);

  // Scroll active line into view smoothly
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]);

  if (!isLyricsOpen || !currentSong) return null;

  // Determine which line is currently active
  let activeIndex = -1;
  for (let i = 0; i < lyricsLines.length; i++) {
    if (currentTime >= lyricsLines[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#070A10]/95 backdrop-blur-3xl flex flex-col justify-between p-6 lg:p-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Mic2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Đồng Bộ Lời Bài Hát (Karaoke LRC)</span>
              {isPlaying && (
                <Disc className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              )}
            </h2>
            <p className="text-xs text-slate-400">
              {currentSong.title} — {currentSong.artist}
            </p>
          </div>
        </div>

        <button
          onClick={toggleLyrics}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Lyrics Body */}
      <div className="flex-1 overflow-y-auto py-12 flex flex-col items-center gap-8 spotify-scroll text-center select-none">
        {lyricsLines.length === 0 ? (
          <p className="text-slate-400 text-sm italic my-auto">
            Đang tải lời bài hát hoặc bài hát này chưa có lời đồng bộ...
          </p>
        ) : (
          lyricsLines.map((line, idx) => {
            const isActive = idx === activeIndex;

            return (
              <p
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => seekTo(line.time)}
                className={`cursor-pointer transition-all duration-300 max-w-2xl px-4 ${
                  isActive
                    ? 'text-2xl lg:text-3xl font-extrabold text-white scale-105 drop-shadow-[0_0_16px_rgba(16,185,129,0.7)]'
                    : 'text-lg lg:text-xl font-medium text-slate-500 hover:text-slate-300'
                }`}
              >
                {line.text}
              </p>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-white/5 text-center text-xs text-slate-400">
        Bấm vào bất kỳ câu hát nào để tua nhanh tới mốc thời gian đó
      </div>
    </div>
  );
};
