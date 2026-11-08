'use client';

import React from 'react';
import Image from 'next/image';
import { Play, Pause, Heart, MessageCircle, Music2, Disc, SearchX, RotateCcw } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { Song } from '../../types/music';

export const MainContent: React.FC = () => {
  // Use granular selectors to prevent re-renders on audio timeUpdate
  const currentSong = useAudioStore((s) => s.currentSong);
  const queue = useAudioStore((s) => s.queue);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const playSong = useAudioStore((s) => s.playSong);
  const togglePlay = useAudioStore((s) => s.togglePlay);
  const toggleLike = useAudioStore((s) => s.toggleLike);
  const selectedMood = useAudioStore((s) => s.selectedMood);
  const searchQuery = useAudioStore((s) => s.searchQuery);
  const resetFilters = useAudioStore((s) => s.resetFilters);
  const toggleAiDrawer = useAudioStore((s) => s.toggleAiDrawer);
  const playlists = useAudioStore(s => s.playlists);
  const selectPlaylist = useAudioStore(s => s.selectPlaylist);
  const activePlaylistId = useAudioStore(s => s.activePlaylistId);
  const view = useAudioStore(s => s.view);
  const setView = useAudioStore(s => s.setView);

  // Filter songs based on mood and search query
  const filteredSongs = queue.filter((s) => {
    const matchesMood =
      selectedMood === 'all'
        ? true
        : selectedMood === 'liked'
          ? Boolean(s.liked)
          : s.mood === selectedMood;
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

  const handleResetFilters = () => {
    resetFilters();
  };

  return (
    <main id="main-content" tabIndex={-1} aria-label="Thư viện âm nhạc" className="flex-1 overflow-y-auto min-h-0 spotify-scroll p-4 sm:p-6 lg:p-8 flex flex-col gap-8 pb-8 transition-colors">
      <h1 className="sr-only">{activePlaylistId ? playlists.find(p => p.id === activePlaylistId)?.title : view === 'library' ? 'Thư viện' : view === 'charts' ? 'Xếp hạng demo' : 'Khám phá âm nhạc'}</h1>
      {/* Hero Banner Section */}
      {view === 'discover' && !activePlaylistId && <section className="rounded-2xl p-6 sm:p-8 border border-slate-200 bg-white dark:bg-white/[0.03] dark:border-white/10 shrink-0">

        <div className="relative z-10 max-w-2xl flex flex-col gap-3 sm:gap-4">
          <div className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
            <Music2 className="w-4 h-4" />
            <span>Khám phá âm nhạc</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            Âm nhạc chạm tới{' '}
            <span className="text-emerald-700 dark:text-emerald-400">
              tâm trạng của bạn
            </span>
          </h2>

          <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
            Bạn đang cảm thấy thế nào hôm nay? Đang chịu áp lực hay cần nạp năng lượng? 
            Chọn một tâm trạng hoặc trò chuyện để nhận gợi ý từ thư viện demo.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={!queue.length}
              onClick={() => queue[0] && handlePlaySong(queue[0])}
              className="flex min-h-11 items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-colors"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Phát Nhạc Ngay</span>
            </button>

            <button
              type="button"
              onClick={toggleAiDrawer}
              className="flex min-h-11 items-center gap-2 px-5 py-3 text-slate-800 dark:text-white font-medium text-sm rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Trò chuyện</span>
            </button>
          </div>
        </div>
      </section>}

      {/* Featured Tracks Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Music2 className="w-5 h-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {activePlaylistId ? playlists.find(p => p.id === activePlaylistId)?.title : view === 'library' ? 'Bài hát đã thích' : view === 'charts' ? 'Xếp hạng demo · Thứ tự minh họa' : 'Bài hát dành cho bạn'}
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {filteredSongs.length} bài hát
          </span>
        </div>

        {/* Empty State when no songs match search/mood */}
        {filteredSongs.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-4 border border-dashed border-slate-200 dark:border-white/15">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
              <SearchX className="w-7 h-7 text-slate-400" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {queue.length === 0 ? view === 'library' ? 'Chưa có bài hát yêu thích' : 'Danh sách phát đang trống' : 'Không tìm thấy bài hát phù hợp'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 [overflow-wrap:anywhere]">
                {queue.length === 0 ? view === 'library' ? 'Bấm biểu tượng trái tim trên một bài hát để lưu vào Thư viện.' : 'Khám phá thư viện để chọn bài hát bạn muốn nghe.' : `Không có kết quả cho “${searchQuery}” và bộ lọc tâm trạng hiện tại.`}
              </p>
            </div>
            <button
              type="button"
              onClick={queue.length === 0 ? () => setView('discover') : handleResetFilters}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold border border-emerald-500/30 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{queue.length === 0 ? 'Khám phá bài hát' : 'Đặt lại bộ lọc'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {filteredSongs.map((song) => {
              const isCurrentPlaying = currentSong?.id === song.id && isPlaying;
              const isCurrent = currentSong?.id === song.id;

              return (
                <div
                  key={song.id}
                  className={`group glass-card p-4 rounded-2xl flex flex-col gap-3 relative cursor-pointer ${
                    isCurrent ? 'ring-2 ring-emerald-500/60 bg-emerald-50/50 dark:bg-white/10' : ''
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        aria-label={isCurrentPlaying ? `Tạm dừng ${song.title}` : `Phát ${song.title}`}
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
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {song.title}
                      </h3>
                      <button
                        type="button"
                        aria-label={song.liked ? `Bỏ thích ${song.title}` : `Thích ${song.title}`}
                        aria-pressed={Boolean(song.liked)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(song.id);
                        }}
                        className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-600 dark:text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            song.liked ? 'text-rose-500 fill-rose-500' : ''
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{song.artist}</p>
                  </div>

                  {/* Mood Tag & BPM Meta */}
                  <div className="flex flex-wrap gap-1 items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-white/5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300 font-medium truncate max-w-[120px]">
                      {song.moodLabel}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 font-mono text-xs">
                      {song.bpm} BPM
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured Playlists */}
      <section className="flex flex-col gap-4 pb-8">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Danh Sách Phát Được Đề Xuất
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {playlists.map((pl) => (
            <button
              type="button"
              key={pl.id}
              onClick={() => selectPlaylist(pl.id)}
              aria-pressed={activePlaylistId === pl.id}
              className="glass-card p-4 rounded-2xl flex items-center gap-4 cursor-pointer group text-left"
            >
              <div className="w-16 h-16 rounded-xl relative shrink-0 overflow-hidden bg-slate-800">
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
                    <Music2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                  )}
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {pl.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {pl.description}
                </p>
                <span className="text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                  {pl.songIds.length} bài hát
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
};
