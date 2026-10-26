import { useSyncExternalStore } from 'react';
import type { Lang } from './content';
import { type Card, dayNumber, fromOld, grade } from './srs';

const KEY = 'progress-v1';

/** Flashcards use a simple Leitner system: box 0 = new, box 4 = learned. */
export const MAX_BOX = 4;

type CardProgress = { box: number; reviews: number };
/** How well a course word is known: strength 0..5, last practiced (ms), times wrong. */
type ItemProgress = { s: number; t: number; w: number };
/** Times traced, and the fewest mistakes writing it from memory (null: not yet). */
export type WritingProgress = { traced: number; memory: number | null };
export type Progress = {
  cards: Record<string, CardProgress>; // key: `${lang}:${phraseId}`
  speech: Record<string, number>; // best pronunciation score 0..1
  quiz: Record<string, number>; // best quiz score 0..1, key: `${lang}:${topicId}`
  // The lesson path:
  xp: number;
  days: Record<string, number>; // XP earned per local date, `YYYY-MM-DD`
  lessons: Record<string, number>; // times completed, key: `${lang}:${lessonId}`
  items: Record<string, ItemProgress>; // key: `${lang}:${itemId}`
  /** Spaced repetition: when each word comes back. Key: `${lang}:${itemId}` for course words, `${lang}:pb:${phraseId}` for the phrasebook. */
  srs: Record<string, Card>;
  /** Chinese characters written, by character. */
  writing: Record<string, WritingProgress>;
  hearts: number;
  heartsAt: number; // when `hearts` was last counted; refills are worked out from here
  goal: number; // daily XP goal
  speaking: boolean; // include "say it out loud" exercises
  voice: boolean; // spoken praise and encouragement
  sfx: boolean; // sound effects (taps, right/wrong, lesson complete)
  haptics: boolean;
  theme: Theme;
  lang: Lang | null; // language last opened on the Learn tab
};

export type Theme = 'auto' | 'light' | 'dark';
export type Prefs = Pick<Progress, 'goal' | 'speaking' | 'voice' | 'sfx' | 'haptics' | 'theme' | 'lang'>;

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
  srs: {},
  writing: {},
  hearts: MAX_HEARTS,
  heartsAt: 0,
  goal: 20,
  speaking: true,
  voice: true,
  sfx: true,
  haptics: true,
  theme: 'auto',
  lang: null,
};

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const saved = JSON.parse(raw);
    if (saved.srs) return { ...EMPTY, ...saved };
    const migrated = withSrs({ ...EMPTY, ...saved });
    localStorage.setItem(KEY, JSON.stringify(migrated)); // so the review days stay put
    return migrated;
  } catch {
    return EMPTY;
  }
}

/** Progress from before spaced repetition: give every word practiced so far a review day. */
function withSrs(p: Progress): Progress {
  const today = dayNumber();
  const srs: Record<string, Card> = {};
  for (const [k, it] of Object.entries(p.items)) srs[k] = fromOld(it.s, dayNumber(new Date(it.t)), today);
  for (const [k, c] of Object.entries(p.cards)) {
    const [lang, id] = k.split(':');
    if (c.reviews > 0) srs[`${lang}:pb:${id}`] = fromOld(c.box, today, today);
  }
  return { ...p, srs };
}

const phraseKey = (lang: Lang, phraseId: string) => `${lang}:pb:${phraseId}`;

function schedule(p: Progress, key: string, right: boolean, soft = false): Progress {
  return { ...p, srs: { ...p.srs, [key]: grade(key, p.srs[key], right, dayNumber(), soft) } };
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
    return schedule({ ...p, cards: { ...p.cards, [k]: { box, reviews: cur.reviews + 1 } } }, phraseKey(lang, id), knewIt);
  });
}

export function recordSpeech(lang: Lang, id: string, score: number) {
  update((p) => {
    const k = `${lang}:${id}`;
    // Whisper mishears sometimes, so a poor score never pushes the phrase back.
    return schedule({ ...p, speech: { ...p.speech, [k]: Math.max(score, p.speech[k] ?? 0) } }, phraseKey(lang, id), score >= 0.85, true);
  });
}

/** One quiz question on a phrasebook phrase. */
export const recordPhraseAnswer = (lang: Lang, phraseId: string, right: boolean) =>
  update((p) => schedule(p, phraseKey(lang, phraseId), right));

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

/**
 * Called for every graded answer, to find weak words and schedule reviews. `soft` misses (a word
 * seen for the first time, Whisper) don't push the review earlier; `track: false` (bare sounds)
 * skips spaced repetition.
 */
export function recordAnswer(lang: Lang, itemId: string, right: boolean, { soft = false, track = true } = {}) {
  update((p) => {
    const k = `${lang}:${itemId}`;
    const cur = p.items[k] ?? { s: 0, t: 0, w: 0 };
    const next = right ? { s: Math.min(5, cur.s + 1), t: Date.now(), w: cur.w } : { s: Math.max(0, cur.s - 2), t: Date.now(), w: cur.w + 1 };
    const out = { ...p, items: { ...p.items, [k]: next } };
    return track ? schedule(out, k, right, soft) : out;
  });
}

/** Lower is weaker: strength, minus a little for every day since it was last practiced. */
export function weakness(p: Progress, lang: Lang, itemId: string, now = Date.now()): number {
  const it = p.items[`${lang}:${itemId}`];
  if (!it) return 0;
  return it.s - (now - it.t) / (2 * 24 * 3600 * 1000);
}

/** A character finished in the writing practice ('trace' over the outline, or from 'memory'). */
export function recordWriting(char: string, mode: 'trace' | 'memory', mistakes: number) {
  update((p) => {
    const cur = p.writing[char] ?? { traced: 0, memory: null };
    const next =
      mode === 'trace' ? { ...cur, traced: cur.traced + 1 } : { ...cur, memory: cur.memory === null ? mistakes : Math.min(cur.memory, mistakes) };
    return { ...p, writing: { ...p.writing, [char]: next } };
  });
}

export const setGoal = (goal: number) => update((p) => ({ ...p, goal }));
export const setSpeaking = (speaking: boolean) => update((p) => ({ ...p, speaking }));
export const setVoice = (voice: boolean) => update((p) => ({ ...p, voice }));
export const setPref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => update((p) => ({ ...p, [key]: value }));

/** The current state, for code outside React (sound effects, haptics, theme). */
export const getProgress = () => progress;
export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetProgress() {
  update((p) => {
    const prefs: Prefs = { goal: p.goal, speaking: p.speaking, voice: p.voice, sfx: p.sfx, haptics: p.haptics, theme: p.theme, lang: p.lang };
    return { ...EMPTY, ...prefs };
  });
}
