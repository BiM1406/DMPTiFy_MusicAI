'use client';

import React from 'react';
import { Search, User, Menu, MessageCircle, LogIn, LogOut, X, Users } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useJamStore } from '../../store/useJamStore';
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
      onClick={() => setMoodFilter(m.id)} className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg px-2.5 py-2 xl:px-2 text-xs font-medium transition-colors ${selectedMood === m.id ? 'bg-slate-900 text-white dark:bg-white/10' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'}`}>{m.label}</button>)}
  </div>;
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  const searchQuery = useAudioStore((s) => s.searchQuery);
  const setSearchQuery = useAudioStore((s) => s.setSearchQuery);
  const toggleAiDrawer = useAudioStore((s) => s.toggleAiDrawer);
  const isAiDrawerOpen = useAudioStore((s) => s.isAiDrawerOpen);
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const logout = useAuthStore((s) => s.logout);
  const jamRoom = useJamStore((s) => s.room);
  const openJamModal = useJamStore((s) => s.openModal);

  return (
    <header className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-border-hairline bg-surface-topbar px-3 py-2 backdrop-blur-md transition-colors sm:px-6 xl:flex-nowrap xl:gap-4">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors md:hidden"
        aria-label="Mở menu điều hướng"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Ô tìm kiếm: full-width ở màn hình nhỏ để không bị co hẹp, về 1 hàng từ sm+ */}
      <div className="relative order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1 xl:w-44 xl:flex-none 2xl:w-56">
        <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          aria-label="Tìm bài hát hoặc tâm trạng"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm bài hát, cảm xúc..."
          className="h-11 w-full rounded-lg border border-border-hairline bg-surface-raised pl-9 pr-11 text-base text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-400 transition-colors focus:border-emerald-600 dark:focus:border-emerald-400 dark:text-white"
        />
        {searchQuery.length > 0 && (
          <button
            type="button"
            aria-label="Xóa từ khóa tìm kiếm"
            onClick={() => setSearchQuery('')}
            className="absolute right-0 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dải Mood Filters: Khoảng cách gọn để hiển thị đủ 6 tâm trạng ở màn hình desktop */}
      <MoodFilters className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none py-1 xl:flex" />

      {/* Cụm điều khiển bên phải: Tinh gọn tối đa */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
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

        {/* Nút Nghe nhạc chung (Jam Room) */}
        <button
          type="button"
          onClick={() => openJamModal()}
          aria-label="Phòng nghe nhạc chung (Jam Room)"
          title={jamRoom ? `Đang trong phòng ${jamRoom.code}` : 'Nghe nhạc chung'}
          className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors relative ${
            jamRoom
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
          }`}
        >
          <Users size={18} strokeWidth={1.7} />
          {Boolean(jamRoom) && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
        </button>

        {/* Tài khoản người dùng */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-border-hairline">
            <div aria-hidden="true" className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-slate-700 dark:text-slate-300">
              <User className="w-4 h-4" strokeWidth={1.7} />
            </div>
            <div className="hidden 2xl:block text-left max-w-[160px]">
              <span className="block text-xs font-medium text-slate-900 dark:text-white leading-tight truncate">
                {user.fullName}
              </span>
              <span className="block text-xs text-slate-600 dark:text-slate-400 truncate">
                {user.email}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Đăng xuất tài khoản"
              title="Đăng xuất"
              className="flex h-11 w-11 sm:w-auto sm:px-2.5 shrink-0 items-center justify-center gap-1.5 rounded-lg text-slate-600 hover:bg-surface-card-hover hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-medium transition-colors"
            >
              <LogOut size={16} strokeWidth={1.7} />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            aria-label="Mở hộp thoại đăng nhập"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-border-hairline bg-surface-raised px-3 py-2 text-xs font-medium text-slate-900 hover:bg-surface-card-hover dark:text-white transition-colors"
          >
            <LogIn size={16} strokeWidth={1.7} />
            <span>Đăng nhập</span>
          </button>
        )}
      </div>
      <MoodFilters className="order-4 flex w-full min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-none py-1 xl:hidden" />
    </header>
  );
};
