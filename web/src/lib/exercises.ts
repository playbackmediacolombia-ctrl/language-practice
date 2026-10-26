import { shuffle, type Lang } from './content';
import type { Item } from './course';

export type Exercise =
  | { type: 'meaning'; item: Item; options: string[]; isNew: boolean } // hear + see it, pick the English
  | { type: 'listen'; item: Item; options: Item[] } // hear it, pick what was said
  | { type: 'translate'; item: Item; options: Item[] } // see the English, pick the target
  | { type: 'tiles'; item: Item; bank: string[] } // build the sentence from word tiles
  | { type: 'match'; items: Item[] } // match target ↔ English pairs
  | { type: 'type'; item: Item } // type what you hear
  | { type: 'speak'; item: Item }; // say it out loud, graded by Whisper

/** The item an exercise is about (match pairs have several). */
export const itemsOf = (ex: Exercise): Item[] => (ex.type === 'match' ? ex.items : [ex.item]);

const pickSome = <T,>(items: T[], n: number) => shuffle(items).slice(0, n);

/**
 * Whisper often mishears a lone syllable ("tout" as "2", 是 as "shit"), which would mark a
 * good answer wrong, so speaking is only asked for items of two syllables or more.
 */
function speakable(item: Item, lang: Lang): boolean {
  if (item.kind === 'sound') return false;
  if (lang === 'zh') return [...item.text.matchAll(/\p{Script=Han}/gu)].length >= 2;
  return (item.text.toLowerCase().match(/[aeiouyáéíóúàèìòùâêîôûëïüœæ]+/g) ?? []).length >= 2;
}

/** Up to `n - 1` distractors, preferring ones from `near` (same lesson, so they sound alike). */
function distractors(item: Item, near: Item[], pool: Item[], n: number, same = (o: Item) => o.text === item.text): Item[] {
  const unique = (list: Item[]) => list.filter((o) => o.id !== item.id && !same(o));
  const fromNear = pickSome(unique(near), n - 1);
  const rest = pickSome(unique(pool).filter((o) => !fromNear.includes(o)), n - 1 - fromNear.length);
  return [...fromNear, ...rest];
}

/** Same meaning in English, ignoring case, punctuation and notes like "(polite)": two such items can't be told apart. */
const gist = (en: string) => en.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9' ]/g, '').trim();
const sameMeaning = (a: Item, b: Item) => gist(a.en) === gist(b.en);

function meaning(item: Item, near: Item[], pool: Item[], isNew: boolean): Exercise {
  const others = distractors(item, near, pool, 4, (o) => sameMeaning(o, item)).map((o) => o.en);
  return { type: 'meaning', item, options: shuffle([item.en, ...others]), isNew };
}

function choice(type: 'listen' | 'translate', item: Item, near: Item[], pool: Item[]): Exercise {
  // Neither the same words nor the same meaning, so only one option can be right.
  return { type, item, options: shuffle([item, ...distractors(item, near, pool, 4, (o) => o.text === item.text || sameMeaning(o, item))]) };
}

function tiles(item: Item, pool: Item[]): Exercise {
  const own = new Set(item.tiles.map((t) => t.toLowerCase()));
  const extra = shuffle([...new Set(pool.flatMap((o) => o.tiles))].filter((t) => !own.has(t.toLowerCase()))).slice(0, 3);
  return { type: 'tiles', item, bank: shuffle([...item.tiles, ...extra]) };
}

/**
 * The exercises for one lesson. New words are introduced first (half, then drills on those,
 * then the other half and drills on everything), so a word is always seen before it's tested.
 * `earlier` is every item from finished lessons, for distractors and a little review.
 */
