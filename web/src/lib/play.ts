import type { Role } from '../characters/Character';
import type { Lang } from './content';

// Practice › Play: choose-your-own-adventure stories, phone calls, text chats, teach the bird,
// spot the mistake, real-life missions and debates. The content is in shared/play/<lang>.json
// (built by scripts/content/play.py), loaded only when you open Play. Recordings are named by a
// hash of who says it and what (see clip()); anything without one is read by the phone's voice.

/** 1 = Beginner–Elementary, 2 = Intermediate–Upper-intermediate, 3 = Advanced–Fluent. */
export type Band = 1 | 2 | 3;
export const BANDS: Record<Band, string> = { 1: 'Beginner & Elementary', 2: 'Intermediate', 3: 'Advanced & Fluent' };
/** Your band, from the level your next lesson is in. */
export const bandOf = (level: string): Band => (/Beginner|Elementary/.test(level) ? 1 : /Intermediate/.test(level) ? 2 : 3);

export type Choice = { text: string; en: string; to: string };
export type Scene = { text: string; en: string; choices?: Choice[]; end?: 'great' | 'good' };
export type Adventure = { id: string; band: Band; kind: 'trip' | 'mystery'; guide: Role; title: string; en: string; start: string; scenes: Record<string, Scene> };
export type Call = { id: string; band: Band; incoming: boolean; title: string; en: string; them: string; number: string; setting: string; lines: { who: 'them' | 'you'; text: string; en: string }[] };
export type ChatOption = { text: string; en: string; why: string | null };
export type ChatMessage = { from: 'them'; text: string; en: string } | { from: 'you'; options: ChatOption[] };
export type Chat = { id: string; band: Band; title: string; en: string; them: string; avatar: Role; slang: { term: string; means: string }[]; messages: ChatMessage[] };
export type TeachWord = { id: string; band: Band; word: string; en: string; explain: string; explainEn: string; keywords: string[] };
export type Spot = { id: string; band: Band; words: string[]; bad: number; fix: string; options: string[]; en: string; why: string };
export type Mission = { id: string; band: Band; title: string; en: string; task: string; phrases: { text: string; en: string }[] };
export type Line = { text: string; en: string };
export type PlayData = {
  join: string;
  adventures: Adventure[];
  calls: Call[];
  chats: Chat[];
  teach: { lines: { intro: Line; yes: Line; no: Line }; words: TeachWord[] };
  spot: Spot[];
  missions: Mission[];
  debate: { topics: { id: string; en: string; title: string }[]; phrases: Line[] };
};

export type PlayKind = 'adventure' | 'call' | 'chat' | 'teach' | 'spot' | 'mission' | 'debate';

const files = import.meta.glob<{ default: PlayData }>('../../../shared/play/*.json');
const cache = new Map<Lang, PlayData>();

/** The language's Play content (loads it the first time). */
export async function loadPlay(lang: Lang): Promise<PlayData> {
  const hit = cache.get(lang);
  if (hit) return hit;
  const data = (await files[`../../../shared/play/${lang}.json`]()).default;
  cache.set(lang, data);
  return data;
}
export const playCached = (lang: Lang) => cache.get(lang);

const audioFiles = import.meta.glob<string>('../../../assets/audio/play/*/*.mp3', { eager: true, query: '?url', import: 'default' });

/** FNV-1a: the same short hash scripts/generate_audio.py names the recordings with. */
export function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(text)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

/** A line's recording: `voice` is the narrator and you ('n') or the other person ('t'); the phone reads it if there's none. */
export function clip(lang: Lang, text: string, voice: 'n' | 't' = 'n'): string {
  return audioFiles[`../../../assets/audio/play/${lang}/${fnv(`${voice}|${text}`)}.mp3`] ?? `tts:${lang}:${encodeURIComponent(text)}`;
}

/** Shuffled copy (options are stored with the right one first). */
export function shuffled<T>(list: T[], seed = Math.random()): T[] {
  const out = [...list];
  let s = Math.floor(seed * 2 ** 31) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 48271) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Lowercase, without accents or punctuation: for matching what you said. */
export const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
