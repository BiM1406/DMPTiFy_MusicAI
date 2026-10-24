'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Heart,
  Mic2,
  Sparkles,
  Disc,
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';

export const BottomPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    togglePlay,
    nextSong,
    prevSong,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleLike,
    toggleLyrics,
    isLyricsOpen,
    toggleAiDrawer,
    isAiDrawerOpen,
  } = useAudioStore();

  // Sync audio play/pause with isPlaying state
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn('Playback error / autoplay policy:', err);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong]);

  // Sync volume & mute
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Time update event handler
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Loaded metadata event handler
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 30);
    }
  };

  // Seekbar change handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  // Song end handler (trigger nextSong or repeat)
  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      nextSong();
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

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-[88px] bg-[#070A10]/95 backdrop-blur-xl border-t border-white/10 px-4 lg:px-6 flex items-center justify-between z-30 select-none">
      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        src={currentSong.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Left: Track Information */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-[180px]">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-800 shrink-0 shadow-md">
          <Image
            src={currentSong.coverUrl}
            alt={currentSong.title}
            fill
            className={`object-cover ${isPlaying ? 'animate-spin-slow' : ''}`}
            unoptimized
          />
        </div>

        <div className="flex flex-col gap-0.5 overflow-hidden">
          <span className="font-bold text-white text-sm truncate hover:underline cursor-pointer">
            {currentSong.title}
          </span>
          <span className="text-xs text-slate-400 truncate">
            {currentSong.artist}
          </span>
        </div>

        <button
          onClick={() => toggleLike(currentSong.id)}
          className="ml-2 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
        >
          <Heart
            className={`w-4 h-4 ${
              currentSong.liked ? 'text-rose-500 fill-rose-500' : ''
            }`}
          />
        </button>
      </div>

      {/* Center: Controls & Seekbar */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
        <div className="flex items-center gap-5">
          <button
            onClick={toggleShuffle}
            className={`transition-colors ${
              isShuffle ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={prevSong}
            className="text-slate-300 hover:text-white transition-colors"
          >
            <SkipBack className="w-5 h-5 fill-slate-300 hover:fill-white" />
          </button>

          {/* Master Play / Pause Button */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 transform active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-slate-950" />
            ) : (
              <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
            )}
          </button>

          <button
            onClick={nextSong}
            className="text-slate-300 hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5 fill-slate-300 hover:fill-white" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`transition-colors relative ${
              repeatMode !== 'off'
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Repeat className="w-4 h-4" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-emerald-500 text-slate-950 w-3 h-3 rounded-full flex items-center justify-center">
                1
              </span>
            )}
          </button>
        </div>

        {/* Progress Seekbar */}
        <div className="w-full flex items-center gap-3 text-[11px] text-slate-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 30}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:h-1.5 transition-all"
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Actions, Lyrics, AI Drawer, Volume */}
      <div className="flex items-center justify-end gap-3 w-1/4">
        {/* Karaoke Lyrics Toggle */}
        <button
          onClick={toggleLyrics}
          className={`p-2 rounded-xl transition-all ${
            isLyricsOpen
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Lời bài hát Karaoke"
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* AI Chat Drawer Toggle */}
        <button
          onClick={toggleAiDrawer}
          className={`p-2 rounded-xl transition-all ${
            isAiDrawerOpen
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40'
          }`}
          title="Trợ lý AI thấu cảm"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Volume Controls */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:h-1.5 transition-all"
          />
        </div>
      </div>
    </footer>
  );
};
