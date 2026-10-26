import es from '../../../shared/course/es.json';
import fr from '../../../shared/course/fr.json';
import outline from '../../../shared/course/outline.json';
import zh from '../../../shared/course/zh.json';
import { getPhrases, getTopics, type Lang, type Phrase } from './content';
import { lessonDone, type Progress, weakness } from './progress';
import { type Card, dayNumber, dueKeys, forecast } from './srs';

// The lesson path. The outline (levels, stages and units, beginner to fluent) is shared by every
// language; each language file fills in the units that have been written so far.

const audioFiles = import.meta.glob<string>('../../../assets/audio/course/*/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

type RawItem = { id: string; text: string; en: string; pinyin?: string; kind?: 'sound'; tiles?: string[]; alt?: string[] };
type RawCourse = { units: { id: string; title: string; lessons: { id: string; title: string; items: RawItem[] }[] }[] };

export type Item = {
  id: string;
  /** The word or sentence in the target language (characters for Chinese). */
  text: string;
  /** Pinyin with tone marks, Chinese only. */
  pinyin?: string;
  /** English meaning; for a bare sound, how it sounds. */
  en: string;
  /** 'sound' is a vowel or syllable drill: no speaking or sentence building. */
  kind: 'sound' | 'word' | 'phrase';
  /** Word tiles for building the sentence (two or more for a phrase). */
  tiles: string[];
  alt: string[];
  audio: string;
};

export type Lesson = { id: string; title: string; unitId: string; items: Item[] };
export type Unit = { id: string; title: string; lessons: Lesson[] };
/** `level` is the CEFR-style band shown on the path: Beginner, Elementary, … Fluent. */
export type Stage = { id: string; level: string; title: string; about: string; units: Unit[] };

const COURSES: Record<Lang, RawCourse> = { es, fr, zh } as Record<Lang, RawCourse>;

function defaultTiles(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/^[¿¡"“]+|[.,!?;:"”]+$/g, ''))
    .filter(Boolean);
}

function toItem(lang: Lang, raw: RawItem): Item {
  const tiles = raw.tiles ?? (lang === 'zh' ? [raw.text] : defaultTiles(raw.text));
  return {
    id: raw.id,
    text: raw.text,
    pinyin: raw.pinyin,
    en: raw.en,
    kind: raw.kind ?? (tiles.length > 1 ? 'phrase' : 'word'),
    tiles,
    alt: raw.alt ?? [],
    audio: audioFiles[`../../../assets/audio/course/${lang}/${raw.id}.mp3`],
  };
}

const cache = new Map<Lang, Stage[]>();

/** The whole path for a language. Units not written yet have no lessons. */
export function getPath(lang: Lang): Stage[] {
  let stages = cache.get(lang);
  if (!stages) {
    const written = new Map(COURSES[lang].units.map((u) => [u.id, u]));
    stages = outline.stages.map((s) => ({
      id: s.id,
      level: s.level,
      title: s.title,
      about: s.about,
      units: s.units.map((id) => {
        const unit = written.get(id);
        return {
          id,
          title: unit?.title ?? outline.units[id as keyof typeof outline.units],
          lessons: (unit?.lessons ?? []).map((l) => ({ id: l.id, title: l.title, unitId: id, items: l.items.map((i) => toItem(lang, i)) })),
        };
      }),
    }));
    cache.set(lang, stages);
  }
  return stages;
}

/** All written lessons in path order. */
export function getLessons(lang: Lang): Lesson[] {
  return getPath(lang).flatMap((s) => s.units.flatMap((u) => u.lessons));
}

export function getLesson(lang: Lang, id: string): Lesson | undefined {
  return getLessons(lang).find((l) => l.id === id);
}

export function getItem(lang: Lang, id: string): Item | undefined {
  for (const lesson of getLessons(lang)) {
    const item = lesson.items.find((i) => i.id === id);
    if (item) return item;
  }
  return undefined;
}

/** Number of the unit within the whole path (1-based), for display. */
export function unitNumber(lang: Lang, unitId: string): number {
  return getPath(lang).flatMap((s) => s.units).findIndex((u) => u.id === unitId) + 1;
}

/** Items from finished lessons, weakest first. */
export function weakItems(p: Progress, lang: Lang, n = 6): Item[] {
  const learned = getLessons(lang)
    .filter((l) => lessonDone(p, lang, l.id))
    .flatMap((l) => l.items);
  const now = Date.now();
  return learned.sort((a, b) => weakness(p, lang, a.id, now) - weakness(p, lang, b.id, now)).slice(0, n);
}

// ---- Spaced repetition ----

/** A phrasebook phrase as an exercise item. Its id starts with "pb:" so it can't clash with course words. */
function phraseItem(lang: Lang, phrase: Phrase): Item {
  const tiles = lang === 'zh' ? [phrase.text] : defaultTiles(phrase.text);
  return {
    id: `pb:${phrase.id}`,
    text: phrase.text,
    pinyin: phrase.pinyin,
    en: phrase.en,
    kind: tiles.length > 1 ? 'phrase' : 'word',
    tiles,
    alt: phrase.alt,
    audio: phrase.audio,
  };
}

const lookup = new Map<Lang, Map<string, Item>>();

/** Every course word and phrasebook phrase, by item id. */
function itemsById(lang: Lang): Map<string, Item> {
  let map = lookup.get(lang);
  if (!map) {
    map = new Map(getLessons(lang).flatMap((l) => l.items.map((i) => [i.id, i] as const)));
    for (const t of getTopics()) for (const ph of getPhrases(lang, t.id)) map.set(`pb:${ph.id}`, phraseItem(lang, ph));
    lookup.set(lang, map);
  }
  return map;
}

/** Every word and phrase, for distractors. */
export const allItems = (lang: Lang): Item[] => [...itemsById(lang).values()];

/** Most words in one daily review; the rest stay due for the next one. */
export const DAILY_MAX = 20;

/** The cards for a language's words and phrases (bare sounds aren't reviewed), keyed `${lang}:${itemId}`. */
export function trackedCards(p: Progress, lang: Lang): Record<string, Card> {
  const items = itemsById(lang);
  const out: Record<string, Card> = {};
  for (const k in p.srs) {
    if (!k.startsWith(`${lang}:`)) continue;
    const item = items.get(k.slice(lang.length + 1));
    if (item && item.kind !== 'sound') out[k] = p.srs[k];
  }
  return out;
}

/** Words and phrases due for review today, most overdue first. */
export function dueItems(p: Progress, lang: Lang, today = dayNumber()): Item[] {
  const items = itemsById(lang);
  return dueKeys(trackedCards(p, lang), `${lang}:`, today).map((k) => items.get(k.slice(lang.length + 1))!);
}

/** How many words come due tomorrow. */
export const dueTomorrow = (p: Progress, lang: Lang, today = dayNumber()) => forecast(trackedCards(p, lang), `${lang}:`, today, 1)[0];
