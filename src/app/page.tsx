'use client';

import React from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { TopNav } from '../components/layout/TopNav';
import { MainContent } from '../components/layout/MainContent';
import { BottomPlayer } from '../components/player/BottomPlayer';
import { KaraokeLyricsModal } from '../components/player/KaraokeLyricsModal';
import { AiChatDrawer } from '../components/ai/AiChatDrawer';

export default function Home() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090D16] text-white">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar />

      {/* 2. Central Area (TopNav + Main Content Feed) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopNav />
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
