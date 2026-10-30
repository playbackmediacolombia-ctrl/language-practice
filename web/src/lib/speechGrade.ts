import { pinyin } from 'pinyin-pro';
import { compare, editDistance, type TokenResult } from '../../../shared/compare';
import type { Lang } from './content';
import type { ToneCheck } from './tones';

// One verdict for everything you say out loud: Great, Close or Not quite. Whisper's words decide
// for longer phrases, where it's reliable. On a word or two it often writes something else even
// when you're right (see README: on its own it fails over half of Day 1's native recordings), so
// there what it wrote counts by how it sounds, and how close your sound was to the recording counts too.

export type Grade = 'great' | 'close' | 'retry';

export type Verdict = {
  grade: Grade;
  score: number;
  tokens: TokenResult[];
  heard: string;
  /** What was off, to show under the grade. */
  detail?: string;
  /** The wrong tone, for a tip. */
  tone?: ToneCheck;
};

/** Letters only, the way it sounds: pinyin without tones for Chinese, no accents otherwise. */
function sounds(text: string, lang: Lang): string {
  const latin = lang === 'zh' ? pinyin(text, { toneType: 'none', nonZh: 'consecutive' }) : text;
  return latin.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
}

/** 0 to 1: how alike the two read when sounded out. */
export function soundsLike(expected: string, heard: string, lang: Lang): number {
  const [a, b] = [sounds(expected, lang), sounds(heard, lang)];
  if (!a || !b) return 0;
  return 1 - editDistance(a, b) / Math.max(a.length, b.length);
}

/** Whisper can't be trusted with this little to go on. */
export function isShort(text: string, lang: Lang): boolean {
  if (lang === 'zh') return (text.match(/\p{Script=Han}/gu) ?? []).length <= 3;
  return (text.toLowerCase().match(/[aeiouyáéíóúàèìòùâêîôûãõëïüœæ]+/g) ?? []).length <= 3;
}

// Set from Day 1's items said again by a second voice (results in the README).
const GREAT_SCORE = 0.85;
const CLOSE_SCORE = 0.5;
const GREAT_SOUNDS = 0.85; // reads the same when sounded out: "buona notte" for "Buonanotte"
const SHORT_GREAT_SOUNDS = 0.6;
const SHORT_CLOSE_SOUNDS = 0.4;
const SAME_SOUND = 11.5; // distance to the recording: this near is the same word, whatever Whisper wrote
const NEAR_SOUND = 15;
const FAR_SOUND = 17;

export function gradeSpeech({ lang, text, alt = [], heard, distance = Infinity, tone = null }: { lang: Lang; text: string; alt?: string[]; heard: string; distance?: number; tone?: ToneCheck | null }): Verdict {
  const c = compare(text, heard, lang, alt);
  // Your pitch knows the tone better than the character Whisper picked.
  const tokens = tone?.ok ? c.tokens.map((t): TokenResult => (t.tone ? { text: t.text, status: 'ok' } : t)) : c.tokens;
  const score = tokens.length ? tokens.reduce((sum, t) => sum + (t.status === 'ok' ? 1 : t.status === 'close' ? 0.5 : 0), 0) / tokens.length : c.score;
  const like = soundsLike(text, heard, lang);
  const short = isShort(text, lang);

  let grade: Grade;
  if (score >= GREAT_SCORE || like >= GREAT_SOUNDS) grade = 'great';
  else if (short && ((like >= SHORT_GREAT_SOUNDS && distance <= FAR_SOUND) || distance <= SAME_SOUND)) grade = 'great';
  else if (score >= CLOSE_SCORE || (short && (like >= SHORT_CLOSE_SOUNDS || distance <= NEAR_SOUND))) grade = 'close';
  else grade = 'retry';

  const missedTone = tone && !tone.ok ? tone : undefined;
  if (missedTone && grade === 'great') grade = 'close'; // the right sounds with the wrong tone is a different word

  // Everything's marked right when the grade is, so the colors agree with what it says.
  const shown = grade === 'great' ? tokens.map((t): TokenResult => ({ text: t.text, status: 'ok' })) : tokens;
  let detail: string | undefined;
  if (missedTone?.tip) detail = missedTone.alone ? `Wrong tone. ${missedTone.tip}` : `Check the tone on “${missedTone.syllable}”. ${missedTone.tip}`;
  else if (grade === 'close') {
    const off = shown.filter((t) => t.status !== 'ok');
    detail = short || off.length === shown.length || !off.length ? 'One of the sounds was a little off.' : off.length === 1 ? `“${off[0].text}” was a little off.` : `“${off.slice(0, 2).map((t) => t.text).join('” and “')}” were a little off.`;
  }
  return { grade, score: grade === 'great' ? Math.max(score, GREAT_SCORE) : score, tokens: shown, heard, detail, tone: missedTone };
}
