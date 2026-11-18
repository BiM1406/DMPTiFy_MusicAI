'use client';

import React from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { CoverImage } from '../common/CoverImage';

interface FloatingMiniPipProps {
  onClose?: () => void;
  isStandalonePip?: boolean;
}

export const FloatingMiniPip: React.FC<FloatingMiniPipProps> = ({ onClose, isStandalonePip = false }) => {
  const currentSong = useAudioStore((s) => s.currentSong);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const currentTime = useAudioStore((s) => s.currentTime);
  const duration = useAudioStore((s) => s.duration);
  const togglePlay = useAudioStore((s) => s.togglePlay);
  const nextSong = useAudioStore((s) => s.nextSong);
  const prevSong = useAudioStore((s) => s.prevSong);
  const isMuted = useAudioStore((s) => s.isMuted);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      data-floating-pip
      className={`flex flex-col gap-2 p-3 rounded-2xl bg-slate-900/95 text-white border border-white/10 shadow-2xl backdrop-blur-xl ${
        isStandalonePip ? 'w-full h-full justify-between' : 'fixed bottom-24 right-4 z-40 w-80'
      }`}
    >
      {/* Top Row: Cover, Info, Close */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-slate-800">
          <CoverImage
            src={currentSong.coverUrl}
            alt={currentSong.title}
            sizes="48px"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{currentSong.title}</p>
          <p className="text-[11px] text-slate-400 truncate">{currentSong.artist}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng mini player"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Progress Line */}
      <div className="flex flex-col gap-1">
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-transform duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Bật âm' : 'Tắt âm'}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevSong}
            aria-label="Bài trước"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <SkipBack size={16} />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors shadow-md"
          >
            {isPlaying ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={nextSong}
            aria-label="Bài kế tiếp"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <SkipForward size={16} />
          </button>
        </div>

        <div className="w-8" />
      </div>
    </div>
  );
};
