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
  /** Stories and dialogues finished: best share of questions right (0..1). Key: `${lang}:${storyId}`. */
  stories: Record<string, number>;
  /** Words and phrases got wrong, until cleared in a Mistakes session: right answers still needed, and when it was last missed. Key like `srs`. */
  mistakes: Record<string, Mistake>;
  /** Grammar tips already shown (they pop up once), key `${lang}:${lessonId}`, value when. */
  tips: Record<string, number>;
  /** Shadowing: best average score repeating a story's lines (0..1). Key: `${lang}:${storyId}`. */
  shadow: Record<string, number>;
  /** Best average Whisper score per role-play, key `${lang}:${scenarioId}`. */
  roleplays: Record<string, number>;
  /** Placement test result per language: the last stage tested out of (it and every stage before it are unlocked). */
  placement: Partial<Record<Lang, string>>;
  /** Big achievements already celebrated (see achievements.ts); null until first worked out. */
  celebrated: string[] | null;
  /** Per day and language: answers right (r) and given (n), and seconds practiced (s). For the stats. */
  log: Record<string, Partial<Record<Lang, { r: number; n: number; s: number }>>>;
  hearts: number;
  heartsAt: number; // when `hearts` was last counted; refills are worked out from here
  goal: number; // daily XP goal
  speaking: boolean; // include "say it out loud" exercises
  voice: boolean; // spoken praise and encouragement
  sfx: boolean; // sound effects (taps, right/wrong, lesson complete)
  haptics: boolean;
  /** Default playback speed for every recording (the Slow buttons stay slower still). */
  speed: Speed;
  theme: Theme;
  lang: Lang | null; // language last opened on the Learn tab
};

export type Mistake = { left: number; at: number };
/** Right answers in Mistakes sessions that clear a word; a new mistake starts it over. */
export const MISTAKE_RIGHTS = 3;

export type Theme = 'auto' | 'light' | 'dark';
export type Speed = 'slow' | 'normal' | 'fast';
export type Prefs = Pick<Progress, 'goal' | 'speaking' | 'voice' | 'sfx' | 'haptics' | 'speed' | 'theme' | 'lang'>;

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
  stories: {},
  placement: {},
  celebrated: null,
  shadow: {},
  roleplays: {},
  tips: {},
  mistakes: {},
  log: {},
  hearts: MAX_HEARTS,
  heartsAt: 0,
  goal: 20,
  speaking: true,
  voice: true,
  sfx: true,
  haptics: true,
  speed: 'normal',
  theme: 'auto',
  lang: null,
};

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const saved = JSON.parse(raw);
    const migrated = migrate(saved);
    if (!saved.srs || !saved.mistakes) localStorage.setItem(KEY, JSON.stringify(migrated)); // so review days stay put
    return migrated;
  } catch {
    return EMPTY;
  }
}

/** Fills in what older progress (or an older backup) doesn't have yet. */
function migrate(saved: Partial<Progress>): Progress {
  let p: Progress = { ...EMPTY, ...saved };
  if (!saved.srs) p = withSrs(p);
  if (!saved.mistakes) p = withMistakes(p);
  return p;
}

/** Progress from before the Mistakes list: start it with the words missed before that are still weak. */
function withMistakes(p: Progress): Progress {
  const mistakes: Record<string, Mistake> = {};
  for (const [k, it] of Object.entries(p.items)) if (it.w > 0 && it.s < 3) mistakes[k] = { left: MISTAKE_RIGHTS, at: it.t };
  return { ...p, mistakes };
}

/** A wrong answer (re)starts a word on the Mistakes list; in a Mistakes session (`drill`), a right one counts toward clearing it. */
function noteMistake(p: Progress, key: string, right: boolean, drill = false): Progress {
  const cur = p.mistakes[key];
  if (!right) return { ...p, mistakes: { ...p.mistakes, [key]: { left: MISTAKE_RIGHTS, at: Date.now() } } };
  if (!drill || !cur) return p;
  const mistakes = { ...p.mistakes, [key]: { ...cur, left: cur.left - 1 } };
  if (cur.left <= 1) delete mistakes[key]; // cleared
  return { ...p, mistakes };
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

/** Adds to today's log for a language: answers (`right` of `given`) and/or seconds practiced. */
function logDay(p: Progress, lang: Lang, { right = 0, given = 0, seconds = 0 }): Progress {
  const day = dateKey();
  const cur = p.log[day]?.[lang] ?? { r: 0, n: 0, s: 0 };
  const next = { r: cur.r + right, n: cur.n + given, s: cur.s + seconds };
  return { ...p, log: { ...p.log, [day]: { ...p.log[day], [lang]: next } } };
}
const tally = (p: Progress, lang: Lang, right: boolean) => logDay(p, lang, { right: right ? 1 : 0, given: 1 });

/** Time spent on a practice screen (see usePracticeTime). */
export const addPracticeTime = (lang: Lang, seconds: number) => update((p) => logDay(p, lang, { seconds }));

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
    const out = schedule({ ...p, cards: { ...p.cards, [k]: { box, reviews: cur.reviews + 1 } } }, phraseKey(lang, id), knewIt);
    return tally(noteMistake(out, phraseKey(lang, id), knewIt), lang, knewIt);
  });
}

