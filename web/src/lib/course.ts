import es from '../../../shared/course/es.json';
import fr from '../../../shared/course/fr.json';
import outline from '../../../shared/course/outline.json';
import zh from '../../../shared/course/zh.json';
import { getPhrases, getTopics, type Lang, type Phrase } from './content';
import { getProgress, lessonDone, type Progress, type TalkWord, weakness } from './progress';
import { type Card, dayNumber, dueKeys, forecast } from './srs';

// The lesson path. The outline (levels, stages and units, beginner to fluent) is shared by every
// language; each language file fills in the units that have been written so far.

const audioFiles = import.meta.glob<string>('../../../assets/audio/course/*/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

type RawItem = { id: string; text: string; en: string; pinyin?: string; kind?: 'sound'; tiles?: string[]; alt?: string[]; say?: string };
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
/** `elective`: an extra topic (like dating) that opens once you reach its level and never blocks the main path. */
export type Unit = { id: string; title: string; lessons: Lesson[]; elective?: boolean; adult?: boolean };
/** `level` is the CEFR-style band shown on the path: Beginner, Elementary, … Fluent. */
export type Stage = { id: string; level: string; title: string; about: string; units: Unit[] };

const COURSES: Record<Lang, RawCourse> = { es, fr, zh } as Record<Lang, RawCourse>;

function defaultTiles(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/^[¿¡"“]+|[.,!?;:"”…]+$/g, ''))
    .filter((w) => /[\p{L}\p{N}]/u.test(w)); // no tiles for an emoji on its own
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
/** Electives behind the one-tap "I'm 18+" check. */
const ADULT = new Set((outline as { adult?: string[] }).adult ?? []);

/** The whole path for a language. Units not written yet have no lessons. */
export function getPath(lang: Lang): Stage[] {
  let stages = cache.get(lang);
  if (!stages) {
    const written = new Map(COURSES[lang].units.map((u) => [u.id, u]));
    const build = (id: string): Unit => {
      const unit = written.get(id);
      return {
        id,
        title: unit?.title ?? outline.units[id as keyof typeof outline.units],
        lessons: (unit?.lessons ?? []).map((l) => ({ id: l.id, title: l.title, unitId: id, items: l.items.map((i) => toItem(lang, i)) })),
      };
    };
    stages = outline.stages.map((s) => ({
      id: s.id,
      level: s.level,
      title: s.title,
      about: s.about,
      units: [
        ...s.units.map((id) => build(id)),
        ...((s as { electives?: string[] }).electives ?? []).map((id) => ({ ...build(id), elective: true, adult: ADULT.has(id) || undefined })),
      ].filter((u) => !u.elective || u.lessons.length),
    }));
    cache.set(lang, stages);
  }
  return stages;
}

/** Every written lesson in path order, 18+ topics included (for looking things up). */
const allLessons = (lang: Lang): Lesson[] => getPath(lang).flatMap((s) => s.units.flatMap((u) => u.lessons));

/** Is this lesson part of an 18+ topic (flirting)? */
export const isAdultLesson = (lesson: Lesson) => ADULT.has(lesson.unitId);

/** Written lessons in path order. 18+ topics only once you've confirmed you're 18 or older. */
export function getLessons(lang: Lang): Lesson[] {
  const adult = getProgress().adult;
  return allLessons(lang).filter((l) => adult || !isAdultLesson(l));
}

export function getLesson(lang: Lang, id: string): Lesson | undefined {
  return allLessons(lang).find((l) => l.id === id);
}

export function getItem(lang: Lang, id: string): Item | undefined {
  for (const lesson of allLessons(lang)) {
    const item = lesson.items.find((i) => i.id === id);
    if (item) return item;
  }
  return undefined;
}

/** How many lessons, from the start of the path, a placement test unlocked. */
/** The main path's lessons in order: everything except elective topics. */
const coreLessons = (lang: Lang) => getPath(lang).flatMap((s) => s.units.filter((u) => !u.elective).flatMap((u) => u.lessons));

export function placedLessons(p: Progress, lang: Lang): number {
  const stages = getPath(lang);
  const upTo = stages.findIndex((s) => s.id === p.placement[lang]);
  return stages.slice(0, upTo + 1).reduce((n, s) => n + s.units.filter((u) => !u.elective).reduce((m, u) => m + u.lessons.length, 0), 0);
}

/** Main-path lessons before a stage. */
function startLessons(lang: Lang, stageId: string): number {
  const stages = getPath(lang);
  const at = stages.findIndex((s) => s.id === stageId);
  return stages.slice(0, Math.max(0, at)).reduce((n, s) => n + s.units.filter((u) => !u.elective).reduce((m, u) => m + u.lessons.length, 0), 0);
}

/** The six levels, Beginner to Fluent, each with its stages (a level spans one or more). */
export type Level = { name: string; cefr: string; about: string; stages: Stage[] };
const LEVEL_INFO: Record<string, { cefr: string; about: string }> = {
  Beginner: { cefr: 'A1', about: 'Brand new: the sounds, first words and short sentences.' },
  Elementary: { cefr: 'A2', about: 'Meet people, shop, eat out and talk about your day.' },
  Intermediate: { cefr: 'B1', about: 'Tell stories, describe people, write messages, make plans.' },
  'Upper-intermediate': { cefr: 'B2', about: 'Work, money, the doctor and sorting out travel problems.' },
  Advanced: { cefr: 'C1', about: 'Follow the news, give opinions, debate, switch formal and casual.' },
  Fluent: { cefr: 'C2', about: 'Idioms, slang and the little words that make you sound local.' },
};
export function getLevels(lang: Lang): Level[] {
  const levels: Level[] = [];
  for (const stage of getPath(lang)) {
    const last = levels[levels.length - 1];
    if (last?.name === stage.level) last.stages.push(stage);
    else levels.push({ name: stage.level, ...(LEVEL_INFO[stage.level] ?? { cefr: '', about: stage.about }), stages: [stage] });
  }
  return levels;
}

