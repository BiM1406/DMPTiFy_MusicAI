'use client';

import React, { useState } from 'react';
import { useJamStore } from '../../store/useJamStore';
import { Users, Copy, Check, LogOut, Radio, X, Heart, Flame, ThumbsUp, Sparkles, Music } from 'lucide-react';
import { CoverImage } from '../common/CoverImage';

export const JamRoomModal: React.FC = () => {
  const isModalOpen = useJamStore((s) => s.isModalOpen);
  const closeModal = useJamStore((s) => s.closeModal);
  const room = useJamStore((s) => s.room);
  const myMemberId = useJamStore((s) => s.myMemberId);
  const myName = useJamStore((s) => s.myName);
  const setMyName = useJamStore((s) => s.setMyName);
  const createRoom = useJamStore((s) => s.createRoom);
  const joinRoom = useJamStore((s) => s.joinRoom);
  const leaveRoom = useJamStore((s) => s.leaveRoom);
  const broadcastReaction = useJamStore((s) => s.broadcastReaction);
  const initialCode = useJamStore((s) => s.initialCode);
  const isConnecting = useJamStore((s) => s.isConnecting);
  const error = useJamStore((s) => s.error);

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [inputCode, setInputCode] = useState(initialCode || '');
  const [prevInitialCode, setPrevInitialCode] = useState(initialCode);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (initialCode !== prevInitialCode) {
    setPrevInitialCode(initialCode);
    setInputCode(initialCode);
    if (initialCode) {
      setTab('join');
    }
  }

  if (!isModalOpen) return null;

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!room) return;
    const link = `${window.location.origin}/?jam=${room.code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    await joinRoom(inputCode, myName);
  };

  const handleCreate = async () => {
    await createRoom();
  };

  const reactionButtons = [
    { id: 'heart', label: 'Yêu thích', Icon: Heart },
    { id: 'flame', label: 'Sôi động', Icon: Flame },
    { id: 'clap', label: 'Vỗ tay', Icon: ThumbsUp },
    { id: 'sparkles', label: 'Thư giãn', Icon: Sparkles },
    { id: 'music', label: 'Âm nhạc', Icon: Music },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="jam-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border-hairline bg-surface-overlay p-6 shadow-2xl text-slate-800 dark:text-slate-100 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border-hairline">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Radio size={20} className={room?.isPlaying ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h2 id="jam-modal-title" className="text-base font-semibold leading-none">
                Nghe nhạc chung (Jam Room)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {room ? `Phòng ${room.code} • ${room.members.length} người đang nghe` : 'Cùng nghe nhạc đồng bộ thời gian thực'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Đóng cửa sổ"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div role="alert" className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        {/* Not in room state */}
        {!room ? (
          <div className="flex flex-col gap-4">
            {/* Tab switch */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-white/5 text-sm font-medium">
              <button
                type="button"
                onClick={() => setTab('create')}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  tab === 'create'
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tạo phòng mới
              </button>
              <button
                type="button"
                onClick={() => setTab('join')}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  tab === 'join'
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Nhập mã vào phòng
              </button>
            </div>

            {/* Name Input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="jam-user-name" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Tên hiển thị của bạn
              </label>
              <input
                id="jam-user-name"
                type="text"
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder="Nhập tên của bạn"
                maxLength={30}
                className="min-h-11 px-3 py-2 text-sm rounded-lg border border-border-hairline bg-surface-card focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {tab === 'create' ? (
              <div className="flex flex-col gap-3 pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bạn sẽ là Trưởng phòng (Host). Bài hát bạn đang nghe sẽ tự động phát đồng bộ cho tất cả bạn bè tham gia.
                </p>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isConnecting}
                  className="min-h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 transition-colors shadow-md disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  <span>{isConnecting ? 'Đang tạo phòng...' : 'Bắt đầu nghe chung'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleJoin} className="flex flex-col gap-3 pt-1">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="jam-code-input" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Mã phòng nghe chung
                  </label>
                  <input
                    id="jam-code-input"
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="VD: DMPT-ABCD"
                    maxLength={10}
                    className="min-h-11 px-3 py-2 text-sm font-mono rounded-lg border border-border-hairline bg-surface-card focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isConnecting || !inputCode.trim()}
                  className="min-h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 transition-colors shadow-md disabled:opacity-50"
                >
                  <Users size={16} />
                  <span>{isConnecting ? 'Đang kết nối...' : 'Tham gia phòng'}</span>
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Active Room View */
          <div className="flex flex-col gap-4">
            {/* Room Code Card */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border-hairline bg-surface-card">
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Mã phòng</p>
                <p className="text-xl font-bold font-mono tracking-widest text-emerald-600 dark:text-emerald-400">{room.code}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  aria-label="Sao chép mã phòng"
                  className="flex h-9 px-3 items-center gap-1.5 rounded-lg border border-border-hairline text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  {copiedCode ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Đã sao chép' : 'Sao chép mã'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  aria-label="Sao chép link mời"
                  className="flex h-9 px-3 items-center gap-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                >
                  {copiedLink ? <Check size={14} /> : <Radio size={14} />}
                  <span>{copiedLink ? 'Đã sao chép' : 'Copy link'}</span>
                </button>
              </div>
            </div>

            {/* Now Playing in Room */}
            {room.currentSong && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border-hairline bg-surface-card">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border-hairline bg-slate-800">
                  <CoverImage
                    src={room.currentSong.coverUrl}
                    alt={room.currentSong.title}
                    sizes="48px"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{room.currentSong.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{room.currentSong.artist}</p>
                </div>
                <span className="text-[10px] font-medium px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {room.isPlaying ? 'Đang phát' : 'Đang tạm dừng'}
                </span>
              </div>
            )}

            {/* Members Section */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Thành viên trong phòng ({room.members.length})
              </p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {room.members.map((m) => {
                  const isMe = m.id === myMemberId;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-hairline bg-surface-card text-xs font-medium"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{m.name}</span>
                      {m.isHost && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                          Host
                        </span>
                      )}
                      {isMe && <span className="text-[9px] text-slate-400">(Bạn)</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reactions */}
            <div className="flex flex-col gap-2 pt-1 border-t border-border-hairline">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Thả cảm xúc trực tiếp</p>
              <div className="flex items-center justify-around">
                {reactionButtons.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => broadcastReaction(id)}
                    aria-label={`Thả cảm xúc ${label}`}
                    title={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-transform"
                  >
                    <Icon size={18} />
                  </button>
                ))}
              </div>
            </div>

            {/* Leave Room Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={leaveRoom}
                className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-medium text-xs hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut size={15} />
                <span>Rời phòng nghe chung</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
