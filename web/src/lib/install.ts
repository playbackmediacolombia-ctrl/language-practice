import { useEffect, useState } from 'react';

// Installing the app: Chrome on Android offers its own install prompt (beforeinstallprompt),
// which we keep and show when you tap Install; iPhone Safari has no prompt, so we show how to do
// it by hand. Once the app runs from the Home Screen (standalone), none of this shows.

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // keep it for our own button instead of Chrome's mini bar
  deferred = e as InstallPrompt;
  notify();
});
let installedNow = false;
window.addEventListener('appinstalled', () => {
  deferred = null;
  installedNow = true;
  notify();
});

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

const ua = navigator.userAgent;
/** iPhone or iPad Safari (iPadOS says it's a Mac, but has touch). */
export const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
export const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
/**
 * Safari's major version (26 for Safari 26), or 0 if unknown. Safari 26 moved Share into the
 * "⋯" menu. Its user agent keeps saying "OS 18_x", so the Safari version is read first.
 */
export const iosVersion = Number(ua.match(/Version\/(\d+)/)?.[1] ?? ua.match(/OS (\d+)_/)?.[1] ?? 0);

const DISMISS_KEY = 'install-card-dismissed';
const dismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/** What the install card can do here: 'prompt' (Chrome's), 'ios' (show the guide), or null (hide). */
export function useInstall() {
  const [, render] = useState(0);
  useEffect(() => {
    const l = () => render((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  const mode: 'prompt' | 'ios' | null = isStandalone() || installedNow || dismissed() ? null : deferred ? 'prompt' : isIOS ? 'ios' : null;
  return {
    mode,
    /** Chrome's install prompt; resolves true if it was installed. */
    prompt: async () => {
      const e = deferred;
      if (!e) return false;
      await e.prompt();
      const { outcome } = await e.userChoice;
      deferred = null;
      if (outcome === 'accepted') installedNow = true;
      notify();
      return outcome === 'accepted';
    },
    dismiss: () => {
      try {
        localStorage.setItem(DISMISS_KEY, '1');
      } catch {
        // private mode: it just shows again next time
      }
      notify();
    },
  };
}
