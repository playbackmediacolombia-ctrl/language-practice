import { useSyncExternalStore } from 'react';
import type { Lang } from './content';

// Recordings download per language: only the languages you learn take space on the phone. Each
// language's clips (lessons, stories, role-plays, chants, the phrasebook and its coach) are one
// "pack" in its own cache, which the service worker plays from, offline too. "coach" is the
// English coach's lines (every language uses them) and "en" the English meanings for hands-free.
// audio-packs.json (made by the build) lists each pack's files and size.

export type PackId = Lang | 'coach' | 'en';
type Manifest = Record<string, { bytes: number; files: string[] }>;
export type PackState = { done: number; total: number; bytes: number; downloading: boolean; error: boolean };

const cacheName = (pack: PackId) => `audio-${pack}`;
const supported = () => typeof caches !== 'undefined';
const testHook = location.search.includes('test');
/** Tests use other routes for audio unless they ask for packs (?packs). */
const autoDownload = !testHook || location.search.includes('packs');

let manifest: Promise<Manifest> | null = null;
const loadManifest = (): Promise<Manifest> =>
  (manifest ??= fetch('audio-packs.json')
    .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : ({} as Manifest)))
    .catch(() => {
      manifest = null; // try again next time (offline before the first download)
      return {} as Manifest;
    }));

const states = new Map<PackId, PackState>();
const running = new Map<PackId, Promise<void>>();
const listeners = new Set<() => void>();
const EMPTY: PackState = { done: 0, total: 0, bytes: 0, downloading: false, error: false };

function set(pack: PackId, next: Partial<PackState>) {
  states.set(pack, { ...(states.get(pack) ?? EMPTY), ...next });
  listeners.forEach((l) => l());
}

/** How much of a pack is on the phone (looks at its cache). */
export async function refreshPack(pack: PackId): Promise<PackState> {
  const m = (await loadManifest())[pack];
  if (!m || !supported()) {
    set(pack, { total: 0, done: 0, bytes: 0 });
    return states.get(pack)!;
  }
  const cache = await caches.open(cacheName(pack));
  const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  const done = m.files.filter((f) => have.has(new URL(f, document.baseURI).pathname)).length;
  set(pack, { done, total: m.files.length, bytes: m.bytes });
  return states.get(pack)!;
}

/** Downloads whatever's missing from a pack, a few files at a time. Safe to call again. */
export function downloadPack(pack: PackId): Promise<void> {
  const already = running.get(pack);
  if (already) return already;
  const job = (async () => {
    const m = (await loadManifest())[pack];
    if (!m || !supported() || !navigator.onLine) return;
    set(pack, { downloading: true, error: false, total: m.files.length, bytes: m.bytes });
    const cache = await caches.open(cacheName(pack));
    const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
    const todo = m.files.map((f) => new URL(f, document.baseURI).href).filter((u) => !have.has(new URL(u).pathname));
    let done = m.files.length - todo.length;
    set(pack, { done });
    let failed = false;
    const worker = async () => {
      for (let url = todo.shift(); url; url = todo.shift()) {
        try {
          await cache.add(url);
          set(pack, { done: ++done });
        } catch {
          failed = true; // offline halfway, or the phone is out of space: carry on next time
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    set(pack, { downloading: false, error: failed });
  })().finally(() => running.delete(pack));
  running.set(pack, job);
  return job;
}

/** Frees a pack's space. Progress is never touched; the pack downloads again when it's needed. */
export async function removePack(pack: PackId) {
  if (!supported()) return;
  await caches.delete(cacheName(pack));
  await refreshPack(pack);
}

/** The language you're learning: its pack and the coach's (and for hands-free, the English voice), in the background. */
export function ensureAudio(lang: Lang, { handsFree = false } = {}) {
  if (!autoDownload) return;
  void downloadPack('coach')
    .then(() => downloadPack(lang))
    .then(() => (handsFree ? downloadPack('en') : undefined));
}

if (typeof window !== 'undefined') {
  // Back online: finish any pack that was cut short.
  window.addEventListener('online', () => {
    for (const [pack, s] of states) if (s.total && s.done < s.total) void downloadPack(pack);
  });
}

export function usePack(pack: PackId): PackState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => states.get(pack) ?? EMPTY,
  );
}

export const megabytes = (bytes: number) => `${Math.max(1, Math.round(bytes / 1_000_000))} MB`;
