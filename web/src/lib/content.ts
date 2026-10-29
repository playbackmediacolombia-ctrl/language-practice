import data from '../../../shared/phrases.json';
import type { Lang } from '../../../shared/lang';

export type { Lang };

// Same MP3s the native app bundles; Vite fingerprints them and the service worker caches them.
const audioFiles = import.meta.glob<string>('../../../assets/audio/*/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const LANGS: { id: Lang; name: string; native: string }[] = [
  { id: 'es', name: 'Spanish', native: 'Español' },
  { id: 'fr', name: 'French', native: 'Français' },
  { id: 'zh', name: 'Mandarin', native: '中文' },
  { id: 'pt', name: 'Portuguese', native: 'Português' },
  { id: 'it', name: 'Italian', native: 'Italiano' },
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
  /** Other transcriptions that count as correct, e.g. "123" for "uno, dos, tres". */
  alt: string[];
  audio: string;
};

export type Topic = { id: string; title: string; emoji: string };

const topics = data.topics as { id: string; title: string; emoji: string; phrases: RawPhrase[] }[];

export function isLang(value: string | undefined): value is Lang {
  return LANGS.some((l) => l.id === value);
}

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
    audio: audioFiles[`../../../assets/audio/${lang}/${p.id}.mp3`],
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
