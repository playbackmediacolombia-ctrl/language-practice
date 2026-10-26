import { getProgress, subscribe, type Theme } from './progress';

// Light, dark, or follow the phone. The stylesheet does the work; this sets
// <html data-theme> and keeps the status bar / browser chrome color in step.

const BG = { light: '#F4F8FF', dark: '#070D1A' };
const dark = matchMedia('(prefers-color-scheme: dark)');

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = theme;
  const isDark = theme === 'dark' || (theme === 'auto' && dark.matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', isDark ? BG.dark : BG.light));
}

export function initTheme() {
  let last: Theme | null = null;
  const sync = () => {
    const theme = getProgress().theme;
    if (theme !== last) apply((last = theme));
  };
  sync();
  subscribe(sync);
  dark.addEventListener('change', () => apply(getProgress().theme));
}
