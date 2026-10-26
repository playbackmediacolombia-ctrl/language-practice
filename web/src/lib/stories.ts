import es from '../../../shared/stories/es.json';
import fr from '../../../shared/stories/fr.json';
import zh from '../../../shared/stories/zh.json';
import type { Lang } from './content';

// Short listening stories and dialogues, three levels per language, with a glossary for
// tap-to-translate and comprehension questions. One clip per line, made by the audio script.

const audioFiles = import.meta.glob<string>('../../../assets/audio/stories/*/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

export type Gloss = string | { py: string; en: string };
export type Option = string | { text: string; en: string };
export type Line = { text: string; en: string; speaker?: string; pinyin?: string; seg?: string; audio: string };
export type Question = { q: string; qEn?: string; options: Option[]; answer: number };
export type Story = {
  id: string;
  level: number;
  kind: 'story' | 'dialogue';
  title: string;
  en: string;
  speakers?: Record<string, { name: string; voice: 'a' | 'b' }>;
  lines: Line[];
  glossary: Record<string, Gloss>;
  questions: Question[];
};

export const LEVELS = [
  { level: 1, title: 'Beginner', about: 'After "First words": short, simple sentences.' },
  { level: 2, title: 'Elementary', about: 'After "Short sentences": everyday scenes.' },
  { level: 3, title: 'Intermediate', about: 'After "Conversation": the past tense, longer lines.' },
];

type RawStory = Omit<Story, 'lines'> & { lines: Omit<Line, 'audio'>[] };
const RAW = { es, fr, zh } as unknown as Record<Lang, { stories: RawStory[] }>;
const cache = new Map<Lang, Story[]>();

export function getStories(lang: Lang): Story[] {
  let list = cache.get(lang);
  if (!list) {
    list = RAW[lang].stories.map((s) => ({
      ...s,
      lines: s.lines.map((l, i) => ({ ...l, audio: audioFiles[`../../../assets/audio/stories/${lang}/${s.id}-${i}.mp3`] })),
    }));
    cache.set(lang, list);
  }
  return list;
}

export const getStory = (lang: Lang, id: string) => getStories(lang).find((s) => s.id === id);

export const optionText = (o: Option) => (typeof o === 'string' ? o : o.text);
export const optionEn = (o: Option) => (typeof o === 'string' ? undefined : o.en);
