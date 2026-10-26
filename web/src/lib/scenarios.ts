import es from '../../../shared/scenarios/es.json';
import fr from '../../../shared/scenarios/fr.json';
import zh from '../../../shared/scenarios/zh.json';
import type { Lang } from './content';

// Real-life role-plays: you play one side of a conversation (ordering food, the doctor, the
// airport…) and Whisper grades what you say. Three per level, from Beginner to Fluent; each
// topic comes back at three levels, harder each time. One clip per line from the audio script.

const audioFiles = import.meta.glob<string>('../../../assets/audio/scenarios/*/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

export type Topic = 'food' | 'directions' | 'shopping' | 'smalltalk' | 'doctor' | 'airport' | 'dating';
export type ScenarioLine = { who: 'them' | 'you'; text: string; en: string; pinyin?: string; alt?: string[]; audio: string };
export type Scenario = {
  id: string;
  topic: Topic;
  level: number;
  title: string;
  en: string;
  setting: string;
  them: string;
  lines: ScenarioLine[];
};

/** The course's six levels. How much help you get on your turn depends on the level. */
export const LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'Upper-intermediate', 'Advanced', 'Fluent'];

export const TOPICS: Record<Topic, { label: string; emoji: string }> = {
  food: { label: 'Ordering food', emoji: '🍽️' },
  directions: { label: 'Directions', emoji: '🧭' },
  shopping: { label: 'Shopping', emoji: '🛍️' },
  smalltalk: { label: 'Small talk', emoji: '💬' },
  doctor: { label: 'At the doctor', emoji: '🩺' },
  airport: { label: 'At the airport', emoji: '✈️' },
  dating: { label: 'Dating', emoji: '💕' },
};

/**
 * What you see on your turn: Beginner and Elementary show the words; Intermediate and
 * Upper-intermediate show the English with the words a tap away; Advanced and Fluent show
 * only the English, so you put it in your own words (the words are still a tap away).
 */
export const promptMode = (level: number): 'words' | 'hint' | 'meaning' => (level <= 2 ? 'words' : level <= 4 ? 'hint' : 'meaning');

type Raw = { scenarios: (Omit<Scenario, 'lines'> & { lines: Omit<ScenarioLine, 'audio'>[] })[] };
const RAW = { es, fr, zh } as unknown as Record<Lang, Raw>;
const cache = new Map<Lang, Scenario[]>();

export function getScenarios(lang: Lang): Scenario[] {
  let list = cache.get(lang);
  if (!list) {
    list = RAW[lang].scenarios.map((s) => ({
      ...s,
      lines: s.lines.map((l, i) => ({ ...l, audio: audioFiles[`../../../assets/audio/scenarios/${lang}/${s.id}-${i}.mp3`] })),
    }));
    cache.set(lang, list);
  }
  return list;
}

export const getScenario = (lang: Lang, id: string) => getScenarios(lang).find((s) => s.id === id);
