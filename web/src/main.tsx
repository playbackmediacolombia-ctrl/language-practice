import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { applyUpdateWhenIdle, requestPersistence, watchForUpdates } from './lib/offline';
import { initTheme } from './lib/theme';
import '@fontsource-variable/plus-jakarta-sans/wght.css'; // Plus Jakarta Sans (SIL Open Font License), bundled so it works offline
import './styles.css';

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: () => applyUpdateWhenIdle(() => updateSW(true)),
  onRegisteredSW: (_url, r) => watchForUpdates(r),
});
requestPersistence(); // so Safari doesn't clear lessons, audio and the speech model when space runs low
initTheme();
// Without view transitions (older iOS), screens fade in with CSS instead.
if (!(document as { startViewTransition?: unknown }).startViewTransition) document.documentElement.classList.add('no-vt');
// iOS only applies :active (the press-down effect) when the page listens for touches.
document.addEventListener('touchstart', () => {}, { passive: true });

// The app-start intro (index.html) removes itself once it has faded; and "recently open" is
// refreshed whenever the app goes to the background, so a quick reopen skips it.
const intro = document.getElementById('intro');
if (intro) setTimeout(() => intro.remove(), 1500);
const seen = () => {
  try {
    localStorage.setItem('intro-last', String(Date.now()));
  } catch {
    // Private mode or storage full: the intro just plays again next time.
  }
};
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && seen());
window.addEventListener('pagehide', seen);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
