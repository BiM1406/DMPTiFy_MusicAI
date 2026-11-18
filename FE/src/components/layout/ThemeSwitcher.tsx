'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useThemeStore, ThemeMode } from '../../store/useThemeStore';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeSwitcher: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const initTheme = useThemeStore((s) => s.initTheme);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return initTheme();
  }, [initTheme]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const modes: { id: ThemeMode; label: string }[] = [
    { id: 'light', label: 'Sáng' },
    { id: 'dark', label: 'Tối' },
    { id: 'system', label: 'Hệ thống' },
  ];

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <div className="relative" ref={menuRef} onKeyDown={e => { if (e.key === 'Escape') { setIsOpen(false); menuRef.current?.querySelector('button')?.focus(); } }}>
      {/* 1 nút duy nhất thu gọn */}
      <button
        type="button"
        aria-label="Chọn giao diện"
        title="Giao diện"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
        aria-expanded={isOpen}
      >
        <ThemeIcon size={18} strokeWidth={1.7} />
      </button>

      {/* Menu dropdown hiện ra khi bấm */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-32 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-2xl p-1 z-50 animate-in fade-in duration-150">
          {modes.map((m) => {
            const isActive = theme === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setTheme(m.id);
                  setIsOpen(false);
                }}
                aria-pressed={isActive}
                className={`min-h-11 w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold dark:bg-white/10 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
