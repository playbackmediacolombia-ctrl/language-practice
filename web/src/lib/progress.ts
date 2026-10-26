import { useSyncExternalStore } from 'react';
import type { Lang } from './content';

const KEY = 'progress-v1';

/** Flashcards use a simple Leitner system: box 0 = new, box 4 = learned. */
export const MAX_BOX = 4;

type CardProgress = { box: number; reviews: number };
/** How well a course word is known: strength 0..5, last practiced (ms), times wrong. */
type ItemProgress = { s: number; t: number; w: number };
export type Progress = {
  cards: Record<string, CardProgress>; // key: `${lang}:${phraseId}`
  speech: Record<string, number>; // best pronunciation score 0..1
  quiz: Record<string, number>; // best quiz score 0..1, key: `${lang}:${topicId}`
  // The lesson path:
  xp: number;
  days: Record<string, number>; // XP earned per local date, `YYYY-MM-DD`
  lessons: Record<string, number>; // times completed, key: `${lang}:${lessonId}`
  items: Record<string, ItemProgress>; // key: `${lang}:${itemId}`
  hearts: number;
  heartsAt: number; // when `hearts` was last counted; refills are worked out from here
  goal: number; // daily XP goal
  speaking: boolean; // include "say it out loud" exercises
  voice: boolean; // spoken praise and encouragement
};

export const MAX_HEARTS = 5;
export const HEART_REFILL_MS = 30 * 60 * 1000;
export const GOALS = [10, 20, 30, 50];

const EMPTY: Progress = {
  cards: {},
  speech: {},
  quiz: {},
  xp: 0,
  days: {},
  lessons: {},
  items: {},
  hearts: MAX_HEARTS,
  heartsAt: 0,
  goal: 20,
  speaking: true,
  voice: true,
};

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

// ---- Lesson path ----

export function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const todayXp = (p: Progress) => p.days[dateKey()] ?? 0;

/** Days in a row with at least one finished lesson. Today still counts as "not broken" until midnight. */
export function streak(p: Progress): number {
  const day = new Date();
  if (!p.days[dateKey(day)]) day.setDate(day.getDate() - 1);
  let n = 0;
  while (p.days[dateKey(day)]) {
    n++;
    day.setDate(day.getDate() - 1);
  }
  return n;
}

/** Hearts right now, counting one refilled every 30 minutes. */
export function heartsNow(p: Progress, now = Date.now()): { hearts: number; nextIn: number | null } {
  if (p.hearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, nextIn: null };
  const refilled = Math.floor((now - p.heartsAt) / HEART_REFILL_MS);
  const hearts = Math.min(MAX_HEARTS, p.hearts + refilled);
  return { hearts, nextIn: hearts >= MAX_HEARTS ? null : HEART_REFILL_MS - ((now - p.heartsAt) % HEART_REFILL_MS) };
}

function setHearts(p: Progress, delta: number): Progress {
  const now = Date.now();
  const { hearts } = heartsNow(p, now);
  const next = Math.max(0, Math.min(MAX_HEARTS, hearts + delta));
  // Keep the partial refill timer running, unless the hearts were full (then it starts now).
  const heartsAt = hearts >= MAX_HEARTS ? now : p.heartsAt + Math.floor((now - p.heartsAt) / HEART_REFILL_MS) * HEART_REFILL_MS;
  return { ...p, hearts: next, heartsAt };
}

export const loseHeart = () => update((p) => setHearts(p, -1));
export const gainHeart = () => update((p) => setHearts(p, 1));

export const lessonDone = (p: Progress, lang: Lang, lessonId: string) => (p.lessons[`${lang}:${lessonId}`] ?? 0) > 0;

/** A lesson (or review, `lessonId` null) was finished: add XP and count today toward the streak. */
export function completeLesson(lang: Lang, lessonId: string | null, xp: number) {
  update((p) => {
    const day = dateKey();
    const lessons = lessonId ? { ...p.lessons, [`${lang}:${lessonId}`]: (p.lessons[`${lang}:${lessonId}`] ?? 0) + 1 } : p.lessons;
    return { ...p, xp: p.xp + xp, days: { ...p.days, [day]: (p.days[day] ?? 0) + xp }, lessons };
  });
}

/** Called for every graded answer, to find weak words for review. */
export function recordAnswer(lang: Lang, itemId: string, right: boolean) {
  update((p) => {
    const k = `${lang}:${itemId}`;
    const cur = p.items[k] ?? { s: 0, t: 0, w: 0 };
    const next = right ? { s: Math.min(5, cur.s + 1), t: Date.now(), w: cur.w } : { s: Math.max(0, cur.s - 2), t: Date.now(), w: cur.w + 1 };
    return { ...p, items: { ...p.items, [k]: next } };
  });
}

/** Lower is weaker: strength, minus a little for every day since it was last practiced. */
export function weakness(p: Progress, lang: Lang, itemId: string, now = Date.now()): number {
  const it = p.items[`${lang}:${itemId}`];
  if (!it) return 0;
  return it.s - (now - it.t) / (2 * 24 * 3600 * 1000);
}

export const setGoal = (goal: number) => update((p) => ({ ...p, goal }));
export const setSpeaking = (speaking: boolean) => update((p) => ({ ...p, speaking }));
export const setVoice = (voice: boolean) => update((p) => ({ ...p, voice }));

export function resetProgress() {
  update((p) => ({ ...EMPTY, goal: p.goal, speaking: p.speaking, voice: p.voice }));
}
