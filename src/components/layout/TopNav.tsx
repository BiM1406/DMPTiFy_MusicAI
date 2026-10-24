'use client';

import React from 'react';
import { Search, Sparkles, User, Bell } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';

const MOOD_FILTERS = [
  { id: 'all', label: 'Tất Cả' },
  { id: 'chill', label: '🌿 Thư Giãn & Chill' },
  { id: 'sad', label: '🌧️ U Buồn & Hoài Niệm' },
  { id: 'acoustic', label: '🎸 Mộc Mạc & Thư Thái' },
  { id: 'energetic', label: '⚡ Năng Động & Vui Vẻ' },
  { id: 'focus', label: '🧠 Tập Trung Cao Độ' },
];

export const TopNav: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    selectedMood,
    setMoodFilter,
    toggleAiDrawer,
    isAiDrawerOpen,
  } = useAudioStore();

  return (
    <header className="h-16 px-6 border-b border-white/5 bg-[#090D16]/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Search Input Bar */}
      <div className="relative w-80 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm bài hát, nghệ sĩ, cảm xúc..."
          className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-all"
        />
      </div>

      {/* Mood Filter Pills Bar */}
      <div className="hidden lg:flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
        {MOOD_FILTERS.map((m) => {
          const isActive = selectedMood === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMoodFilter(m.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-indigo-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Quick AI Trigger */}
        <button
          onClick={toggleAiDrawer}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            isAiDrawerOpen
              ? 'bg-indigo-600 text-white border-indigo-400'
              : 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Chat AI</span>
        </button>

        <button className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-xs shadow-sm">
            <User className="w-4 h-4 text-slate-950" />
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-semibold text-white leading-tight">
              Nguyễn Tuấn Đạt
            </span>
            <span className="block text-[10px] text-amber-400 font-bold">
              VIP MEMBER
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
