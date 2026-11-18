'use client';

import React from 'react';
import { Search, User, Menu, MessageCircle } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { ThemeSwitcher } from './ThemeSwitcher';

const MOOD_FILTERS = [
  { id: 'all', label: 'Tất Cả' },
  { id: 'chill', label: 'Thư Giãn & Chill' },
  { id: 'sad', label: 'U Buồn & Hoài Niệm' },
  { id: 'acoustic', label: 'Mộc Mạc & Thư Thái' },
  { id: 'energetic', label: 'Năng Động & Vui Vẻ' },
  { id: 'focus', label: 'Tập Trung Cao Độ' },
];

interface TopNavProps {
  onMenuClick: () => void;
}

function MoodFilters({ className }: { className: string }) {
  const selectedMood = useAudioStore(s => s.selectedMood);
  const setMoodFilter = useAudioStore(s => s.setMoodFilter);
  return <div role="group" aria-label="Lọc tâm trạng" className={className}>
    {MOOD_FILTERS.map(m => <button key={m.id} type="button" aria-pressed={selectedMood === m.id}
      onClick={() => setMoodFilter(m.id)} className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${selectedMood === m.id ? 'bg-slate-900 text-white dark:bg-white/10' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'}`}>{m.label}</button>)}
  </div>;
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  const searchQuery = useAudioStore((s) => s.searchQuery);
  const setSearchQuery = useAudioStore((s) => s.setSearchQuery);
  const toggleAiDrawer = useAudioStore((s) => s.toggleAiDrawer);
  const isAiDrawerOpen = useAudioStore((s) => s.isAiDrawerOpen);

  return (
    <header className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-3 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur-md transition-colors sm:px-6 xl:flex-nowrap xl:gap-5 dark:border-white/5 dark:bg-[#090D16]/95">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors md:hidden"
        aria-label="Mở menu điều hướng"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Ô tìm kiếm */}
      <div className="relative min-w-0 flex-1 xl:w-56 xl:flex-none 2xl:w-64">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          aria-label="Tìm bài hát hoặc tâm trạng"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm bài hát, cảm xúc..."
          className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-base text-slate-900 placeholder-slate-500 transition-colors focus:border-emerald-500/60 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      {/* Dải Mood Filters: Tinh giản, loại bỏ icon emoji, cuộn ngang độc lập */}
      <MoodFilters className="hidden min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none py-1 xl:flex" />

      {/* Cụm điều khiển bên phải: Tinh gọn tối đa */}
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Nút Chat AI (loại bỏ icon, tinh gọn) */}
        <button
          type="button"
          onClick={toggleAiDrawer}
          aria-label="Mở trò chuyện"
          aria-expanded={isAiDrawerOpen}
          className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
            isAiDrawerOpen
              ? 'bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
          }`}
          title="Trò chuyện"
        >
          <MessageCircle size={18} strokeWidth={1.7} />
        </button>

        {/* Nút Giao diện thu gọn 1 nút duy nhất có dropdown chọn */}
        <ThemeSwitcher />

        {/* User Profile */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
          <div aria-label="Hồ sơ Nguyễn Tuấn Đạt" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
            <User className="w-4 h-4" strokeWidth={1.7} />
          </div>
          <div className="hidden 2xl:block text-left">
            <span className="block text-xs font-semibold text-slate-900 dark:text-white leading-tight">
              Nguyễn Tuấn Đạt
            </span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400">
              Hồ sơ demo
            </span>
          </div>
        </div>
      </div>
      <MoodFilters className="flex w-full min-w-0 items-center gap-1 overflow-x-auto scrollbar-none py-1 xl:hidden" />
    </header>
  );
};