/** The level your next lesson is in (the last one when everything's done). */
export function currentLevel(p: Progress, lang: Lang): string {
  const states = lessonStates(p, lang);
  for (const stage of getPath(lang)) for (const u of stage.units) if (!u.elective && u.lessons.some((l) => states.get(l.id) === 'current')) return stage.level;
  return getPath(lang).at(-1)!.level;
}

/** Has this language been started at all (a lesson done, a level picked or a test taken)? */
export const hasStarted = (p: Progress, lang: Lang) =>
  !!p.placement[lang] || !!p.levelStart?.[lang] || getLessons(lang).some((l) => lessonDone(p, lang, l.id));

/**
 * Where each lesson stands: 'done'; 'current', the first one not done past what a placement test
 * unlocked; 'open', unlocked by the test but not done; or 'locked'.
 */
export type LessonState = 'done' | 'current' | 'open' | 'locked';
export function lessonStates(p: Progress, lang: Lang): Map<string, LessonState> {
  const lessons = coreLessons(lang);
  const placed = placedLessons(p, lang);
  // A picked level sets where your next lesson is; otherwise it's just past what the test unlocked.
  const start = p.levelStart?.[lang] ? startLessons(lang, p.levelStart[lang]!) : placed;
  const current = lessons.findIndex((l, i) => i >= start && !lessonDone(p, lang, l.id));
  const states = new Map(
    lessons.map((l, i) => {
      const state: LessonState = lessonDone(p, lang, l.id) ? 'done' : i === current ? 'current' : i < placed || current === -1 ? 'open' : 'locked';
      return [l.id, state];
    }),
  );
  // Elective topics open as soon as the main path reaches their stage, and never block it.
  for (const stage of getPath(lang)) {
    const reached = stage.units.some((u) => !u.elective && u.lessons.some((l) => states.get(l.id) !== 'locked'));
    for (const unit of stage.units.filter((u) => u.elective)) {
      for (const l of unit.lessons) states.set(l.id, lessonDone(p, lang, l.id) ? 'done' : reached ? 'open' : 'locked');
    }
  }
  return states;
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

/** A word the AI partner taught you, as an item (spoken by the phone's own voice). */
function talkItem(lang: Lang, id: string, w: TalkWord): Item {
  const tiles = lang === 'zh' ? [w.text] : defaultTiles(w.text);
  return { id, text: w.text, pinyin: w.pinyin, en: w.en, kind: tiles.length > 1 ? 'phrase' : 'word', tiles, alt: [], audio: `tts:${lang}:${encodeURIComponent(w.text)}` };
}

/** Every course word, phrasebook phrase and AI-taught word, by item id. */
function itemsById(lang: Lang): Map<string, Item> {
  const base = courseItemsById(lang);
  const talk = Object.entries(getProgress().talkWords ?? {}).filter(([k]) => k.startsWith(`${lang}:ai:`));
  if (!talk.length) return base;
  const map = new Map(base);
  for (const [k, w] of talk) map.set(k.slice(lang.length + 1), talkItem(lang, k.slice(lang.length + 1), w));
  return map;
}

/** The course's own item for this text, if there is one (so an AI-taught word reuses its recording). */
export function courseItemFor(lang: Lang, text: string): Item | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const want = norm(text);
  return want ? [...courseItemsById(lang).values()].find((i) => i.kind !== 'sound' && norm(i.text) === want) : undefined;
}

function courseItemsById(lang: Lang): Map<string, Item> {
  let map = lookup.get(lang);
  if (!map) {
    map = new Map(allLessons(lang).flatMap((l) => l.items.map((i) => [i.id, i] as const)));
    for (const t of getTopics()) for (const ph of getPhrases(lang, t.id)) map.set(`pb:${ph.id}`, phraseItem(lang, ph));
    lookup.set(lang, map);
  }
  return map;
}

/** Every word and phrase, for distractors. */
/** Every word and phrase, for distractors (18+ topics only once you've confirmed). */
export function allItems(lang: Lang): Item[] {
  const items = [...itemsById(lang).values()];
  if (getProgress().adult) return items;
  const hidden = new Set(allLessons(lang).filter(isAdultLesson).flatMap((l) => l.items.map((i) => i.id)));
  return items.filter((i) => !hidden.has(i.id));
}

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

// ---- Mistakes ----

/** Most words in one Mistakes session (each comes up three times). */
export const MISTAKES_MAX = 7;

/** Words and phrases on the Mistakes list: furthest from cleared first, then the longest ago. */
export function mistakeItems(p: Progress, lang: Lang): Item[] {
  const items = itemsById(lang);
  return Object.entries(p.mistakes)
    .filter(([k]) => k.startsWith(`${lang}:`))
    .map(([k, m]) => ({ item: items.get(k.slice(lang.length + 1)), m }))
    .filter((x) => x.item && x.item.kind !== 'sound')
    .sort((a, b) => b.m.left - a.m.left || a.m.at - b.m.at)
    .map((x) => x.item!);
}