export function lessonExercises(items: Item[], earlier: Item[], lang: Lang, speaking: boolean): Exercise[] {
  const pool = [...items, ...earlier];
  const words = items.filter((i) => i.kind !== 'sound');
  const drills: Exercise[] = [];

  // Sound drills: hearing the difference is the point, so listening and typing first.
  for (const item of items) {
    if (item.kind === 'sound') drills.push(choice('listen', item, items, pool));
  }
  for (const item of pickSome(words.filter((i) => i.kind === 'word'), 2)) drills.push(choice('translate', item, items, pool));
  for (const item of pickSome(words.filter((i) => i.kind === 'word'), 2)) drills.push(choice('listen', item, items, pool));
  for (const item of items.filter((i) => i.kind === 'phrase').slice(0, 3)) drills.push(tiles(item, pool));
  for (const item of pickSome(items.filter((i) => i.text.length <= 14), 2)) drills.push({ type: 'type', item });
  if (speaking) for (const item of pickSome(words.filter((i) => speakable(i, lang)), 2)) drills.push({ type: 'speak', item });

  const half = Math.ceil(items.length / 2);
  const first = new Set(items.slice(0, half).map((i) => i.id));
  const inFirst = (ex: Exercise) => itemsOf(ex).every((i) => first.has(i.id));
  const intro = (list: Item[]) => list.map((i) => meaning(i, items, pool, true));

  const out = [
    ...intro(items.slice(0, half)),
    ...shuffle(drills.filter(inFirst)),
    ...intro(items.slice(half)),
    ...shuffle(drills.filter((ex) => !inFirst(ex))),
  ];
  // One match-the-pairs round, using this lesson's words plus a review word or two.
  const matchable = [...items, ...pickSome(earlier, 2)];
  if (matchable.length >= 3) out.push({ type: 'match', items: pickSome(matchable, 5) });
  return out;
}

/** A practice round on the given (weak) items: no introductions, a bit of everything. */
export function reviewExercises(items: Item[], all: Item[], lang: Lang, speaking: boolean): Exercise[] {
  const words = items.filter((i) => speakable(i, lang));
  const out: Exercise[] = items.map((item, i) => {
    if (item.kind === 'phrase' && i % 2 === 0) return tiles(item, all);
    if (i % 3 === 0) return { type: 'type', item };
    return choice(i % 2 ? 'listen' : 'translate', item, items, all);
  });
  if (speaking && words.length) out.push({ type: 'speak', item: pickSome(words, 1)[0] });
  for (const item of pickSome(items, 2)) out.push(meaning(item, items, all, false));
  const result = shuffle(out);
  if (items.length >= 3) result.push({ type: 'match', items: pickSome(items, 5) });
  return result;
}

// ---- Checking typed answers ----

export type TypedResult = { right: boolean; note?: string };

const TONE_MARKS: Record<string, number> = { '̄': 1, '́': 2, '̌': 3, '̀': 4 };

/** Pinyin to letters without tones plus the tones in order, e.g. "nǐ hǎo" / "ni3 hao3" → ["nihao", "33"]. */
function splitPinyin(text: string): [string, string] {
  let letters = '';
  let tones = '';
  // ü (also written v or u:) decomposes to u + U+0308, so mark it as v before dropping marks.
  for (const ch of text.toLowerCase().normalize('NFD').replace(/u\u0308|u:/g, 'v')) {
    if (TONE_MARKS[ch]) tones += TONE_MARKS[ch];
    else if (/[1-4]/.test(ch)) tones += ch;
    else if (/[a-z]/.test(ch)) letters += ch;
  }
  return [letters, tones];
}

const loose = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
const strict = (s: string) => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '');

/** Is a typed answer right? Accents (and, for words, Chinese tones) missing only earn a note. */
export function checkTyped(answer: string, item: Item, lang: Lang): TypedResult {
  if (!answer.trim()) return { right: false };
  const targets = [item.text, ...item.alt];

  if (lang === 'zh') {
    const hanzi = answer.replace(/[^\p{Script=Han}]/gu, '');
    if (hanzi) return { right: hanzi === item.text.replace(/[^\p{Script=Han}]/gu, '') };
    const [letters, tones] = splitPinyin(answer);
    const [wantLetters, wantTones] = splitPinyin(item.pinyin ?? '');
    if (letters !== wantLetters) return { right: false };
    if (tones === wantTones) return { right: true };
    if (!tones && item.kind !== 'sound') return { right: true, note: `Watch the tones: ${item.pinyin}` };
    return { right: false };
  }

  if (targets.some((t) => strict(t) === strict(answer))) return { right: true };
  if (targets.some((t) => loose(t) === loose(answer))) return { right: true, note: `Watch the accents: ${item.text}` };
  return { right: false };
}

/** Do the tiles placed spell the sentence? */
export function checkTiles(placed: string[], item: Item): boolean {
  return placed.map(strict).join(' ') === item.tiles.map(strict).join(' ');
}
