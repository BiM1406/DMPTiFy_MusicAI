'use client';

import React from 'react';
import { Home, Compass, Library, PlusSquare, Heart, Sparkles, Crown, Music2 } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { MOCK_PLAYLISTS } from '../../lib/mock-songs';

export const Sidebar: React.FC = () => {
  const { toggleAiDrawer, isAiDrawerOpen } = useAudioStore();

  return (
    <aside className="w-64 h-[calc(100vh-88px)] bg-[#0B0F19] border-r border-white/5 flex flex-col justify-between p-4 shrink-0 select-none">
      <div className="flex flex-col gap-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Music2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
              DMPTiFy
            </span>
            <span className="block text-[10px] text-emerald-400 font-semibold tracking-wider -mt-1">
              AI MUSIC STREAM
            </span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex flex-col gap-1">
          <button className="flex items-center gap-4 px-3 py-2.5 rounded-xl bg-white/10 text-white font-medium text-sm transition-all">
            <Home className="w-5 h-5 text-emerald-400" />
            <span>Khám Phá</span>
          </button>
          <button className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-all">
            <Compass className="w-5 h-5" />
            <span>Bảng Xếp Hạng</span>
          </button>
          <button className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-all">
            <Library className="w-5 h-5" />
            <span>Thư Viện Của Bạn</span>
          </button>
          
          {/* AI Mood Button */}
          <button
            onClick={toggleAiDrawer}
            className={`flex items-center gap-4 px-3 py-2.5 rounded-xl font-medium text-sm transition-all mt-1 ${
              isAiDrawerOpen
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 border border-indigo-500/20'
            }`}
          >
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span>Trợ Lý Cảm Xúc AI</span>
          </button>
        </nav>

        {/* Playlists Section */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Danh Sách Phát</span>
            <PlusSquare className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
          </div>

          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto spotify-scroll pr-1">
            <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-sm transition-colors text-left truncate">
              <div className="w-6 h-6 rounded bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shrink-0">
                <Heart className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <span className="truncate">Bài Hát Đã Thích</span>
            </button>

            {MOCK_PLAYLISTS.map((pl) => (
              <button
                key={pl.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-colors text-left truncate"
              >
                {pl.isAiGenerated && (
                  <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                )}
                <span className="truncate">{pl.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VIP Upgrade Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-950/20 border border-amber-500/30 flex flex-col gap-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-300 tracking-wide">
            DMPTiFy VIP
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-snug">
          Nghe nhạc Lossless 320kbps & tạo playlist AI không giới hạn.
        </p>
        <button className="w-full py-1.5 px-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all">
          Nâng Cấp 49.000đ/tháng
        </button>
      </div>
    </aside>
  );
};
