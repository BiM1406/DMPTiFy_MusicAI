'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Compass, ChartNoAxesColumn, Library, Plus, Heart, MessageCircle, ListMusic, X } from 'lucide-react';
import { useAudioStore, LibraryView } from '../../store/useAudioStore';
import { usePanelFocus } from '../../hooks/usePanelFocus';

interface SidebarProps { isMobileOpen: boolean; onMobileClose: () => void }
export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  const view = useAudioStore(s => s.view);
  const activePlaylistId = useAudioStore(s => s.activePlaylistId);
  const playlists = useAudioStore(s => s.playlists);
  const setView = useAudioStore(s => s.setView);
  const selectPlaylist = useAudioStore(s => s.selectPlaylist);
  const createPlaylist = useAudioStore(s => s.createPlaylist);
  const toggleAiDrawer = useAudioStore(s => s.toggleAiDrawer);
  const isAiDrawerOpen = useAudioStore(s => s.isAiDrawerOpen);
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
  const navigate = (value: LibraryView) => { setView(value); onMobileClose(); };
  const item = (active: boolean) => `flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${active ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-white/10 dark:text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`;
  return <>
    {isMobileOpen && <button data-panel-backdrop tabIndex={-1} type="button" aria-label="Đóng menu điều hướng" onClick={onMobileClose} className="fixed inset-0 z-50 bg-black/40 md:hidden" />}
    <aside ref={panelRef} role={isMobileOpen ? 'dialog' : undefined} aria-modal={isMobileOpen || undefined} tabIndex={-1} aria-label="Menu chính" className={`fixed bottom-0 left-0 top-0 z-[60] w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-white/5 dark:bg-[#0B0F19] md:static md:z-auto md:h-full ${isMobileOpen ? 'flex' : 'hidden md:flex'}`}>
      <div className="mb-8 flex items-center justify-between px-3 py-2"><span className="text-xl font-bold tracking-tight">DMPTiFy<span className="text-emerald-500">.</span></span><button type="button" onClick={onMobileClose} aria-label="Đóng menu" className="flex h-11 w-11 items-center justify-center md:hidden"><X size={20} /></button></div>
      <nav aria-label="Điều hướng" className="space-y-1">
        {([{ id: 'discover', label: 'Khám phá', Icon: Compass }, { id: 'charts', label: 'Xếp hạng demo', Icon: ChartNoAxesColumn }, { id: 'library', label: 'Thư viện', Icon: Library }] as const).map(({id, label, Icon}) => <button type="button" key={id} onClick={() => navigate(id)} aria-current={view === id && !activePlaylistId ? 'page' : undefined} className={item(view === id && !activePlaylistId)}><Icon size={19} strokeWidth={1.7} /><span>{label}</span></button>)}
        <button type="button" onClick={() => { toggleAiDrawer(); onMobileClose(); }} aria-expanded={isAiDrawerOpen} className={item(isAiDrawerOpen)}><MessageCircle size={19} strokeWidth={1.7} /><span>Trò chuyện</span></button>
      </nav>
      <div className="mt-7 border-t border-slate-200 pt-5 dark:border-white/10">
        <div className="mb-2 flex items-center justify-between px-3"><h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Danh sách phát</h2><button type="button" aria-label="Tạo danh sách từ bài đang chọn" aria-expanded={creating} onClick={() => setCreating(!creating)} className="flex h-11 w-11 items-center justify-center"><Plus size={17} /></button></div>
        {creating && <form className="mb-3 space-y-2 px-2" onSubmit={e => { e.preventDefault(); if (!title.trim()) return; createPlaylist(title); setTitle(''); setCreating(false); onMobileClose(); }}><label className="text-xs" htmlFor="playlist-name">Tên danh sách (thêm bài đang chọn)</label><input autoFocus id="playlist-name" maxLength={80} required value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded border border-slate-300 bg-transparent p-2 text-sm dark:border-white/20" /><button type="submit" className="rounded bg-emerald-600 px-3 py-2 text-xs text-white">Tạo danh sách</button></form>}
        <button type="button" className={item(view === 'library')} onClick={() => navigate('library')}><Heart size={18} strokeWidth={1.7} /><span>Bài hát đã thích</span></button>
        {playlists.map(pl => <button type="button" key={pl.id} onClick={() => { selectPlaylist(pl.id); onMobileClose(); }} className={item(activePlaylistId === pl.id)} aria-current={activePlaylistId === pl.id ? 'page' : undefined}><ListMusic size={18} strokeWidth={1.7} className="shrink-0" /><span className="truncate">{pl.title}</span></button>)}
      </div>
      <p className="mt-auto px-3 pt-8 text-xs leading-5 text-slate-500">Bản demo · Danh sách của bạn được lưu trong phiên này.</p>
    </aside>
  </>;
};
