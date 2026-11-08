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
  MessageCircle,
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';

export const BottomPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  const playbackError = useAudioStore(s => s.playbackError);
  const setPlaybackError = useAudioStore(s => s.setPlaybackError);
  const playbackRequest = useAudioStore(s => s.playbackRequest);
  const songId = currentSong?.id;

  // Sync seekTarget from external triggers (Karaoke click, prevSong rewind, etc.)
  useEffect(() => {
    if (seekTarget !== null && audioRef.current) {
      audioRef.current.currentTime = seekTarget;
      clearSeekTarget();
    }
  }, [seekTarget, clearSeekTarget, playbackRequest]);

  // Sync audio play/pause with isPlaying state
  useEffect(() => {
    if (!audioRef.current) return;
    let cancelled = false;
    if (isPlaying) {
      if (audioRef.current.error) audioRef.current.load();
      audioRef.current.play().catch((err) => {
        if (!cancelled && err.name !== 'AbortError') setPlaybackError('Không phát được bài hát. Anh thử phát lại hoặc chọn bài khác nhé.');
      });
    } else {
      audioRef.current.pause();
    }
    return () => { cancelled = true; };
  }, [isPlaying, songId, playbackRequest, setPlaybackError]);

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
        audioRef.current.play().catch(() => setPlaybackError('Không thể phát lại bài hát.'));
      }
    } else {
      nextSong();
      const next = useAudioStore.getState();
      if (next.isPlaying && next.currentSong?.id === currentSong?.id && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setPlaybackError('Không thể phát lại bài hát.'));
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

  const actions = <>
    <button type="button" onClick={toggleLyrics} aria-label="Lời bài hát Karaoke" aria-expanded={isLyricsOpen}
      className={`flex h-11 w-11 items-center justify-center rounded-lg ${isLyricsOpen ? 'bg-emerald-500 text-slate-950' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`}><Mic2 size={18} /></button>
    <button type="button" onClick={toggleAiDrawer} aria-label="Trò chuyện" aria-expanded={isAiDrawerOpen}
      className={`flex h-11 w-11 items-center justify-center rounded-lg ${isAiDrawerOpen ? 'bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`}><MessageCircle size={18} /></button>
    <div className="hidden lg:flex items-center gap-2">
      <button type="button" onClick={toggleMute} aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'} aria-pressed={isMuted} className="flex h-11 w-11 items-center justify-center text-slate-600 dark:text-slate-400">{isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      <input type="range" aria-label="Âm lượng" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={e => setVolume(parseFloat(e.target.value))} className="player-range w-20 cursor-pointer accent-emerald-500" />
    </div>
  </>;

  return (
    <footer data-player aria-label="Thanh phát nhạc" className="fixed bottom-0 left-0 right-0 h-[132px] sm:h-[88px] bg-white dark:bg-[#070A10] border-t border-slate-200 dark:border-white/10 px-3 lg:px-6 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 sm:flex sm:items-center sm:justify-between z-50 select-none transition-colors">
      {playbackError && <div role="alert" className="absolute bottom-full left-0 right-0 flex items-center justify-between gap-2 bg-rose-950 px-4 py-2 text-xs text-white"><span>{playbackError}</span><button type="button" className="shrink-0 underline" onClick={() => currentSong && useAudioStore.getState().playSong(currentSong)}>Thử lại</button></div>}
      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        src={currentSong.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setPlaybackError('Không tải được audio. Anh thử lại hoặc chọn bài khác nhé.')}
      />

      {/* Left: Track Information */}
      <div className="flex min-w-0 items-center gap-2 sm:w-1/4">
        <div className="relative w-8 h-8 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-slate-800 shrink-0 ring-1 ring-slate-200 dark:ring-white/10">
          <Image
            src={currentSong.coverUrl}
            alt={currentSong.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
          <span title={currentSong.title} className="font-semibold text-slate-900 dark:text-white text-sm truncate">
            {currentSong.title}
          </span>
          <span title={currentSong.artist} className="hidden sm:block text-xs text-slate-600 dark:text-slate-400 truncate">
            {currentSong.artist}
          </span>
        </div>

        <button
          type="button"
          aria-label={currentSong.liked ? 'Bỏ thích bài đang phát' : 'Thích bài đang phát'}
          aria-pressed={Boolean(currentSong.liked)}
          onClick={() => toggleLike(currentSong.id)}
          className="hidden sm:flex h-11 w-11 items-center justify-center text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors shrink-0"
        >
          <Heart
            className={`w-4 h-4 ${
              currentSong.liked ? 'text-rose-500 fill-rose-500' : ''
            }`}
          />
        </button>
      </div>

      <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end sm:hidden">{actions}</div>

      {/* Center: Controls & Seekbar */}
      <div className="col-span-2 row-start-2 flex min-w-0 flex-col items-center flex-1 sm:max-w-xl">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-label="Phát ngẫu nhiên"
            aria-pressed={isShuffle}
            className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
              isShuffle ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
            className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-slate-950" />
            ) : (
              <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={nextSong}
            aria-label="Bài tiếp theo"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={toggleRepeat}
            aria-label={`Lặp: ${repeatMode === 'off' ? 'tắt' : repeatMode === 'one' ? 'một bài' : 'tất cả'}`}
            className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors relative ${
              repeatMode !== 'off'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
        <div className="w-full flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              aria-label="Vị trí phát"
              min={0}
              max={duration || 30}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="player-range w-full cursor-pointer accent-emerald-500"
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="hidden shrink-0 items-center justify-end gap-1 sm:flex">{actions}</div>
    </footer>
  );
};
