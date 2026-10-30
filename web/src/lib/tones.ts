import { pinyin as toPinyin } from 'pinyin-pro';
import type { Contour } from './pitch';

// Grading Mandarin tones from your pitch. Whisper can't hear tones (it just picks a likely
// character), so the shape of your voice decides. A tone is a shape, so each syllable is checked
// against the shape it should have, in semitones from your own middle pitch. The recordings are
// a second opinion: their third tones are often shallow, and copying the model is never wrong.

export type Tone = 1 | 2 | 3 | 4 | 5;

const MARKS: Record<string, Tone> = { '̄': 1, '́': 2, '̌': 3, '̀': 4 };

/** The tips you see and hear after a miss. */
export const TONE_TIPS: Record<Tone, string> = {
  1: 'Stay high and flat, like holding one long note.',
  2: 'Start in the middle and rise, like asking "what?"',
  3: 'Start lower and dip down, then rise.',
  4: 'Start high and drop fast, like a firm "No!"',
  5: 'Keep it light and short.',
};

/** Pitch levels (1 low to 5 high) along each tone: the shape drawn behind your line. */
export const TONE_SHAPES: Record<Tone, number[]> = { 1: [5, 5, 5], 2: [3, 3.3, 5], 3: [2, 1, 1, 4], 4: [5, 4, 1], 5: [2.5, 2.5] };

export type Syllable = { syllable: string; tone: Tone };

/** The syllables of a Chinese text with the tones as written, taken from `given` (for its neutral tones) where it lines up. */
function writtenTones(text: string, given = ''): Syllable[] {
  const chars = (text.match(/\p{Script=Han}/gu) ?? []).join('');
  if (!chars) return [];
  const numbered = toPinyin(chars, { type: 'array', toneType: 'num' });
  const fallback = numbered.map((s) => ({ syllable: s.replace(/\d/g, ''), tone: (Number(s.match(/\d/)?.[0]) || 5) as Tone }));
  const letters = [...given.toLowerCase().normalize('NFD').replace(/ü/g, 'v')].filter((c) => /[a-z]/.test(c) || MARKS[c]);
  let at = 0;
  const out: Syllable[] = [];
  for (const { syllable } of fallback) {
    let tone: Tone = 5;
    const want = syllable.replace(/ü/g, 'v');
    for (const ch of want) {
      while (MARKS[letters[at]]) tone = MARKS[letters[at++]];
      if (letters[at] !== ch) return fallback;
      at++;
    }
    while (MARKS[letters[at]]) tone = MARKS[letters[at++]];
    out.push({ syllable, tone });
  }
  return at === letters.length ? out : fallback;
}

/**
 * The tones as they're really said: two third tones in a row make the first one rise; 不 and 一
 * rise before a fourth tone; and 一 falls before the others.
 */
export function spokenTones(text: string, pinyin?: string): Syllable[] {
  const list = writtenTones(text, pinyin);
  const chars = text.match(/\p{Script=Han}/gu) ?? [];
  return list.map((s, i) => {
    const next = list[i + 1]?.tone;
    if (s.tone === 3 && next === 3) return { ...s, tone: 2 };
    if (chars[i] === '不' && s.tone === 4 && next === 4) return { ...s, tone: 2 };
    if (chars[i] === '一' && s.tone === 1 && next) return { ...s, tone: next === 4 ? 2 : next === 5 ? 1 : 4 };
    return s;
  });
}

type Shape = { start: number; end: number; low: number; range: number; points: number };

/** The shape of one syllable's slice of the line, leaving out the first bit (the voice settling in). */
function shapeOf(points: Contour['points'], from: number, to: number): Shape | null {
  const all = points.filter((p): p is NonNullable<typeof p> => !!p && p.x >= from && p.x <= to).map((p) => p.st);
  const v = all.slice(Math.floor(all.length * 0.12));
  if (v.length < 5) return null;
  const n = Math.max(2, Math.floor(v.length / 4));
  const avg = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
  const low = Math.min(...v);
  return { start: avg(v.slice(0, n)), end: avg(v.slice(-n)), low, range: Math.max(...v) - low, points: v.length };
}

/** Does this shape fit the tone? Alone a tone must be clear; inside a phrase only a shape that's plainly wrong misses. */
function fits(tone: Tone, s: Shape, alone: boolean): boolean {
  const rise = s.end - s.start;
  switch (tone) {
    case 1:
      return alone ? Math.abs(rise) < 2.5 && s.range < 4 : s.range < 6.5;
    case 2:
      return alone ? rise >= 1.5 : rise >= -0.5;
    case 3:
      return alone ? s.start - s.low >= 0.7 && s.end - s.low >= 0.7 && rise >= -1.5 : !(rise >= 4 && s.start - s.low < 0.5);
    case 4:
      return alone ? rise <= -2.5 : rise <= 0.5;
    case 5:
      return true;
  }
}

/** Average gap to the recording, in semitones. */
function gapTo(native: Contour, mine: Contour): number | null {
  const at = (c: Contour, x: number) => {
    const i = Math.round(x * (c.points.length - 1));
    for (let d = 0; d <= 6; d++) {
      const p = c.points[i - d] ?? c.points[i + d];
      if (p) return p.st;
    }
    return null;
  };
  let total = 0;
  let n = 0;
  for (let k = 0; k < 40; k++) {
    const [a, b] = [at(native, k / 39), at(mine, k / 39)];
    if (a === null || b === null) continue;
    total += Math.abs(a - b);
    n++;
  }
  return n >= 10 ? total / n : null;
}

export type ToneCheck = { ok: boolean; syllable?: string; tone?: Tone; tip?: string; alone: boolean };

/** Past this many syllables the even split into syllables is too rough to blame one of them. */
const MAX_SYLLABLES = 4;
const COPIES_MODEL = 1.2; // semitones from the recording: a lone syllable
const COPIES_MODEL_PHRASE = 2.5; // the even split blurs a phrase, so only a shape unlike the recording's as well counts as a miss

/**
 * Checks your pitch line against the tones of `text`. null means it can't say: no pitch was
 * found, or the phrase is too long; the grade then rests on the words. `drill` is a tone
 * exercise, where you have to make the shape itself and matching a shallow recording isn't enough.
 */
export function checkTones(text: string, pinyin: string | undefined, mine: Contour | null | undefined, native: Contour | null | undefined, drill = false): ToneCheck | null {
  const list = spokenTones(text, pinyin);
  if (!mine || !list.length || list.length > MAX_SYLLABLES) return null;
  const alone = list.length === 1;
  const gap = native ? gapTo(native, mine) : null;
  if (!drill && gap !== null && gap <= (alone ? COPIES_MODEL : COPIES_MODEL_PHRASE)) return { ok: true, alone };
  for (const [i, s] of list.entries()) {
    const shape = shapeOf(mine.points, i / list.length, (i + 1) / list.length);
    if (shape && !fits(s.tone, shape, alone)) return { ok: false, syllable: s.syllable, tone: s.tone, tip: TONE_TIPS[s.tone], alone };
  }
  return { ok: true, alone };
}
