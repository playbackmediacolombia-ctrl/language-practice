import { useSyncExternalStore } from 'react';

// Hash routing (#/es/food/quiz) so GitHub Pages never needs server-side routes.

function current(): string[] {
  return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

let segments = current();
window.addEventListener('hashchange', () => {
  segments = current();
  window.scrollTo(0, 0);
});

export function useRoute(): string[] {
  return useSyncExternalStore(
    (l) => {
      window.addEventListener('hashchange', l);
      return () => window.removeEventListener('hashchange', l);
    },
    () => segments,
  );
}

export function navigate(path: string, replace = false) {
  const hash = `#${path}`;
  if (replace) location.replace(hash);
  else location.hash = hash;
}
