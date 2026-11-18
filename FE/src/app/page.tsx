'use client';

import React, { useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { TopNav } from '../components/layout/TopNav';
import { MainContent } from '../components/layout/MainContent';
import { BottomPlayer } from '../components/player/BottomPlayer';
import { KaraokeLyricsModal } from '../components/player/KaraokeLyricsModal';
import { AiChatDrawer } from '../components/ai/AiChatDrawer';
import { useLibraryNavigation } from '../hooks/useLibraryNavigation';

export default function Home() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  useLibraryNavigation();

  return (
    <div id="music-app" className="flex h-dvh w-full overflow-hidden bg-slate-50 dark:bg-[#090D16] pb-[132px] sm:pb-[88px] text-slate-900 dark:text-white transition-colors duration-300">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-white focus:p-3 focus:text-slate-900">Đến nội dung chính</a>
      {/* 1. Left Sidebar Navigation (drawer on mobile, fixed column on md+) */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Central Area (TopNav + Main Content Feed) - reserve 88px at bottom for player */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <TopNav onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <MainContent />
      </div>

      {/* 3. Slide-over AI Emotion Chat Drawer */}
      <AiChatDrawer />

      {/* 4. Fullscreen Karaoke Lyrics Sync Modal */}
      <KaraokeLyricsModal />

      {/* 5. Persistent Fixed Bottom Music Player */}
      <BottomPlayer />
    </div>
  );
}
