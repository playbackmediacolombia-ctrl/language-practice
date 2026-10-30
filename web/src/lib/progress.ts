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
  /** Pick your level: the stage you chose to start at, per language. Your next lesson is the first one not done from there. */
  levelStart: Partial<Record<Lang, string>>;
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
  /** Confirmed 18 or older: shows the flirting topic (lessons, role-plays, dialogues). */
  adult: boolean;
  /** Speaking-first per language: answer every exercise out loud (on for Mandarin unless turned off). */
  speakFirst: Partial<Record<Lang, boolean>>;
  /** Animated characters in role-plays. */
  characters: boolean;
  /** Seconds of quiet before each timed hint (lessons, role-plays, the AI partner); 0 is off. */
  hintWait: HintWait;
  /** Everything a little bigger, for easier reading. */
  textSize: TextSize;
  /** Words the AI conversation partner taught you that aren't in the course, by `${lang}:ai:${slug}` (their review card is in `srs`). */
  talkWords: Record<string, TalkWord>;
  /** Reward chests opened on the lesson path, key `${lang}:${unitId}`, value when. Each gives its XP once. */
  chests: Record<string, number>;
  /** What the live tutor corrected, newest first (for the Notebook). */
  corrections?: Correction[];
  /** Day 1's short lessons you've finished, key `${lang}:${lesson}`: when you first did. */
  day1?: Record<string, number>;
  /** When you saw the one welcome to the app's first lessons (only ever once, in any language). */
  welcomed?: number;
  /** Practice › Play: best result per activity (0..1), key `${lang}:${kind}:${id}`. Missions: when you did it. */
  play: Record<string, number>;
  /** Classes taken (when), key `${lang}:${unitId}`. A negative time: skipped with "I know this". */
  classes: Record<string, number>;
  /** Unit tests: best share right (0..1), key `${lang}:${unitId}`. */
  tests: Record<string, number>;
};

export type TalkWord = { text: string; en: string; pinyin?: string };

export type Correction = { lang: Lang; said: string; better: string; why: string; pinyin?: string; at: number };
/** `saved`: you skipped it after three tries, so it's listed even if it's a bare sound. */
export type Mistake = { left: number; at: number; saved?: boolean };
/** Right answers in Mistakes sessions that clear a word; a new mistake starts it over. */
export const MISTAKE_RIGHTS = 3;

export type Theme = 'auto' | 'light' | 'dark';
export type Speed = 'slow' | 'normal' | 'fast';
export type HintWait = 0 | 5 | 10 | 20;
export type TextSize = 'default' | 'large' | 'larger';
export const HINT_WAITS: HintWait[] = [5, 10, 20, 0];
export type Prefs = Pick<Progress, 'goal' | 'speaking' | 'voice' | 'sfx' | 'haptics' | 'speed' | 'theme' | 'lang' | 'adult' | 'speakFirst' | 'characters' | 'hintWait' | 'textSize'>;

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
  levelStart: {},
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
  adult: false,
  speakFirst: { zh: true },
  characters: true,
  hintWait: 10,
  textSize: 'default',
  talkWords: {},
  chests: {},
  play: {},
  classes: {},
  tests: {},
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

/**
 * After an AI conversation: its new words go into spaced repetition, first review tomorrow.
 * `keys` are the review keys (a course word's own, or `${lang}:ai:…` for one saved in talkWords).
 * Words already being reviewed keep their schedule. Returns how many were added.
 */
export function addTalkWords(entries: { key: string; word?: TalkWord }[]): number {
  let added = 0;
  update((p) => {
    const srs = { ...p.srs };
    const talkWords = { ...p.talkWords };
    for (const { key, word } of entries) {
      if (srs[key]) continue;
      if (word) talkWords[key] = word;
      srs[key] = grade(key, undefined, true, dayNumber());
      added++;
    }
    return { ...p, srs, talkWords };
  });
  return added;
}

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

/** XP for finishing a lesson, and the bonus when it had no mistakes. */
export const LESSON_XP = 10;
export const PERFECT_BONUS = 5;

/** XP in a reward chest on the lesson path. */
export const CHEST_XP = 15;

