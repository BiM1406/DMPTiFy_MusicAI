'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Compass, ChartNoAxesColumn, Library, Plus, Heart, MessageCircle, ListMusic, X } from 'lucide-react';
import { useAudioStore, LibraryView } from '../../store/useAudioStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePanelFocus } from '../../hooks/usePanelFocus';

interface SidebarProps { isMobileOpen: boolean; onMobileClose: () => void }
export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  const view = useAudioStore(s => s.view);
  const likedSectionActive = useAudioStore(s => s.likedSectionActive);
  const activePlaylistId = useAudioStore(s => s.activePlaylistId);
  const playlists = useAudioStore(s => s.playlists);
  const setView = useAudioStore(s => s.setView);
  const selectPlaylist = useAudioStore(s => s.selectPlaylist);
  const createPlaylist = useAudioStore(s => s.createPlaylist);
  const toggleAiDrawer = useAudioStore(s => s.toggleAiDrawer);
  const isAiDrawerOpen = useAudioStore(s => s.isAiDrawerOpen);
  const authUser = useAuthStore(s => s.user);
  const isAuthenticated = Boolean(authUser);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const panelRef = useRef<HTMLElement>(null);
  usePanelFocus(panelRef, isMobileOpen);
  useEffect(() => {
    if (!isMobileOpen) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') onMobileClose(); };
    window.addEventListener('keydown', close);
    const media = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (media.matches) onMobileClose(); };
    media.addEventListener('change', closeOnDesktop);
    return () => { window.removeEventListener('keydown', close); media.removeEventListener('change', closeOnDesktop); };
  }, [isMobileOpen, onMobileClose]);
  const navigate = (value: LibraryView, likedSection = false) => { setView(value, likedSection); onMobileClose(); };
  const isLikedNav = isAuthenticated && view === 'library' && likedSectionActive && !activePlaylistId;
  const item = (active: boolean) => `flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${active ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-white/10 dark:text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`;
  return <>
    {isMobileOpen && <button data-panel-backdrop tabIndex={-1} type="button" aria-label="Đóng menu điều hướng" onClick={onMobileClose} className="fixed inset-0 z-[55] bg-black/40 md:hidden" />}
    <aside ref={panelRef} role={isMobileOpen ? 'dialog' : undefined} aria-modal={isMobileOpen || undefined} tabIndex={-1} aria-label="Menu chính" className={`fixed bottom-0 left-0 top-0 z-[60] w-64 shrink-0 flex-col overflow-y-auto border-r border-border-hairline bg-surface-chrome p-4 md:static md:z-auto md:h-full ${isMobileOpen ? 'flex' : 'hidden md:flex'}`}>
      <div className="mb-8 flex items-center justify-between px-3 py-2"><span className="text-xl font-bold tracking-tight">DMPTiFy<span className="text-emerald-500">.</span></span><button type="button" onClick={onMobileClose} aria-label="Đóng menu" className="flex h-11 w-11 items-center justify-center md:hidden"><X size={20} /></button></div>
      <nav aria-label="Điều hướng" className="space-y-1">
        {([{ id: 'discover', label: 'Khám phá', Icon: Compass }, { id: 'charts', label: 'Bảng xếp hạng', Icon: ChartNoAxesColumn }, { id: 'library', label: 'Thư viện', Icon: Library }] as const).map(({id, label, Icon}) => {
          const isActive = view === id && !activePlaylistId && (id !== 'library' || !likedSectionActive);
          return <button type="button" key={id} onClick={() => navigate(id)} aria-current={isActive ? 'page' : undefined} className={item(isActive)}><Icon size={19} strokeWidth={1.7} /><span>{label}</span></button>;
        })}
        <button type="button" onClick={() => { toggleAiDrawer(); onMobileClose(); }} aria-expanded={isAiDrawerOpen} className={item(isAiDrawerOpen)}><MessageCircle size={19} strokeWidth={1.7} /><span>Trò chuyện</span></button>
      </nav>
      <div className="mt-7 border-t border-border-hairline pt-5">
        <div className="mb-2 flex items-center justify-between px-3"><h2 className="text-xs font-medium text-slate-600 dark:text-slate-400">Danh sách phát</h2><button type="button" aria-label="Tạo danh sách từ bài đang chọn" aria-expanded={creating} onClick={() => setCreating(!creating)} className="flex h-11 w-11 items-center justify-center"><Plus size={17} /></button></div>
        {creating && <form className="mb-3 space-y-2 px-2" onSubmit={e => { e.preventDefault(); if (!title.trim()) return; createPlaylist(title); setTitle(''); setCreating(false); onMobileClose(); }}><label className="text-xs text-slate-700 dark:text-slate-300" htmlFor="playlist-name">Tên danh sách (thêm bài đang chọn)</label><input autoFocus id="playlist-name" maxLength={80} required value={title} onChange={e => setTitle(e.target.value)} className="min-h-11 w-full rounded-lg border border-border-hairline bg-transparent px-3 py-2 text-base text-slate-900 dark:text-white" /><button type="submit" className="min-h-11 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-semibold text-white transition-colors">Tạo danh sách</button></form>}
        {isAuthenticated && (
          <button type="button" aria-current={isLikedNav ? 'page' : undefined} className={item(isLikedNav)} onClick={() => navigate('library', true)}>
            <Heart size={18} strokeWidth={1.7} />
            <span>Bài hát đã thích</span>
          </button>
        )}
        {playlists.length > 0 ? (
          playlists.map(pl => (
            <button type="button" key={pl.id} onClick={() => { selectPlaylist(pl.id); onMobileClose(); }} className={item(activePlaylistId === pl.id)} aria-current={activePlaylistId === pl.id ? 'page' : undefined}>
              <ListMusic size={18} strokeWidth={1.7} className="shrink-0" />
              <span className="truncate">{pl.title}</span>
            </button>
          ))
        ) : (
          !creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-border-hairline px-3 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:border-emerald-400 dark:hover:text-emerald-400"
            >
              <Plus size={16} strokeWidth={1.7} />
              <span>+ Tạo danh sách phát</span>
            </button>
          )
        )}
      </div>
      <p className="mt-auto px-3 pt-8 text-xs leading-5 text-slate-600 dark:text-slate-400">
        {authUser ? `Đã đồng bộ thư viện · ${authUser.fullName}` : 'Đăng nhập để đồng bộ danh sách phát vào tài khoản.'}
      </p>
    </aside>
  </>;
};
