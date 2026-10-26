import type { Lang } from './content';
import type { WorkerRequest, WorkerResponse } from './whisper.worker';

// Measured on this app's own phrase recordings (see README): tiny marks too many correct
// phrases wrong, base is the smallest that works, small is the most accurate.
export const MODELS = {
  base: { id: 'onnx-community/whisper-base', label: 'Standard', sizeMB: 77, note: 'Smallest that works well. Fast.' },
  small: { id: 'onnx-community/whisper-small', label: 'More accurate', sizeMB: 249, note: 'Better for French & Chinese. Slower.' },
} as const;
export type ModelKey = keyof typeof MODELS;

const CHOICE_KEY = 'whisper-model';
const READY_KEY = 'whisper-ready'; // model key that finished downloading at least once
const CACHE_NAME = 'transformers-cache';

const LANGUAGE: Record<Lang, string> = { es: 'spanish', fr: 'french', zh: 'chinese' };

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

export function chosenModel(): ModelKey {
  return read(CHOICE_KEY) === 'small' ? 'small' : 'base';
}

export function setChosenModel(key: ModelKey) {
  write(CHOICE_KEY, key);
}

/** True once the chosen model has been downloaded (it then loads from the browser cache). */
export function isModelReady(key: ModelKey = chosenModel()): boolean {
  return (read(READY_KEY) ?? '').split(',').includes(key);
}

let worker: Worker | null = null;
let workerModel: ModelKey | null = null;
let loadPromise: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
let progressListener: ((fraction: number) => void) | null = null;

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;
    if (msg.type === 'progress') progressListener?.(msg.total ? msg.loaded / msg.total : 0);
    if (msg.type === 'result') {
      pending.get(msg.id)?.resolve(msg.text);
      pending.delete(msg.id);
    }
    if (msg.type === 'error' && msg.id !== undefined) {
      pending.get(msg.id)?.reject(new Error(msg.message));
      pending.delete(msg.id);
    }
  };
  return worker;
}

/**
 * Downloads (first time) or loads from cache (afterwards) the chosen Whisper model.
 * Safe to call repeatedly; it only does the work once per model.
 */
export function loadModel(onProgress?: (fraction: number) => void): Promise<void> {
  const key = chosenModel();
  if (onProgress) progressListener = onProgress;
  if (loadPromise && workerModel === key) return loadPromise;

  workerModel = key;
  const w = getWorker();
  loadPromise = new Promise<void>((resolve, reject) => {
    const onMessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.type === 'ready') {
        w.removeEventListener('message', onMessage);
        const ready = new Set((read(READY_KEY) ?? '').split(',').filter(Boolean));
        ready.add(key);
        write(READY_KEY, [...ready].join(','));
        resolve();
      } else if (e.data.type === 'error' && e.data.id === undefined) {
        w.removeEventListener('message', onMessage);
        loadPromise = null;
        workerModel = null;
        reject(new Error(e.data.message));
      }
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'load', model: MODELS[key].id, base: document.baseURI } satisfies WorkerRequest);
  });
  // Ask the browser not to clear the cached model when space runs low.
  navigator.storage?.persist?.().catch(() => {});
  return loadPromise;
}

export async function transcribe(audio: Float32Array, lang: Lang): Promise<string> {
  await loadModel();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ type: 'transcribe', id, audio, language: LANGUAGE[lang] } satisfies WorkerRequest, [
      audio.buffer,
    ]);
  });
}

/** Removes a model's files from the browser cache. */
export async function deleteModel(key: ModelKey) {
  if (workerModel === key) {
    worker?.terminate();
    worker = null;
    workerModel = null;
    loadPromise = null;
  }
  const cache = await caches.open(CACHE_NAME);
  const repo = MODELS[key].id;
  for (const req of await cache.keys()) {
    if (req.url.includes(repo)) await cache.delete(req);
  }
  write(READY_KEY, (read(READY_KEY) ?? '').split(',').filter((k) => k && k !== key).join(','));
}