/** Opens a unit's reward chest: its XP once (opening it again gives nothing). Returns whether it was new. */
export function openChest(lang: Lang, unitId: string): boolean {
  const k = `${lang}:${unitId}`;
  if (progress.chests[k]) return false;
  update((p) => {
    const day = dateKey();
    return { ...p, xp: p.xp + CHEST_XP, days: { ...p.days, [day]: (p.days[day] ?? 0) + CHEST_XP }, chests: { ...p.chests, [k]: Date.now() } };
  });
  return true;
}

/** A lesson (or review, `lessonId` null) was finished: add XP and count today toward the streak. */
export function completeLesson(lang: Lang, lessonId: string | null, xp: number) {
  update((p) => {
    const day = dateKey();
    const lessons = lessonId ? { ...p.lessons, [`${lang}:${lessonId}`]: (p.lessons[`${lang}:${lessonId}`] ?? 0) + 1 } : p.lessons;
    return { ...p, xp: p.xp + xp, days: { ...p.days, [day]: (p.days[day] ?? 0) + xp }, lessons };
  });
}

/** A Day 1 lesson finished: its XP the first time only. Finishing all of them opens the path, like a Class does. */
export function finishDay1Lesson(lang: Lang, key: string, xp: number, allKeys: string[], unitId: string, unitLessons: string[]) {
  update((p) => {
    const k = `${lang}:${key}`;
    const first = !p.day1?.[k];
    const day1 = first ? { ...p.day1, [k]: Date.now() } : p.day1;
    const out = { ...p, day1, xp: p.xp + (first ? xp : 0), days: first ? { ...p.days, [dateKey()]: (p.days[dateKey()] ?? 0) + xp } : p.days };
    if (!allKeys.every((a) => day1?.[`${lang}:${a}`])) return out;
    const lessons = { ...p.lessons };
    for (const l of unitLessons) lessons[`${lang}:${l}`] ??= 1;
    return { ...out, lessons, classes: { ...p.classes, [`${lang}:${unitId}`]: p.classes?.[`${lang}:${unitId}`] ?? Date.now() } };
  });
}

/** Keeps one of the live tutor's corrections for the Notebook (the same one twice stays one line). */
export const saveCorrection = (c: Omit<Correction, 'at'>) =>
  update((p) => ({ ...p, corrections: [{ ...c, at: Date.now() }, ...(p.corrections ?? []).filter((x) => x.lang !== c.lang || x.better !== c.better)].slice(0, 300) }));

export const markWelcomed = () => update((p) => (p.welcomed ? p : { ...p, welcomed: Date.now() }));

/** Puts an item on the Mistakes list (Skip for now, after three misses): no heart, no grade, just back for review. */
export const saveToMistakes = (lang: Lang, itemId: string) =>
  update((p) => ({ ...p, mistakes: { ...p.mistakes, [`${lang}:${itemId}`]: { left: MISTAKE_RIGHTS, at: Date.now(), saved: true } } }));

/**
 * Called for every graded answer, to find weak words, schedule reviews and keep the Mistakes
 * list. `soft` misses (a word seen for the first time, Whisper) don't push the review earlier or
 * count as mistakes; `track: false` (bare sounds) skips both; `drill` is a Mistakes session.
 */
