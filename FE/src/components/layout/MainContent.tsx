'use client';

import React from 'react';
import { Play, Pause, Heart, MessageCircle, Music2, Disc, SearchX, RotateCcw, LoaderCircle } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { Song } from '../../types/music';
import { CoverImage } from '../common/CoverImage';

function normalizeViSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export const MainContent: React.FC = () => {
  // Use granular selectors to prevent re-renders on audio timeUpdate
  const currentSong = useAudioStore((s) => s.currentSong);
  const catalog = useAudioStore((s) => s.catalog);
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
  const isSearchingRemote = useAudioStore((s) => s.isSearchingRemote);
  const remoteSearchResults = useAudioStore((s) => s.remoteSearchResults);

  // Filter songs based on mood and accent-insensitive Vietnamese search query
  const rawQueryLower = searchQuery.toLowerCase();
  const normalizedQuery = normalizeViSearch(searchQuery);
  const filteredSongs = queue.filter((s) => {
    const matchesMood =
      selectedMood === 'all'
        ? true
        : selectedMood === 'liked'
          ? Boolean(s.liked)
          : s.mood === selectedMood;
    const matchesSearch =
      !normalizedQuery ||
      s.title.toLowerCase().includes(rawQueryLower) ||
      s.artist.toLowerCase().includes(rawQueryLower) ||
      s.moodLabel.toLowerCase().includes(rawQueryLower) ||
      normalizeViSearch(s.title).includes(normalizedQuery) ||
      normalizeViSearch(s.artist).includes(normalizedQuery) ||
      normalizeViSearch(s.moodLabel).includes(normalizedQuery);
    return matchesMood && matchesSearch;
  });

  const trimmedQuery = searchQuery.trim();
  const isLiveSearchActive =
    trimmedQuery.length >= 2 && remoteSearchResults !== null;

  const displayedSongs = React.useMemo(() => {
    if (!isLiveSearchActive) {
      return filteredSongs;
    }

    const seenIds = new Set(filteredSongs.map((s) => s.id));
    const remoteMatches = remoteSearchResults.filter((s) => {
      if (seenIds.has(s.id)) return false;
      if (selectedMood !== 'all' && selectedMood !== 'liked') {
        return s.mood === selectedMood;
      }
      return true;
    });

    return [...filteredSongs, ...remoteMatches];
  }, [filteredSongs, isLiveSearchActive, remoteSearchResults, selectedMood]);

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
      <h1 className="sr-only">{activePlaylistId ? playlists.find(p => p.id === activePlaylistId)?.title : view === 'library' ? 'Thư viện' : view === 'charts' ? 'Bảng xếp hạng' : 'Khám phá âm nhạc'}</h1>
      {/* Hero Banner Section */}
      {view === 'discover' && !activePlaylistId && <section className="rounded-2xl p-6 sm:p-8 border border-border-hairline bg-surface-card shrink-0">

        <div className="relative z-10 max-w-2xl flex flex-col gap-3 sm:gap-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            Âm nhạc chạm tới{' '}
            <span className="text-emerald-700 dark:text-emerald-400">
              tâm trạng của bạn
            </span>
          </h2>

          <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
            Bạn đang cảm thấy thế nào hôm nay? Đang chịu áp lực hay cần nạp năng lượng?
            Chọn một tâm trạng hoặc trò chuyện cùng trợ lý cảm xúc để nhận danh sách nhạc phù hợp.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={!queue.length}
              onClick={() => queue[0] && handlePlaySong(queue[0])}
              className="flex min-h-11 items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Phát Nhạc Ngay</span>
            </button>

            <button
              type="button"
              onClick={toggleAiDrawer}
              className="flex min-h-11 items-center gap-2 px-5 py-3 text-slate-800 dark:text-white font-medium text-sm rounded-lg border border-border-hairline hover:bg-surface-card-hover transition-colors"
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
              {activePlaylistId ? playlists.find(p => p.id === activePlaylistId)?.title : view === 'library' ? 'Bài hát đã thích' : view === 'charts' ? 'Bảng xếp hạng nghe nhiều' : 'Bài hát dành cho bạn'}
            </h2>
          </div>
          <span aria-live="polite" className="text-xs text-slate-600 dark:text-slate-400 font-medium tabular-nums">
            {displayedSongs.length} bài hát
          </span>
        </div>

        {/* Searching or Empty State when no songs match search/mood */}
        {isSearchingRemote && displayedSongs.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            className="bg-surface-card rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-4 border border-dashed border-border-hairline"
          >
            <div className="w-14 h-14 rounded-2xl bg-surface-raised flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <LoaderCircle className="w-7 h-7 animate-spin" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Đang tìm bài hát trên kho nhạc…
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 [overflow-wrap:anywhere]">
                Đang tìm kiếm “{trimmedQuery}” trên thư viện trực tuyến.
              </p>
            </div>
          </div>
        ) : displayedSongs.length === 0 ? (
          <div className="bg-surface-card rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-4 border border-dashed border-border-hairline">
            <div className="w-14 h-14 rounded-2xl bg-surface-raised flex items-center justify-center text-slate-500 dark:text-slate-400">
              <SearchX className="w-7 h-7" />
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
              className="flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold border border-emerald-500/30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{queue.length === 0 ? 'Khám phá bài hát' : 'Đặt lại bộ lọc'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {displayedSongs.map((song, idx) => {
              const isCurrentPlaying = currentSong?.id === song.id && isPlaying;
              const isCurrent = currentSong?.id === song.id;

              return (
                <article
                  key={song.id}
                  className={`group relative flex flex-col gap-3 rounded-2xl border p-3 sm:p-4 transition-colors ${
                    isCurrent
                      ? 'border-emerald-500/60 bg-surface-card-active ring-1 ring-emerald-500/40'
                      : 'border-border-hairline bg-surface-card hover:border-border-accent hover:bg-surface-card-hover'
                  }`}
                >
                  {/* Album Cover Art */}
                  <button
                    type="button"
                    aria-label={isCurrentPlaying ? `Tạm dừng ${song.title}` : `Phát ${song.title}`}
                    onClick={() => handlePlaySong(song)}
                    className="relative aspect-square w-full rounded-xl overflow-hidden bg-surface-raised text-left"
                  >
                    <CoverImage
                      src={song.coverUrl}
                      alt=""
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      iconSize={32}
                    />

                    {/* Play Button Overlay */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 flex items-end justify-end p-2 opacity-100 transition-opacity sm:items-center sm:justify-center sm:bg-black/35 sm:p-0 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-lg transition-transform sm:h-12 sm:w-12 sm:scale-90 sm:group-hover:scale-100 sm:group-focus-within:scale-100">
                        {isCurrentPlaying ? (
                          <Pause className="w-5 h-5 fill-slate-950" />
                        ) : (
                          <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
                        )}
                      </span>
                    </span>

                    {/* Chart Rank or Playing Vinyl Badge */}
                    {isCurrentPlaying ? (
                      <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-semibold flex items-center gap-1 shadow">
                        <Disc className="w-3 h-3 animate-spin-slow" />
                        <span>Đang phát</span>
                      </span>
                    ) : view === 'charts' && !activePlaylistId && !trimmedQuery ? (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 text-white text-xs font-semibold tabular-nums border border-white/15">
                        #{idx + 1}
                      </span>
                    ) : null}
                  </button>

                  {/* Song Info */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="min-w-0 flex-1 flex">
                        <button
                          type="button"
                          onClick={() => handlePlaySong(song)}
                          className="w-full text-left font-bold text-slate-900 dark:text-white text-sm truncate hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                        >
                          {song.title}
                        </button>
                      </h3>
                      <button
                        type="button"
                        aria-label={song.liked ? `Bỏ thích ${song.title}` : `Thích ${song.title}`}
                        aria-pressed={Boolean(song.liked)}
                        onClick={() => toggleLike(song.id)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            song.liked ? 'text-rose-500 fill-rose-500' : ''
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{song.artist}</p>
                  </div>

                  {/* Mood Tag & BPM Meta */}
                  <div className="flex flex-wrap gap-1 items-center justify-between text-xs pt-2 border-t border-border-hairline">
                    <span className="px-2 py-0.5 rounded-full bg-surface-raised text-slate-700 dark:text-slate-300 font-medium truncate max-w-[120px]">
                      {song.moodLabel}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-xs">
                      <span className="font-mono tabular-nums">{song.bpm}</span> BPM
                    </span>
                  </div>
                </article>
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
          {playlists.map((pl) => {
            const firstSongCover = catalog.find((s) => s.id === pl.songIds[0])?.coverUrl;
            const resolvedPlaylistCover =
              (pl.coverUrl && !pl.coverUrl.startsWith('/covers/')
                ? pl.coverUrl
                : firstSongCover) || pl.coverUrl;

            return (
            <button
              type="button"
              key={pl.id}
              onClick={() => selectPlaylist(pl.id)}
              aria-pressed={activePlaylistId === pl.id}
              className="rounded-2xl border border-border-hairline bg-surface-card hover:border-border-accent hover:bg-surface-card-hover transition-colors p-4 flex items-center gap-4 group text-left"
            >
              <div className="w-16 h-16 rounded-xl relative shrink-0 overflow-hidden bg-surface-raised">
                <CoverImage
                  src={resolvedPlaylistCover}
                  alt=""
                  sizes="64px"
                  iconSize={22}
                />
              </div>

              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {pl.title}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {pl.description}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 pt-0.5 tabular-nums">
                  {pl.songIds.length} bài hát
                </span>
              </div>
            </button>
            );
          })}
        </div>
      </section>
    </main>
  );
};
