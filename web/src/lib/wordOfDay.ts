import type { Lang } from './content';
import { getPath, isAdultLesson, type Item, lessonStates } from './course';
import { dateKey, type Progress } from './progress';

// Word of the day: one single word a day from your level (lessons you've done or can open, plus
// the next few right at the start), with
// a short sentence from the course that uses it. The same all day, a new one tomorrow.

export type WordOfDay = { word: Item; example: Item | null };

const hasWord = (lang: Lang, sentence: string, word: string) =>
  lang === 'zh'
    ? sentence.includes(word)
    : new RegExp(`(^|[^\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'iu').test(sentence);

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

export function wordOfDay(p: Progress, lang: Lang, day = dateKey()): WordOfDay | null {
  const states = lessonStates(p, lang);
  const path = getPath(lang)
    .flatMap((s) => s.units.flatMap((u) => u.lessons))
    .filter((l) => p.adult || !isAdultLesson(l));
  // Lessons you can open; right at the start (just the sounds) also the next few, so there's
  // always a handful of real words to choose from.
  let lessons = path.filter((l) => states.get(l.id) !== 'locked');
  const candidates = () => {
    const items = lessons.flatMap((l) => l.items);
    const sentences = items.filter((i) => i.kind === 'phrase');
    return { sentences, words: items.filter((i) => i.kind === 'word' && i.audio && sentences.some((s) => s.id !== i.id && hasWord(lang, s.text, i.text))) };
  };
  let { sentences, words } = candidates();
  for (const next of path) {
    if (words.length >= 5) break;
    if (lessons.includes(next)) continue;
    lessons = [...lessons, next];
    ({ sentences, words } = candidates());
  }
  if (!words.length) return null;
  const word = words[hash(`${day}:${lang}`) % words.length];
  // The shortest sentence that uses it reads best as an example.
  const example = sentences.filter((s) => hasWord(lang, s.text, word.text)).sort((a, b) => a.text.length - b.text.length)[0] ?? null;
  return { word, example };
}
