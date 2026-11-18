'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAudioStore } from '../store/useAudioStore';

export function useTabVisibility() {
  const currentSong = useAudioStore((s) => s.currentSong);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const autoPipEnabled = useAudioStore((s) => s.autoPipEnabled);
  const [isPipOpen, setIsPipOpen] = useState(false);
  const [showInTabMiniPlayer, setShowInTabMiniPlayer] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const marqueeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Marquee Title when tab is hidden
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const originalTitle = 'DMPTiFy - Music AI';

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (isPlaying && currentSong) {
          let step = 0;
          const fullText = `▶ ${currentSong.title} — ${currentSong.artist} • DMPTiFy   `;

          if (marqueeIntervalRef.current) clearInterval(marqueeIntervalRef.current);

          marqueeIntervalRef.current = setInterval(() => {
            const display = fullText.slice(step) + fullText.slice(0, step);
            document.title = display.slice(0, 30);
            step = (step + 1) % fullText.length;
          }, 800);

          // If auto-pip is enabled and PiP is not yet open, show in-tab floating player
          if (autoPipEnabled && !pipWindowRef.current) {
            setShowInTabMiniPlayer(true);
          }
        }
      } else {
        // Tab is visible again
        if (marqueeIntervalRef.current) {
          clearInterval(marqueeIntervalRef.current);
          marqueeIntervalRef.current = null;
        }
        document.title = originalTitle;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (marqueeIntervalRef.current) {
        clearInterval(marqueeIntervalRef.current);
        marqueeIntervalRef.current = null;
      }
      document.title = originalTitle;
    };
  }, [isPlaying, currentSong, autoPipEnabled]);

  // Document Picture-in-Picture API Trigger
  const openDocumentPip = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Check if browser supports Document PiP
    const pipApi = (window as unknown as { documentPictureInPicture?: { requestWindow: (opts: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;

    if (pipApi) {
      try {
        if (pipWindowRef.current) {
          pipWindowRef.current.close();
          pipWindowRef.current = null;
          setIsPipOpen(false);
          return;
        }

        const pipWindow = await pipApi.requestWindow({
          width: 360,
          height: 180,
        });

        pipWindowRef.current = pipWindow;
        setIsPipOpen(true);
        setShowInTabMiniPlayer(false);

        // Copy styles
        const allStyleSheets = Array.from(document.styleSheets);
        allStyleSheets.forEach((styleSheet) => {
          try {
            if (styleSheet.href) {
              const link = pipWindow.document.createElement('link');
              link.rel = 'stylesheet';
              link.href = styleSheet.href;
              pipWindow.document.head.appendChild(link);
            } else if (styleSheet.cssRules) {
              const style = pipWindow.document.createElement('style');
              Array.from(styleSheet.cssRules).forEach((rule) => {
                style.appendChild(pipWindow.document.createTextNode(rule.cssText));
              });
              pipWindow.document.head.appendChild(style);
            }
          } catch {
            // Ignore cross-origin stylesheet errors
          }
        });

        // Set PiP title & dark background
        pipWindow.document.title = currentSong ? `${currentSong.title} • DMPTiFy PiP` : 'DMPTiFy Mini Player';
        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.padding = '8px';
        pipWindow.document.body.style.backgroundColor = '#0b0d14';
        pipWindow.document.body.style.color = '#ffffff';
        pipWindow.document.body.style.fontFamily = 'Inter, system-ui, sans-serif';
        pipWindow.document.body.style.overflow = 'hidden';

        const container = pipWindow.document.createElement('div');
        container.id = 'pip-root';
        pipWindow.document.body.appendChild(container);

        // Render helper function into PiP container
        const renderPipContent = () => {
          const song = useAudioStore.getState().currentSong;
          const playing = useAudioStore.getState().isPlaying;
          if (!song) return;

          container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:8px; height:100%; justify-content:space-between; box-sizing:border-box;">
              <div style="display:flex; align-items:center; gap:10px;">
                <img src="${song.coverUrl}" style="width:48px; height:48px; border-radius:8px; object-fit:cover; border:1px solid rgba(255,255,255,0.15);" />
                <div style="flex:1; min-width:0; overflow:hidden;">
                  <div style="font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${song.title}</div>
                  <div style="font-size:11px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${song.artist}</div>
                </div>
              </div>
              <div style="display:flex; align-items:center; justify-content:center; gap:16px;">
                <button id="pip-prev" style="background:transparent; border:none; color:#cbd5e1; cursor:pointer; font-size:16px; padding:6px;">⏮</button>
                <button id="pip-play" style="background:#10b981; border:none; color:#022c22; font-weight:bold; width:36px; height:36px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px;">${playing ? '⏸' : '▶'}</button>
                <button id="pip-next" style="background:transparent; border:none; color:#cbd5e1; cursor:pointer; font-size:16px; padding:6px;">⏭</button>
              </div>
            </div>
          `;

          const prevBtn = container.querySelector('#pip-prev');
          const playBtn = container.querySelector('#pip-play');
          const nextBtn = container.querySelector('#pip-next');

          if (prevBtn) prevBtn.addEventListener('click', () => useAudioStore.getState().prevSong());
          if (playBtn) playBtn.addEventListener('click', () => useAudioStore.getState().togglePlay());
          if (nextBtn) nextBtn.addEventListener('click', () => useAudioStore.getState().nextSong());
        };

        renderPipContent();

        // Subscribe to store updates for PiP re-render
        const unsub = useAudioStore.subscribe(() => {
          renderPipContent();
        });

        pipWindow.addEventListener('pagehide', () => {
          unsub();
          pipWindowRef.current = null;
          setIsPipOpen(false);
        });
      } catch (err) {
        console.warn('Document Picture-in-Picture error, falling back to floating mini player:', err);
        setShowInTabMiniPlayer(true);
      }
    } else {
      // Fallback: Toggle floating mini player inside current tab
      setShowInTabMiniPlayer((prev) => !prev);
    }
  }, [currentSong]);

  const closeMiniPlayer = useCallback(() => {
    setShowInTabMiniPlayer(false);
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }
    setIsPipOpen(false);
  }, []);

  return {
    isPipOpen,
    showInTabMiniPlayer,
    openDocumentPip,
    closeMiniPlayer,
  };
}