export function recordSpeech(lang: Lang, id: string, score: number) {
  update((p) => {
    const k = `${lang}:${id}`;
    // Whisper mishears sometimes, so a poor score never pushes the phrase back.
    const out = schedule({ ...p, speech: { ...p.speech, [k]: Math.max(score, p.speech[k] ?? 0) } }, phraseKey(lang, id), score >= 0.85, true);
    return tally(out, lang, score >= 0.5); // "close" counts as right, as in lessons
  });
}

/** One quiz question on a phrasebook phrase. */
export const recordPhraseAnswer = (lang: Lang, phraseId: string, right: boolean) =>
  update((p) => tally(noteMistake(schedule(p, phraseKey(lang, phraseId), right), phraseKey(lang, phraseId), right), lang, right));

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
 * Called for every graded answer, to find weak words, schedule reviews and keep the Mistakes
 * list. `soft` misses (a word seen for the first time, Whisper) don't push the review earlier or
 * count as mistakes; `track: false` (bare sounds) skips both; `drill` is a Mistakes session.
 */
export function recordAnswer(lang: Lang, itemId: string, right: boolean, { soft = false, track = true, drill = false } = {}) {
  update((p) => {
    const k = `${lang}:${itemId}`;
    const cur = p.items[k] ?? { s: 0, t: 0, w: 0 };
    const next = right ? { s: Math.min(5, cur.s + 1), t: Date.now(), w: cur.w } : { s: Math.max(0, cur.s - 2), t: Date.now(), w: cur.w + 1 };
    const out = tally({ ...p, items: { ...p.items, [k]: next } }, lang, right);
    if (!track) return out;
    return noteMistake(schedule(out, k, right, soft), k, right || soft, drill && !(soft && !right));
  });
}

/** Lower is weaker: strength, minus a little for every day since it was last practiced. */
export function weakness(p: Progress, lang: Lang, itemId: string, now = Date.now()): number {
  const it = p.items[`${lang}:${itemId}`];
  if (!it) return 0;
  return it.s - (now - it.t) / (2 * 24 * 3600 * 1000);
}

/** One comprehension question answered, for the stats. */
export const recordStoryAnswer = (lang: Lang, right: boolean) => update((p) => tally(p, lang, right));

/** A story's questions answered: keep the best score, and count it like a short lesson (XP, streak). */
export function recordStory(lang: Lang, storyId: string, score: number, xp: number) {
  const k = `${lang}:${storyId}`;
  update((p) => ({ ...p, stories: { ...p.stories, [k]: Math.max(score, p.stories[k] ?? 0) } }));
  completeLesson(lang, null, xp);
}

export const markTipSeen = (lang: Lang, lessonId: string) =>
  update((p) => (p.tips[`${lang}:${lessonId}`] ? p : { ...p, tips: { ...p.tips, [`${lang}:${lessonId}`]: Date.now() } }));

/** Marks big achievements as celebrated so each one is shown only once. */
export const markCelebrated = (keys: string[]) =>
  update((p) => ({ ...p, celebrated: [...new Set([...(p.celebrated ?? []), ...keys])] }));

/** Unlocks a language's path up to and including a stage (see placement.ts, which never moves it back). */
export const setPlacement = (lang: Lang, stageId: string) => update((p) => ({ ...p, placement: { ...p.placement, [lang]: stageId } }));

/** One line repeated in shadowing, graded by Whisper (null: not graded, no speech model). */
export const recordShadowLine = (lang: Lang, score: number | null) => score !== null && update((p) => tally(p, lang, score >= 0.5));

/** A story shadowed to the end: keep the best average and count it like a short lesson. */
/** A role-play finished: keeps the best average score (null: not graded) and earns XP like a short lesson. */
export function recordRoleplay(lang: Lang, scenarioId: string, average: number | null, xp: number) {
  const k = `${lang}:${scenarioId}`;
  if (average !== null) update((p) => ({ ...p, roleplays: { ...p.roleplays, [k]: Math.max(average, p.roleplays[k] ?? 0) } }));
  completeLesson(lang, null, xp);
}

export function recordShadowing(lang: Lang, storyId: string, average: number | null, xp: number) {
  const k = `${lang}:${storyId}`;
  if (average !== null) update((p) => ({ ...p, shadow: { ...p.shadow, [k]: Math.max(average, p.shadow[k] ?? 0) } }));
  completeLesson(lang, null, xp);
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

/** Replaces all progress with a backup's (see backup.ts). Older backups are filled in like old progress is. */
export function replaceProgress(saved: Partial<Progress>) {
  update(() => migrate(saved));
}

export function resetProgress() {
  update((p) => {
    const prefs: Prefs = { goal: p.goal, speaking: p.speaking, voice: p.voice, sfx: p.sfx, haptics: p.haptics, speed: p.speed, theme: p.theme, lang: p.lang };
    return { ...EMPTY, ...prefs };
  });
}
