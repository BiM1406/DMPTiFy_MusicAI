'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Sparkles, Send, Play, Bot, User, CheckCircle2 } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { MOCK_SONGS } from '../../lib/mock-songs';
import { Song } from '../../types/music';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  detectedMood?: string;
  targetBpm?: number;
  recommendedSongs?: Song[];
}

const QUICK_PROMPTS = [
  '🌧️ Hôm nay mưa buồn, áp lực thi cử mệt mỏi quá...',
  '🌿 Đêm muộn rồi, cho anh xin vài bài Acoustic nhẹ nhàng để ngủ',
  '⚡ Vừa hoàn thành xong task đồ án, cần nhạc quẩy ăn mừng!',
  '🧠 Đang cần tập trung cao độ để code Next.js',
];

export const AiChatDrawer: React.FC = () => {
  const { isAiDrawerOpen, toggleAiDrawer, playSong } = useAudioStore();
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Chào anh Đạt! Em là Trợ lý Cảm xúc AI của DMPTiFy. Hôm nay tâm trạng anh thế nào? Hãy tâm sự với em để em chọn đúng giai điệu chữa lành cho anh nhé!',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate Gemini 2.5 Flash Function Calling
    setTimeout(() => {
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
        id: String(Date.now() + 1),
        sender: 'ai',
        text: replyText,
        detectedMood,
        targetBpm,
        recommendedSongs: recommended,
      };

      setMessages((prev) => [...prev, aiReply]);
      setIsTyping(false);
    }, 900);
  };

  if (!isAiDrawerOpen) return null;

  return (
    <aside className="fixed top-0 right-0 bottom-[88px] w-full sm:w-[420px] bg-[#0B0F19]/95 backdrop-blur-2xl border-l border-white/10 z-40 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Trợ Lý Cảm Xúc AI</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold">
                Gemini 2.5
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Phân tích tâm trạng & gợi ý Playlist
            </p>
          </div>
        </div>

        <button
          onClick={toggleAiDrawer}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message Chat Feed */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 spotify-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-2 ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              {msg.sender === 'user' ? (
                <>
                  <span>Anh Đạt</span>
                  <User className="w-3 h-3" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-indigo-400" />
                  <span className="text-indigo-300 font-semibold">DMPTiFy AI</span>
                </>
              )}
            </div>

            <div
              className={`p-3.5 rounded-2xl max-w-[90%] text-xs lg:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-medium rounded-tr-none shadow-md shadow-emerald-500/10'
                  : 'bg-white/10 text-white rounded-tl-none border border-white/5'
              }`}
            >
              {msg.text}
            </div>

            {/* AI Function Calling Analysis Card */}
            {msg.detectedMood && (
              <div className="w-full p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/25 flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-indigo-300 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tâm trạng nhận diện:</span>
                  </span>
                  <span className="text-white font-semibold">
                    {msg.detectedMood}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 font-mono">
                  BPM khuyến nghị: {msg.targetBpm} BPM
                </div>

                {/* Recommended Songs Preview */}
                {msg.recommendedSongs && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Playlist Đề Xuất:
                    </span>
                    {msg.recommendedSongs.map((song) => (
                      <div
                        key={song.id}
                        onClick={() => playSong(song)}
                        className="flex items-center justify-between p-2 rounded-lg bg-black/40 hover:bg-white/10 border border-white/5 cursor-pointer transition-colors group"
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
                            <span className="text-xs font-semibold text-white truncate group-hover:text-emerald-400">
                              {song.title}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              {song.artist}
                            </span>
                          </div>
                        </div>

                        <button className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
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
          <div className="flex items-center gap-2 text-xs text-indigo-400 italic py-2">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>AI đang thấu cảm và bốc thuốc âm nhạc...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts Suggestions */}
      <div className="p-3 border-t border-white/5 flex flex-col gap-2 bg-black/20">
        <span className="text-[10px] text-slate-400 font-medium">
          Gợi ý nhanh tâm trạng:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-all truncate max-w-full text-left"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-3.5 border-t border-white/10 bg-[#070A10] flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Tâm sự tâm trạng của anh hôm nay..."
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
        />
        <button
          onClick={() => handleSendMessage()}
          className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 transition-transform active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
