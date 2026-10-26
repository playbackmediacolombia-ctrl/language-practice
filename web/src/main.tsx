import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { initTheme } from './lib/theme';
import './styles.css';

registerSW({ immediate: true });
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
