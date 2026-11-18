'use client';

import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system' | 'liquid-glass';

interface ThemeStore {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark' | 'liquid-glass';
  setTheme: (theme: ThemeMode) => void;
  initTheme: () => (() => void) | undefined;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDocument(theme: ThemeMode): 'light' | 'dark' | 'liquid-glass' {
  if (typeof document === 'undefined') return 'dark';
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  const root = document.documentElement;

  if (resolved === 'liquid-glass') {
    root.classList.add('dark', 'liquid-glass');
    root.classList.remove('light');
  } else if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light', 'liquid-glass');
  } else {
    root.classList.add('light');
    root.classList.remove('dark', 'liquid-glass');
  }

  return resolved;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'system',
  resolvedTheme: 'dark',

  setTheme: (theme: ThemeMode) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dmptify-theme', theme);
      } catch (e) {
        console.warn('Could not save theme to localStorage:', e);
      }
    }
    const resolved = applyThemeToDocument(theme);
    set({ theme, resolvedTheme: resolved });
  },

  initTheme: () => {
    if (typeof window === 'undefined') return;

    let savedTheme: ThemeMode = 'system';
    try {
      const stored = localStorage.getItem('dmptify-theme') as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system' || stored === 'liquid-glass') {
        savedTheme = stored;
      }
    } catch (e) {
      console.warn('Could not read theme from localStorage:', e);
    }

    const resolved = applyThemeToDocument(savedTheme);
    set({ theme: savedTheme, resolvedTheme: resolved });

    // Listen to OS system color scheme changes if in 'system' mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const currentTheme = get().theme;
      if (currentTheme === 'system') {
        const newResolved = applyThemeToDocument('system');
        set({ resolvedTheme: newResolved });
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  },
}));
