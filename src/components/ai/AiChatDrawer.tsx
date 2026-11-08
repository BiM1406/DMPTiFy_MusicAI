'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { X, MessageCircle, LoaderCircle, Send, Play, Bot, User, CheckCircle2 } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { MOCK_SONGS } from '../../lib/mock-songs';
import { Song } from '../../types/music';
import { usePanelFocus } from '../../hooks/usePanelFocus';
import { preferredScrollBehavior } from '../../lib/motion';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  detectedMood?: string;
  targetBpm?: number;
  recommendedSongs?: Song[];
}

const QUICK_PROMPTS = [
  'Hôm nay mưa buồn, áp lực thi cử mệt mỏi quá...',
  'Cho anh vài bài Acoustic nhẹ nhàng để ngủ',
  'Vừa hoàn thành đồ án, cần nhạc ăn mừng!',
  'Đang cần tập trung cao độ để code Next.js',
];

export const AiChatDrawer: React.FC = () => {
  const isAiDrawerOpen = useAudioStore((s) => s.isAiDrawerOpen);
  const toggleAiDrawer = useAudioStore((s) => s.toggleAiDrawer);
  const playSong = useAudioStore((s) => s.playSong);
  const panelRef = useRef<HTMLElement>(null);
  usePanelFocus(panelRef, isAiDrawerOpen, true);

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Chào anh Đạt! Em là Trợ lý Cảm xúc AI của DMPTiFy. Hôm nay tâm trạng anh thế nào? Hãy tâm sự với em để em chọn đúng giai điệu chữa lành cho anh nhé!',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageIdRef = useRef(0);
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  useEffect(() => {
    if (!isAiDrawerOpen) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') toggleAiDrawer(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isAiDrawerOpen, toggleAiDrawer]);

  // Auto-scroll chat feed to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: preferredScrollBehavior() });
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || pendingRef.current) return;
    pendingRef.current = true;

    const userMsg: ChatMessage = {
      id: `user-${++messageIdRef.current}`,
      sender: 'user',
      text: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate Gemini 2.5 Flash Function Calling
    timerRef.current = setTimeout(() => {
      let detectedMood = 'chill';
      let targetBpm = 75;
      let replyText = 'Em đã lắng nghe câu chuyện của anh. Hãy để những giai điệu này xoa dịu tâm trí anh nhé!';
      let recommended: Song[] = [MOCK_SONGS[0], MOCK_SONGS[2]];

      const lower = text.toLowerCase();
      if (lower.includes('buồn') || lower.includes('mưa') || lower.includes('áp lực') || lower.includes('mệt')) {
        detectedMood = 'U Buồn & Hoài Niệm (Sad / Healing)';
        targetBpm = 68;
        replyText = 'Nghe anh chia sẻ em hiểu anh đang phải trải qua một ngày nhiều áp lực. Đừng quá khắt khe với bản thân nhé, em đã bốc cho anh một liều thuốc âm nhạc piano mộc mạc dưới đây:';
        recommended = [MOCK_SONGS[1], MOCK_SONGS[0]];
      } else if (lower.includes('ăn mừng') || lower.includes('quẩy') || lower.includes('năng lượng') || lower.includes('xong')) {
        detectedMood = 'Năng Động & Phấn Khởi (Energetic)';
        targetBpm = 115;
        replyText = 'Tuyệt vời quá anh ơi! Chúc mừng anh đã hoàn thành xuất sắc mục tiêu. Cùng bật nhạc sôi động lên để sạc đầy dopamine nào!';
        recommended = [MOCK_SONGS[3], MOCK_SONGS[0]];
      } else if (lower.includes('tập trung') || lower.includes('code') || lower.includes('học')) {
        detectedMood = 'Tập Trung Cao Độ (Alpha Waves - Focus)';
        targetBpm = 72;
        replyText = 'Em đã lọc ra các bản Lofi nhịp điệu 72 BPM chuẩn sóng não Alpha, giúp anh tập trung tối đa mà không bị xao nhãng:';
        recommended = [MOCK_SONGS[4], MOCK_SONGS[2]];
      } else {
        detectedMood = 'Thư Giãn & Chill (Acoustic)';
        targetBpm = 80;
        recommended = [MOCK_SONGS[0], MOCK_SONGS[2], MOCK_SONGS[4]];
      }

      const aiReply: ChatMessage = {
        id: `ai-${++messageIdRef.current}`,
        sender: 'ai',
        text: replyText,
        detectedMood,
        targetBpm,
        recommendedSongs: recommended,
      };

      setMessages((prev) => [...prev, aiReply]);
      setIsTyping(false);
      pendingRef.current = false;
      timerRef.current = null;
    }, 900);
  };

  if (!isAiDrawerOpen) return null;

  return (
    <aside ref={panelRef} role="dialog" aria-label="Trò chuyện demo · có thể sử dụng thanh phát nhạc" tabIndex={-1} data-chat className="fixed top-0 right-0 bottom-[132px] sm:bottom-[88px] w-full sm:w-[420px] bg-white dark:bg-[#0B0F19] border-l border-slate-200 dark:border-white/10 z-50 flex flex-col justify-between animate-in slide-in-from-right transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Trò chuyện</span>
              <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 font-medium">
                Demo
              </span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Phân tích tâm trạng & gợi ý Playlist
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Đóng trò chuyện"
          onClick={toggleAiDrawer}
          className="w-11 h-11 shrink-0 rounded-lg hover:bg-slate-100 text-slate-600 dark:hover:bg-white/5 dark:text-slate-400 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message Chat Feed */}
      <div aria-live="polite" aria-busy={isTyping} className="min-h-0 flex-1 overflow-y-auto p-4 flex flex-col gap-4 spotify-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-2 ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              {msg.sender === 'user' ? (
                <>
                  <span>Anh Đạt</span>
                  <User className="w-3 h-3" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3" />
                  <span className="font-medium">DMPTiFy</span>
                </>
              )}
            </div>

            <div
              className={`select-text min-w-0 p-3.5 rounded-xl max-w-[90%] text-base leading-relaxed [overflow-wrap:anywhere] ${
                msg.sender === 'user'
                  ? 'bg-emerald-700 text-white rounded-tr-none'
                  : 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white rounded-tl-none border border-slate-200 dark:border-white/5'
              }`}
            >
              {msg.text}
            </div>

            {/* AI Function Calling Analysis Card */}
            {msg.detectedMood && (
              <div className="w-full min-w-0 p-3 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col gap-2 mt-1">
                <div className="flex flex-wrap gap-2 items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Tâm trạng nhận diện:</span>
                  </span>
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {msg.detectedMood}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                  BPM khuyến nghị: {msg.targetBpm} BPM
                </div>

                {/* Recommended Songs Preview */}
                {msg.recommendedSongs && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-indigo-200/60 dark:border-white/10">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Playlist Đề Xuất:
                    </span>
                    {msg.recommendedSongs.map((song) => (
                      <div
                        key={song.id}
                        onClick={() => playSong(song)}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/80 hover:bg-white dark:bg-black/40 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 cursor-pointer transition-colors group shadow-sm dark:shadow-none"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="relative w-8 h-8 rounded overflow-hidden shrink-0">
                            <Image
                              src={song.coverUrl}
                              alt={song.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {song.title}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {song.artist}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          aria-label={`Phát ${song.title}`}
                          className="w-11 h-11 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0"
                        >
                          <Play className="w-3 h-3 fill-slate-950 translate-x-0.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 py-2">
            <LoaderCircle className="w-4 h-4 animate-spin" />
            <span>Đang chuẩn bị gợi ý...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Suggestions */}
      <details className="shrink-0 px-3 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20">
        <summary className="min-h-11 cursor-pointer py-3 text-sm text-slate-600 dark:text-slate-400 font-medium">Gợi ý nhanh tâm trạng</summary>
        <div className="flex max-h-40 overflow-y-auto flex-wrap gap-1.5 pb-3">
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              type="button"
              key={idx}
              disabled={isTyping}
              onClick={() => handleSendMessage(p)}
              className="min-h-11 text-sm px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 dark:hover:bg-white/5 dark:text-slate-300 transition-colors max-w-full text-left [overflow-wrap:anywhere]"
            >
              {p}
            </button>
          ))}
        </div>
      </details>

      {/* Input Box */}
      <div className="p-3.5 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#070A10] flex items-center gap-2">
        <label htmlFor="chat-message" className="sr-only">Tin nhắn trò chuyện</label>
        <input
          id="chat-message"
          data-panel-initial-focus
          type="text"
          aria-label="Tin nhắn trò chuyện"
          maxLength={2000}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSendMessage()}
          placeholder="Tâm sự tâm trạng của anh hôm nay..."
          className="min-w-0 h-11 flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 text-base text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          type="button"
          aria-label="Gửi tin nhắn"
          disabled={isTyping || !inputMessage.trim()}
          onClick={() => handleSendMessage()}
          className="w-11 h-11 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center shrink-0 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
