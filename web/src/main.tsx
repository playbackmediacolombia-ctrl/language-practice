import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { applyUpdateWhenIdle, requestPersistence } from './lib/offline';
import { initTheme } from './lib/theme';
import './styles.css';

const updateSW = registerSW({ immediate: true, onNeedRefresh: () => applyUpdateWhenIdle(() => updateSW(true)) });
requestPersistence(); // so Safari doesn't clear lessons, audio and the speech model when space runs low
initTheme();
// Without view transitions (older iOS), screens fade in with CSS instead.
if (!(document as { startViewTransition?: unknown }).startViewTransition) document.documentElement.classList.add('no-vt');
// iOS only applies :active (the press-down effect) when the page listens for touches.
document.addEventListener('touchstart', () => {}, { passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
