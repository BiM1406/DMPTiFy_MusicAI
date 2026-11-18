'use client';

import { useEffect, type RefObject } from 'react';

const focusable = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href], [tabindex]:not([tabindex="-1"])';

/** Keep obscured content inert; music controls remain accessible for listening panels. */
export function usePanelFocus(ref: RefObject<HTMLElement | null>, open: boolean, allowPlayer = false) {
  useEffect(() => {
    const panel = ref.current;
    if (!open || !panel) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.getElementById('music-app');
    const siblings = Array.from(root?.children ?? []).filter((el): el is HTMLElement => el instanceof HTMLElement && el !== panel && !el.contains(panel) && !el.hasAttribute('data-panel-backdrop') && !(allowPlayer && el.hasAttribute('data-player')));
    const previous = siblings.map(el => ({ el, inert: el.inert }));
    siblings.forEach(el => { el.inert = true; });
    const visibleControls = () => {
      const roots = [panel, ...(allowPlayer ? Array.from(document.querySelectorAll<HTMLElement>('[data-player]')) : [])];
      return roots.flatMap(el => Array.from(el.querySelectorAll<HTMLElement>(focusable))).filter(el => !el.closest('[inert]') && el.getClientRects().length > 0);
    };
    const first = panel.querySelector<HTMLElement>('[data-panel-initial-focus]') ?? visibleControls()[0] ?? panel;
    first.focus({ preventScroll: true });
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const controls = visibleControls();
      if (!controls.length) { e.preventDefault(); panel.focus(); return; }
      const index = controls.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && index <= 0) { e.preventDefault(); controls.at(-1)?.focus(); }
      else if (!e.shiftKey && (index === -1 || index === controls.length - 1)) { e.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      previous.forEach(({el, inert}) => { el.inert = inert; });
      if (trigger?.isConnected && !trigger.closest('[inert]') && trigger.getClientRects().length) trigger.focus({ preventScroll: true });
    };
  }, [ref, open, allowPlayer]);
}
