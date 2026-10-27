import data from '../../shared/phrases.json';
import { audio } from '../data/audio';
import type { Lang } from '../../shared/lang';

export type { Lang };

export const LANGS: { id: Lang; name: string; native: string; flag: string }[] = [
  { id: 'es', name: 'Spanish', native: 'Español', flag: '🇨🇴' },
  { id: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { id: 'zh', name: 'Mandarin', native: '中文', flag: '🇨🇳' },
  { id: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { id: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
];

type RawPhrase = {
  id: string;
  en: string;
  es: string;
  fr: string;
  zh: { hanzi: string; pinyin: string };
  pt: string;
  it: string;
  alt?: string[];
};

export type Phrase = {
  id: string;
  en: string;
  /** The phrase in the target language (characters for Chinese). */
  text: string;
  /** Pinyin with tone marks, Chinese only. */
  pinyin?: string;
  /** Other transcriptions that count as correct, e.g. "1" for "uno". */
  alt: string[];
  audio: number;
};

export type Topic = { id: string; title: string; emoji: string };

const topics = data.topics as { id: string; title: string; emoji: string; phrases: RawPhrase[] }[];

export function langInfo(lang: Lang) {
  return LANGS.find((l) => l.id === lang)!;
}

export function getTopics(): Topic[] {
  return topics.map(({ id, title, emoji }) => ({ id, title, emoji }));
}

export function getTopic(id: string): Topic | undefined {
  return getTopics().find((t) => t.id === id);
}

export function getPhrases(lang: Lang, topicId: string): Phrase[] {
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return [];
  return topic.phrases.map((p) => ({
    id: p.id,
    en: p.en,
    text: lang === 'zh' ? p.zh.hanzi : p[lang],
    pinyin: lang === 'zh' ? p.zh.pinyin : undefined,
    alt: p.alt ?? [],
    audio: audio[lang][p.id],
  }));
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
