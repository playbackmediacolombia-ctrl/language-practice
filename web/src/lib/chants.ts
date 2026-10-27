import es from '../../../shared/chants/es.json';
import fr from '../../../shared/chants/fr.json';
import zh from '../../../shared/chants/zh.json';
import esTimes from '../../../assets/audio/chants/es/timings.json';
import frTimes from '../../../assets/audio/chants/fr/timings.json';
import zhTimes from '../../../assets/audio/chants/zh/timings.json';
import type { Lang } from './content';

// Music mode: short original chants and song-style verses per level (no copyrighted songs),
// sung by the app's voices. Each line has its clip and every word's timing (from edge-tts), so
// the words light up karaoke-style. Mandarin also has tone chants.

const audioFiles = import.meta.glob<string>('../../../assets/audio/chants/*/*.mp3', { eager: true, query: '?url', import: 'default' });

export type ChantWord = { start: number; end: number; text: string };
export type ChantLine = { text: string; en: string; pinyin?: string; audio: string; words: ChantWord[] };
export type Chant = { id: string; level: number; kind: 'chant' | 'song' | 'tones'; title: string; en: string; bpm: number; lines: ChantLine[] };

type Raw = { chants: (Omit<Chant, 'lines'> & { lines: Omit<ChantLine, 'audio' | 'words'>[] })[] };
const RAW = { es, fr, zh } as unknown as Record<Lang, Raw>;
const TIMES = { es: esTimes, fr: frTimes, zh: zhTimes } as unknown as Record<Lang, Record<string, [number, number, string][]>>;
const cache = new Map<Lang, Chant[]>();

export function getChants(lang: Lang): Chant[] {
  let list = cache.get(lang);
  if (!list) {
    list = RAW[lang].chants.map((c) => ({
      ...c,
      lines: c.lines.map((l, i) => ({
        ...l,
        audio: audioFiles[`../../../assets/audio/chants/${lang}/${c.id}-${i}.mp3`],
        words: (TIMES[lang][`${c.id}-${i}`] ?? []).map(([start, dur, text]) => ({ start, end: start + dur, text })),
      })),
    }));
    cache.set(lang, list);
  }
  return list;
}

export const getChant = (lang: Lang, id: string) => getChants(lang).find((c) => c.id === id);

/** A line split into pieces for karaoke: each timed word (with its index) and the text between. */
export function karaokePieces(line: ChantLine): { text: string; word: number | null }[] {
  const out: { text: string; word: number | null }[] = [];
  let at = 0;
  line.words.forEach((w, i) => {
    const found = line.text.indexOf(w.text, at);
    if (found < 0) return;
    if (found > at) out.push({ text: line.text.slice(at, found), word: null });
    out.push({ text: w.text, word: i });
    at = found + w.text.length;
  });
  if (at < line.text.length) out.push({ text: line.text.slice(at), word: null });
  return out;
}
