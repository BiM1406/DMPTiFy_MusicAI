'use client';

import React from 'react';
import Image from 'next/image';
import { Play, Pause, Heart, Sparkles, Clock, Flame, Disc } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { MOCK_SONGS, MOCK_PLAYLISTS } from '../../lib/mock-songs';
import { Song } from '../../types/music';

export const MainContent: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    toggleLike,
    selectedMood,
    searchQuery,
    toggleAiDrawer,
  } = useAudioStore();

  // Filter songs based on mood and search query
  const filteredSongs = MOCK_SONGS.filter((s) => {
    const matchesMood = selectedMood === 'all' || s.mood === selectedMood;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.moodLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMood && matchesSearch;
  });

  const handlePlaySong = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  return (
    <main className="flex-1 h-[calc(100vh-88px)] overflow-y-auto spotify-scroll p-6 lg:p-8 flex flex-col gap-8">
      {/* Hero Banner Section */}
      <section className="relative rounded-3xl p-8 overflow-hidden bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-white/10 shadow-2xl">
        <div className="absolute -top-12 -right-12 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI EMOTION DISCOVERY</span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Âm nhạc chạm tới{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              tâm trạng của bạn
            </span>
          </h1>

          <p className="text-slate-300 text-sm lg:text-base leading-relaxed">
            Bạn đang cảm thấy thế nào hôm nay? Đang chịu áp lực hay cần nạp năng lượng? 
            Hãy để Trợ lý AI thấu cảm và tự động tạo danh sách phát chữa lành dành riêng cho bạn.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handlePlaySong(MOCK_SONGS[0])}
              className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm rounded-full shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-105"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Phát Nhạc Ngay</span>
            </button>

            <button
              onClick={toggleAiDrawer}
              className="flex items-center gap-2.5 px-5 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold text-sm rounded-full border border-white/10 transition-all backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Tâm Sự Với AI</span>
            </button>
          </div>
        </div>
      </section>

      {/* Featured Tracks Bento Grid */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Bài Hát Thịnh Hành & Khớp Tâm Trạng
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {filteredSongs.length} bài hát
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {filteredSongs.map((song) => {
            const isCurrentPlaying = currentSong?.id === song.id && isPlaying;
            const isCurrent = currentSong?.id === song.id;

            return (
              <div
                key={song.id}
                className={`group glass-card p-4 rounded-2xl flex flex-col gap-3 relative cursor-pointer ${
                  isCurrent ? 'border-emerald-500/40 bg-white/10' : ''
                }`}
                onClick={() => handlePlaySong(song)}
              >
                {/* Album Cover Art */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-800 shadow-md">
                  <Image
                    src={song.coverUrl}
                    alt={song.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/40 transform scale-75 group-hover:scale-100 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySong(song);
                      }}
                    >
                      {isCurrentPlaying ? (
                        <Pause className="w-5 h-5 fill-slate-950" />
                      ) : (
                        <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
                      )}
                    </button>
                  </div>

                  {/* Playing Vinyl Badge */}
                  {isCurrentPlaying && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-slate-950 text-[10px] font-extrabold flex items-center gap-1 shadow">
                      <Disc className="w-3 h-3 animate-spin-slow" />
                      <span>ĐANG PHÁT</span>
                    </div>
                  )}
                </div>

                {/* Song Info */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-bold text-white text-sm truncate group-hover:text-emerald-400 transition-colors">
                      {song.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(song.id);
                      }}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          song.liked ? 'text-rose-500 fill-rose-500' : ''
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{song.artist}</p>
                </div>

                {/* Mood Tag & BPM Meta */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 font-medium truncate max-w-[120px]">
                    {song.moodLabel}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {song.bpm} BPM
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Playlists */}
      <section className="flex flex-col gap-4 pb-8">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Danh Sách Phát Được Đề Xuất
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MOCK_PLAYLISTS.map((pl) => (
            <div
              key={pl.id}
              className="glass-card p-4 rounded-2xl flex items-center gap-4 cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-xl overflow-relative relative shrink-0 overflow-hidden bg-slate-800">
                <Image
                  src={pl.coverUrl}
                  alt={pl.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                  unoptimized
                />
              </div>

              <div className="flex flex-col gap-1 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  {pl.isAiGenerated && (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  )}
                  <h3 className="font-bold text-white text-sm truncate group-hover:text-emerald-400 transition-colors">
                    {pl.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {pl.description}
                </p>
                <span className="text-[10px] text-slate-400 pt-0.5">
                  {pl.songsCount} bài hát
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};
