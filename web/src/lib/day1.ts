import data from '../../../shared/day1.json';
import { clipUrl, day1Steps, type Day1Step } from './classes';
import type { Lang } from './content';
import { getItem, type Item } from './course';
import { lessonDone, type Progress } from './progress';

// Day 1 is a small section of short lessons you choose from, each with its own button on the
// path, in any order and as often as you like. Nothing plays by itself. The welcome is shown once,
// ever. Finishing all of them opens the rest of the path. shared/day1.json lists each one's words;
// the sounds and tones come from the old Day 1 class's narration (shared/classes/<lang>.json).

export const DAY1_LESSONS = ['sounds', 'words', 'pictures', 'speak', 'greeting'] as const;
export type Day1Key = (typeof DAY1_LESSONS)[number];
export const DAY1_XP = 5;

export const day1Title = (lang: Lang, key: Day1Key): string =>
  ({ sounds: lang === 'zh' ? 'Sounds & Tones' : 'Alphabet & Sounds', words: 'First Words', pictures: 'Picture Match', speak: 'Listen & Speak', greeting: 'First Greeting' })[key];

export const day1About = (lang: Lang, key: Day1Key): string =>
  ({
    sounds: lang === 'zh' ? 'The 4 tones, the neutral tone and pinyin' : 'The alphabet and the tricky sounds',
    words: 'Your first basic words, with their sounds',
    pictures: 'Match pictures to words',
    speak: 'Say words back and get graded',
    greeting: 'Hello, my name is, thank you',
  })[key];

/** What's said in a lesson's first line: different for each, and only there. */
export const day1Opening: Record<Day1Key, string> = {
  sounds: 'Tap Play to hear each one, as often as you like.',
  words: 'Tap Play to hear each word. Next when you are ready.',
  pictures: 'Tap a picture, then the word that goes with it. Words say themselves.',
  speak: 'Tap Play, then say it back. The mic listens by itself and tells you how it went.',
  greeting: 'Three things you can say to anyone, today.',
};

type Raw = { words: string[]; pictures: string[]; speak: string[]; greeting: (string | { text: string; pinyin?: string; en: string; audio: string; id: string })[] };
const DATA = data as unknown as Record<Lang, Raw>;

const items = (lang: Lang, ids: string[]) => ids.map((id) => getItem(lang, id)).filter((i): i is Item => !!i);

export const day1Words = (lang: Lang) => items(lang, DATA[lang].words);
export const day1Pictures = (lang: Lang) => items(lang, DATA[lang].pictures);
export const day1Speak = (lang: Lang) => items(lang, DATA[lang].speak);

/** The greeting's phrases. Some aren't in a lesson yet, so they carry their own recording. */
export function day1Greeting(lang: Lang): Item[] {
  return DATA[lang].greeting.flatMap((g): Item[] => {
    if (typeof g === 'string') return items(lang, [g]);
    return [{ id: g.id, text: g.text, pinyin: g.pinyin, en: g.en, kind: 'phrase', tiles: [], alt: [], audio: clipUrl(g.audio) ?? '' }];
  });
}

const GREETING = 'Your first greeting';
const WELCOME = 'Welcome';
/** The one welcome, its narration. */
export const day1Welcome = (lang: Lang): Day1Step | undefined => day1Steps(lang).find((s) => s.title === WELCOME);
/** The sounds lesson's cards. */
export const day1Sounds = (lang: Lang): Day1Step[] => day1Steps(lang).filter((s) => s.title !== WELCOME && s.title !== GREETING);
/** The greeting lesson's first card, without its "say it back" (the phrases have that). */
export const day1GreetingIntro = (lang: Lang): Day1Step | undefined => {
  const s = day1Steps(lang).find((x) => x.title === GREETING);
  return s && { ...s, repeat: false };
};

export const day1Finished = (p: Progress, lang: Lang, key: Day1Key) => !!p.day1?.[`${lang}:${key}`];

/** The next one not yet finished, or null: all done, or the unit was already behind you before these lessons existed. */
export function day1Next(p: Progress, lang: Lang, unitLessons: { id: string }[]): Day1Key | null {
  if (unitLessons.length && unitLessons.every((l) => lessonDone(p, lang, l.id))) return null;
  return DAY1_LESSONS.find((k) => !day1Finished(p, lang, k)) ?? null;
}
