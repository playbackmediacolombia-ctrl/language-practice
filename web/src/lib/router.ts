import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

// Hash routing (#/es/food/quiz) so GitHub Pages never needs server-side routes.

function current(): string[] {
  return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

let segments = current();
const listeners = new Set<() => void>();

function changed() {
  const next = current();
  if (next.join('/') === segments.join('/')) return;
  segments = next;
  window.scrollTo(0, 0);
  listeners.forEach((l) => l());
}
// Back/forward between pushState entries fires popstate (and usually hashchange too).
window.addEventListener('hashchange', changed);
window.addEventListener('popstate', changed);

export function useRoute(): string[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => segments,
  );
}

/** How the next screen arrives: pushed from the right, popped back, or a tab switch (fade). */
export type Direction = 'forward' | 'back' | 'tab';

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => unknown };

export function navigate(path: string, { replace = false, direction = 'forward' as Direction } = {}) {
  const hash = `#${path}`;
  if (hash === location.hash) return;
  // Redirects can happen during render, so they go the plain (async hashchange) way.
  if (replace) return location.replace(hash);
  const go = () => {
    // pushState doesn't fire hashchange, so render here, synchronously, which is what a
    // view transition needs to capture the new screen.
    history.pushState(null, '', hash);
    flushSync(changed);
  };
  const doc = document as ViewTransitionDocument;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (doc.startViewTransition && !reduce) {
    document.documentElement.dataset.nav = direction;
    doc.startViewTransition(go);
  } else {
    go();
  }
}
