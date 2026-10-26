import { type Lang, shuffle } from './content';
import { getPath, lessonStates } from './course';
import { type Exercise, placementQuestion } from './exercises';
import { getProgress, setPlacement } from './progress';

// The placement test: a binary search over the path's stages. Each round asks PER_STAGE questions
// from one stage; PASS of them right counts as knowing it. `lo` is the highest stage known so far,
// `hi` the lowest one not known, so the test ends once they meet (3 or 4 rounds for 8 stages).

export const PER_STAGE = 4;
export const PASS = 3;

export type Search = { lo: number; hi: number };

export const startSearch = (lang: Lang): Search => ({ lo: -1, hi: getPath(lang).length });

/** The stage to test next, or null when the level is found. */
export const nextStage = (s: Search): number | null => (s.hi - s.lo > 1 ? Math.floor((s.lo + s.hi) / 2) : null);

export const afterStage = (s: Search, stage: number, passed: boolean): Search => (passed ? { ...s, lo: stage } : { ...s, hi: stage });

/** A round of questions on one stage's words and sentences (bare sounds only for the sounds stage). */
export function stageQuestions(lang: Lang, stage: number): Exercise[] {
  const items = getPath(lang)[stage].units.flatMap((u) => u.lessons.flatMap((l) => l.items));
  const words = items.filter((i) => i.kind !== 'sound');
  const pool = words.length >= PER_STAGE ? words : items;
  return shuffle(pool)
    .slice(0, PER_STAGE)
    .map((item, n) => placementQuestion(item, items, n));
}

/**
 * Unlocks every stage up to `known` (the highest stage passed, -1 for none). It never locks what
 * an earlier test unlocked. Returns how many locked lessons became available.
 */
export function applyPlacement(lang: Lang, known: number): number {
  const wasAt = getPath(lang).findIndex((s) => s.id === getProgress().placement[lang]);
  if (known <= wasAt) return 0;
  const before = lessonStates(getProgress(), lang);
  setPlacement(lang, getPath(lang)[known].id);
  const after = lessonStates(getProgress(), lang);
  return [...before].filter(([id, state]) => state === 'locked' && after.get(id) !== 'locked').length;
}
