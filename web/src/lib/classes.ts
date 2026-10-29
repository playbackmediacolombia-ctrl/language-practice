import es from '../../../shared/classes/es.json';
import fr from '../../../shared/classes/fr.json';
import it from '../../../shared/classes/it.json';
import pt from '../../../shared/classes/pt.json';
import zh from '../../../shared/classes/zh.json';
import type { Lang } from './content';
import { classTaken, getItem, getPath, type Item, type Unit, ungatedLessonStates } from './course';
import type { Progress } from './progress';

// Teach before testing. Every unit starts with a Class: a teacher introduces each word and phrase
// one at a time (with its recording, meaning, an example and pronunciation help), then the unit's
// rules, each with a "why it works this way" note. Practice (the unit's lessons, gentle: no
// hearts lost) and the unit Test open once the Class is done. Unit 1's Class is Day 1.
// The content is built by scripts/content/classes.py, which also checks that nothing in a
// lesson, role-play, story or article is used before a Class has taught it.

const clips = import.meta.glob<string>(['../../../assets/audio/class/*/*.mp3', '../../../assets/audio/scenarios/*/*.mp3', '../../../assets/audio/stories/*/*.mp3'], {
  eager: true,
  query: '?url',
  import: 'default',
});
/** A clip's URL from its path under assets/audio (e.g. "class/es/n-1234.mp3"). */
export const clipUrl = (path: string | undefined) => (path ? clips[`../../../assets/audio/${path}`] : undefined);

export type Said = { text: string; audio: string };
export type Rule = { title: string; culture: boolean; body: Said[]; table: string[][]; examples: string[]; why: Said; lesson?: string };
export type Word = { id: string; ex?: string; tips?: string[] };
export type Extra = {
  kind: 'roleplay' | 'story' | 'article';
  id: string;
  title: string;
  intro: Said;
  lines: { text: string; en?: string; pinyin?: string; audio: string }[];
  words: { text: string; en: string; audio: string }[];
};
export type ClassData = { intro: Said; words: Word[]; rules: Rule[]; extras: Extra[]; done: Said };
export type Day1Step = { title: string; say: Said; show?: string[]; item?: string; tone?: number; repeat?: boolean; letters?: boolean };
type Raw = { day1: Day1Step[]; letters: [string, string, string][]; units: Record<string, ClassData>; gates: Record<string, string> };

const DATA = { es, fr, zh, pt, it } as unknown as Record<Lang, Raw>;

export const getClass = (lang: Lang, unitId: string): ClassData | undefined => DATA[lang].units[unitId];
export const day1Steps = (lang: Lang) => DATA[lang].day1;
export const letters = (lang: Lang) => DATA[lang].letters;
/** The first unit's Class is Day 1, for someone who knows nothing yet. */
export const isDay1 = (unitId: string) => unitId === 'u1';

const key = (lang: Lang, unitId: string) => `${lang}:${unitId}`;
export { classTaken };

export type StepState = 'done' | 'current' | 'open' | 'locked';
export type UnitSteps = { class: StepState; test: StepState | null; skippable: boolean };

/**
 * Where a unit's three steps stand. The Class is current when the next lesson is in this unit
 * (and it hasn't been taken), open when a placement test or a picked level already unlocked the
 * unit (then it can be skipped), and locked before that. The Test opens with the Practice.
 * Unit 1 (Day 1) and culture lessons have no test.
 */
export function unitSteps(p: Progress, lang: Lang, unit: Unit, raw = ungatedLessonStates(p, lang)): UnitSteps {
  const here = unit.lessons.map((l) => raw.get(l.id));
  const taken = classTaken(p, lang, unit);
  const cls: StepState = taken ? 'done' : here.includes('current') ? 'current' : here.includes('open') || here.includes('done') ? 'open' : 'locked';
  const test: StepState | null = isDay1(unit.id) || unit.culture ? null : !taken ? 'locked' : p.tests?.[key(lang, unit.id)] !== undefined ? 'done' : 'open';
  // Skipping is for units a placement test or a picked level unlocked (optional topics: once reached).
  return { class: cls, test, skippable: !taken && here.includes('open') && (!unit.elective || !!p.placement[lang] || !!p.levelStart?.[lang]) };
}

/** Which unit an activity (a role-play, story or article) opens with. */
export const gateOf = (lang: Lang, kind: 'roleplay' | 'story' | 'article', id: string): string | undefined => DATA[lang].gates[`${kind}:${id}`];

/** The unit an activity opens with, and whether it's open yet (that unit's Class taken, or the unit unlocked by a test or a picked level). */
export function activityGate(p: Progress, lang: Lang, kind: 'roleplay' | 'story' | 'article', id: string): { unit: Unit | undefined; open: boolean; label: string } {
  const unitId = gateOf(lang, kind, id);
  const unit = unitId ? getPath(lang).flatMap((s) => s.units).find((u) => u.id === unitId) : undefined;
  if (!unit) return { unit, open: true, label: '' };
  const steps = unitSteps(p, lang, unit);
  const n = getPath(lang).flatMap((s) => s.units).filter((u) => !u.elective);
  const label = unit.elective ? unit.title : `Unit ${n.findIndex((u) => u.id === unit.id) + 1}`;
  return { unit, open: steps.class === 'done' || steps.skippable, label };
}

/** The "Words you'll need" before an activity: what its unit's Class taught for it. */
export function wordsYoullNeed(lang: Lang, kind: Extra['kind'], id: string): Extra | undefined {
  const unitId = gateOf(lang, kind, id);
  return unitId ? getClass(lang, unitId)?.extras.find((x) => x.kind === kind && x.id === id) : undefined;
}

/** The unit's role-plays (its Test ends with them). */
export function unitRoleplays(lang: Lang, unitId: string): string[] {
  return Object.entries(DATA[lang].gates)
    .filter(([k, u]) => u === unitId && k.startsWith('roleplay:'))
    .map(([k]) => k.slice('roleplay:'.length));
}

/** Everything a Class teaches, for the Notebook. */
export function classItems(lang: Lang, unitId: string): Item[] {
  return (getClass(lang, unitId)?.words ?? []).map((w) => getItem(lang, w.id)).filter((i): i is Item => !!i);
}

/** Tone names for the pinyin of a Chinese word: "nǐ hǎo" → ["3rd tone", "3rd tone"]. */
export function toneNames(pinyin: string): string[] {
  const marks: [RegExp, string][] = [
    [/[āēīōūǖ]/, '1st tone: high and flat'],
    [/[áéíóúǘ]/, '2nd tone: rising'],
    [/[ǎěǐǒǔǚ]/, '3rd tone: dips low'],
    [/[àèìòùǜ]/, '4th tone: falling'],
  ];
  return pinyin
    .toLowerCase()
    .split(/[\s,，。.!?？！]+/)
    .filter(Boolean)
    .map((syl) => marks.find(([re]) => re.test(syl))?.[1] ?? 'neutral tone: light and short');
}
