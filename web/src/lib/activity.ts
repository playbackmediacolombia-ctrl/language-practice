import { useEffect } from 'react';
import type { Lang } from './content';
import { addPracticeTime } from './progress';

// Time practiced, for the stats: counts while a practice screen for a language is open, the app
// is on screen, and you've touched it in the last two minutes (listening to a story counts:
// pressing play is a touch). Saved every half minute and when you leave the screen.

const IDLE_MS = 2 * 60 * 1000;
const TICK_MS = 5000;
const SAVE_EVERY = 30; // seconds

export function usePracticeTime(lang: Lang | null) {
  useEffect(() => {
    if (!lang) return;
    let last = Date.now();
    let active = Date.now();
    let pending = 0;
    const tick = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && now - active < IDLE_MS) pending += Math.min(now - last, TICK_MS * 2) / 1000;
      last = now;
    };
    const save = () => {
      tick();
      if (pending >= 1) {
        addPracticeTime(lang, Math.round(pending));
        pending = 0;
      }
    };
    const poke = () => {
      tick();
      active = Date.now();
    };
    const timer = setInterval(() => {
      tick();
      if (pending >= SAVE_EVERY) save();
    }, TICK_MS);
    const onVisibility = () => (document.visibilityState === 'hidden' ? save() : ((last = Date.now()), (active = Date.now())));
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, poke, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', save);
    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, poke, { capture: true }));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', save);
      save();
    };
  }, [lang]);
}