export function recordAnswer(lang: Lang, itemId: string, right: boolean, { soft = false, track = true, drill = false, hinted = false } = {}) {
  update((p) => {
    const k = `${lang}:${itemId}`;
    const cur = p.items[k] ?? { s: 0, t: 0, w: 0 };
    // Right with a hint: not wrong, but not known yet either. It doesn't get stronger, comes back
    // for review tomorrow (its ease untouched), and goes on the Mistakes list.
    const next = right && hinted ? { ...cur, t: Date.now() } : right ? { s: Math.min(5, cur.s + 1), t: Date.now(), w: cur.w } : { s: Math.max(0, cur.s - 2), t: Date.now(), w: cur.w + 1 };
    const out = tally({ ...p, items: { ...p.items, [k]: next } }, lang, right);
    if (!track) return out;
    if (right && hinted) {
      const card = grade(k, out.srs[k], false, dayNumber(), true);
      return noteMistake({ ...out, srs: { ...out.srs, [k]: { ...card, due: Math.min(card.due, dayNumber() + 1) } } }, k, false);
    }
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
/** The placement test's result: unlocks up to that stage, and your next lesson is just past it. */
export const setPlacement = (lang: Lang, stageId: string) =>
  update((p) => {
    const { [lang]: _, ...levelStart } = p.levelStart;
    return { ...p, placement: { ...p.placement, [lang]: stageId }, levelStart };
  });

/**
 * Pick your level: start at `startStage`, with everything before it unlocked (`unlockTo`, the
 * stage just before it, or null at the very start). Never locks anything already unlocked and
 * never touches XP, streak or finished lessons.
 */
export const pickLevel = (lang: Lang, startStage: string, unlockTo: string | null, stageOrder: string[]) =>
  update((p) => {
    const had = p.placement[lang];
    const keep = had && (!unlockTo || stageOrder.indexOf(had) > stageOrder.indexOf(unlockTo)) ? had : unlockTo;
    const placement = { ...p.placement };
    if (keep) placement[lang] = keep;
    else delete placement[lang];
    return { ...p, placement, levelStart: { ...p.levelStart, [lang]: startStage } };
  });

/** XP for taking a Class. */
export const CLASS_XP = 5;

/**
 * A unit's Class was taken (or skipped: `skipped`). Its rules count as seen, so they don't pop up
 * again in its lessons. Taking it again changes nothing but the XP.
 */
export function finishClass(lang: Lang, unitId: string, { skipped = false, lessons = [] as string[] } = {}) {
  const k = `${lang}:${unitId}`;
  const now = Date.now();
  update((p) => {
    const first = !p.classes?.[k];
    const xp = skipped || !first ? 0 : CLASS_XP;
    const day = dateKey();
    const tips = { ...p.tips };
    for (const l of lessons) tips[`${lang}:${l}`] ??= now;
    return {
      ...p,
      xp: p.xp + xp,
      days: xp ? { ...p.days, [day]: (p.days[day] ?? 0) + xp } : p.days,
      classes: { ...p.classes, [k]: p.classes?.[k] && p.classes[k] > 0 ? p.classes[k] : skipped ? -now : now },
      tips,
    };
  });
}

/** A unit test finished: keep the best share right. */
export const recordTest = (lang: Lang, unitId: string, score: number) =>
  update((p) => ({ ...p, tests: { ...p.tests, [`${lang}:${unitId}`]: Math.max(score, p.tests?.[`${lang}:${unitId}`] ?? 0) } }));

/** One line repeated in shadowing, graded by Whisper (null: not graded, no speech model). */
export const recordShadowLine = (lang: Lang, score: number | null) => score !== null && update((p) => tally(p, lang, score >= 0.5));

/** A story shadowed to the end: keep the best average and count it like a short lesson. */
/** A role-play finished: keeps the best average score (null: not graded) and earns XP like a short lesson. */
export function recordRoleplay(lang: Lang, scenarioId: string, average: number | null, xp: number) {
  const k = `${lang}:${scenarioId}`;
  if (average !== null) update((p) => ({ ...p, roleplays: { ...p.roleplays, [k]: Math.max(average, p.roleplays[k] ?? 0) } }));
  completeLesson(lang, null, xp);
}

/**
 * An activity in Practice › Play finished with `score` (0..1). XP comes every time, except a
 * mission: its bonus is once (`once`), and it's remembered as the time you did it.
 */
export function recordPlay(lang: Lang, kind: string, id: string, score: number, xp: number, { once = false } = {}) {
  const k = `${lang}:${kind}:${id}`;
  const before = getProgress().play?.[k];
  if (once && before !== undefined) return 0;
  update((p) => ({ ...p, play: { ...p.play, [k]: once ? Date.now() : Math.max(score, p.play?.[k] ?? 0) } }));
  completeLesson(lang, null, xp);
  return xp;
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
    const prefs: Prefs = { goal: p.goal, speaking: p.speaking, voice: p.voice, sfx: p.sfx, haptics: p.haptics, speed: p.speed, theme: p.theme, lang: p.lang, adult: p.adult, speakFirst: p.speakFirst, characters: p.characters, hintWait: p.hintWait, textSize: p.textSize };
    return { ...EMPTY, ...prefs };
  });
}
