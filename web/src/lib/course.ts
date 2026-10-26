import es from '../../../shared/course/es.json';
import fr from '../../../shared/course/fr.json';
import outline from '../../../shared/course/outline.json';
import zh from '../../../shared/course/zh.json';
import type { Lang } from './content';
import { lessonDone, type Progress, weakness } from './progress';

// The lesson path. The outline (stages and units, beginner to fluent) is shared by every
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
export type Stage = { id: string; title: string; about: string; units: Unit[] };

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
