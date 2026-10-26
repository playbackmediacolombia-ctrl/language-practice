import { useSyncExternalStore } from 'react';
import type { Lang } from './content';

const KEY = 'progress-v1';

/** Flashcards use a simple Leitner system: box 0 = new, box 4 = learned. */
export const MAX_BOX = 4;

type CardProgress = { box: number; reviews: number };
export type Progress = {
  cards: Record<string, CardProgress>; // key: `${lang}:${phraseId}`
  speech: Record<string, number>; // best pronunciation score 0..1
  quiz: Record<string, number>; // best quiz score 0..1, key: `${lang}:${topicId}`
};

const EMPTY: Progress = { cards: {}, speech: {}, quiz: {} };

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

let progress = load();
const listeners = new Set<() => void>();

function update(fn: (p: Progress) => Progress) {
  progress = fn(progress);
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage full or blocked: progress still works for this session.
  }
  listeners.forEach((l) => l());
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => progress,
  );
}

export const cardBox = (p: Progress, lang: Lang, id: string) => p.cards[`${lang}:${id}`]?.box ?? 0;

export function reviewCard(lang: Lang, id: string, knewIt: boolean) {
  update((p) => {
    const k = `${lang}:${id}`;
    const cur = p.cards[k] ?? { box: 0, reviews: 0 };
    const box = knewIt ? Math.min(MAX_BOX, cur.box + 1) : 0;
    return { ...p, cards: { ...p.cards, [k]: { box, reviews: cur.reviews + 1 } } };
  });
}

export function recordSpeech(lang: Lang, id: string, score: number) {
  update((p) => {
    const k = `${lang}:${id}`;
    return { ...p, speech: { ...p.speech, [k]: Math.max(score, p.speech[k] ?? 0) } };
  });
}

export function recordQuiz(lang: Lang, topicId: string, score: number) {
  update((p) => {
    const k = `${lang}:${topicId}`;
    return { ...p, quiz: { ...p.quiz, [k]: Math.max(score, p.quiz[k] ?? 0) } };
  });
}

export function resetProgress() {
  update(() => EMPTY);
}
