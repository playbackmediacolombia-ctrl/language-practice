import es from '../../../shared/stories/es.json';
import fr from '../../../shared/stories/fr.json';
import it from '../../../shared/stories/it.json';
import pt from '../../../shared/stories/pt.json';
import zh from '../../../shared/stories/zh.json';
import esReading from '../../../shared/reading/es.json';
import frReading from '../../../shared/reading/fr.json';
import itReading from '../../../shared/reading/it.json';
import ptReading from '../../../shared/reading/pt.json';
import zhReading from '../../../shared/reading/zh.json';
import type { Lang } from './content';

// Short listening stories and dialogues, six levels per language, with a glossary for
// tap-to-translate and comprehension questions. One clip per line, made by the audio script.
// Reading practice (short articles at every level) works the same way.

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
  kind: 'story' | 'dialogue' | 'article';
  /** Dialogues that belong to an optional topic, like dating. */
  topic?: 'dating' | 'flirting';
  /** Articles: where the (made-up) news is from, shown as a dateline. */
  place?: string;
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
  { level: 4, title: 'Upper-intermediate', about: 'Real-life conversations about relationships and plans.' },
  { level: 5, title: 'Advanced', about: 'Quicker exchanges, with slang and texting talk.' },
  { level: 6, title: 'Fluent', about: 'Big conversations, said tactfully.' },
];

export const STORY_TOPICS = { dating: 'Dating', flirting: 'Flirting (18+)' };

type RawStory = Omit<Story, 'lines'> & { lines: Omit<Line, 'audio'>[] };
const RAW = { es, fr, zh, pt, it } as unknown as Record<Lang, { stories: RawStory[] }>;
const READING = { es: esReading, fr: frReading, zh: zhReading, pt: ptReading, it: itReading } as unknown as Record<Lang, { articles: RawStory[] }>;
const cache = new Map<string, Story[]>();

const withAudio = (lang: Lang, s: RawStory): Story => ({
  ...s,
  lines: s.lines.map((l, i) => ({ ...l, audio: audioFiles[`../../../assets/audio/stories/${lang}/${s.id}-${i}.mp3`] })),
});

function load(lang: Lang, which: 'stories' | 'articles'): Story[] {
  const key = `${which}:${lang}`;
  let list = cache.get(key);
  if (!list) {
    list = (which === 'stories' ? RAW[lang].stories : READING[lang].articles).map((s) => withAudio(lang, s));
    cache.set(key, list);
  }
  return list;
}

export const getStories = (lang: Lang) => load(lang, 'stories');
/** Reading practice: short practice articles at every level, Beginner to Fluent. */
export const getArticles = (lang: Lang) => load(lang, 'articles');

export const getStory = (lang: Lang, id: string) => getStories(lang).find((s) => s.id === id) ?? getArticles(lang).find((s) => s.id === id);

/** Where a story's screen goes back to: the reading list for articles, else the stories list. */
export const listPath = (lang: Lang, story: Story) => (story.kind === 'article' ? `/${lang}/reading` : `/${lang}/stories`);

export const READING_LEVELS = [
  { level: 1, title: 'Beginner', about: 'A few short, simple sentences.' },
  { level: 2, title: 'Elementary', about: 'Everyday places and prices.' },
  { level: 3, title: 'Intermediate', about: 'A news story in the past tense.' },
  { level: 4, title: 'Upper-intermediate', about: 'A trend, with facts and opinions.' },
  { level: 5, title: 'Advanced', about: 'News-style reports: tap any word you don’t know.' },
  { level: 6, title: 'Fluent', about: 'Opinion and analysis, as you’d read in a newspaper.' },
];

export const optionText = (o: Option) => (typeof o === 'string' ? o : o.text);
export const optionEn = (o: Option) => (typeof o === 'string' ? undefined : o.en);
