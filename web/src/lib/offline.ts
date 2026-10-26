import { useEffect, useState } from 'react';

// What's saved for use without a signal. The service worker precaches the app, every lesson,
// story and phrase recording, and the characters' stroke data; it only takes over once all of
// that is stored, so "active and in control" means the app works offline. The speech model is
// cached separately by transformers.js when it's downloaded (whisper.ts).

export type OfflineStatus = {
  /** App, lessons, stories and all audio stored by the service worker. */
  app: boolean;
  /** Files in the service worker's cache. */
  files: number;
  /** Bytes used by everything the app has stored (if the browser says). */
  usage: number | null;
  /** The browser promised not to clear the app's storage when space runs low. */
  persisted: boolean | null;
};

export const BUILD = __BUILD__;

// A Home Screen app on iPhone mostly resumes from memory instead of reloading, and the browser
// only looks for a new version on a full load. So also look whenever the app comes back to the
// screen, and every hour while it stays open.
let registration: ServiceWorkerRegistration | undefined;
export function watchForUpdates(r: ServiceWorkerRegistration | undefined) {
  registration = r;
  if (!r) return;
  const check = () => r.update().catch(() => {}); // offline: try again next time
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
  setInterval(check, 60 * 60 * 1000);
}

/** Settings › Check for updates: 'latest', 'updating' (it reloads in a moment) or 'offline'. */
export async function checkForUpdate(): Promise<'latest' | 'updating' | 'offline'> {
  try {
    const live = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json());
    if (live.commit === BUILD.commit) return 'latest';
    await registration?.update();
    // The new version installs in the background, then onNeedRefresh switches to it.
    return 'updating';
  } catch {
    return 'offline';
  }
}

/** Ask Safari to keep the app's storage (it decides; Home Screen apps usually get it). */
export function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {});
}

/**
 * A new version of the app has been downloaded: switch to it (a quick reload) as soon as you're
 * on a tab screen rather than in a lesson, story or exercise, so an update never interrupts you.
 */
export function applyUpdateWhenIdle(apply: () => void) {
  const busy = () => /^#\/(es|fr|zh)\/[^/]+/.test(location.hash);
  const tryNow = () => {
    if (busy()) return;
    window.removeEventListener('hashchange', tryNow);
    // Reload once the new version takes over (the plugin's own reload doesn't always fire in Safari).
    navigator.serviceWorker?.addEventListener('controllerchange', () => location.reload(), { once: true });
    apply();
  };
  window.addEventListener('hashchange', tryNow);
  tryNow();
}

export async function offlineStatus(): Promise<OfflineStatus> {
  let files = 0;
  try {
    for (const name of await caches.keys()) if (name.includes('precache')) files += (await (await caches.open(name)).keys()).length;
  } catch {
    // No Cache API (private browsing): nothing is stored.
  }
  const estimate = await navigator.storage?.estimate?.().catch(() => null);
  const persisted = (await navigator.storage?.persisted?.().catch(() => null)) ?? null;
  return { app: !!navigator.serviceWorker?.controller && files > 0, files, usage: estimate?.usage ?? null, persisted };
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export const formatBytes = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(n / 1e6))} MB`);
