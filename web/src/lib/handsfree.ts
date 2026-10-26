import enIndex from '../../../shared/en-audio.json';
import type { Item } from './course';

// Hands-free mode: a lesson as one long audio track, like a podcast. For each word it says the
// English, leaves a pause to answer out loud, plays the answer, then leaves a pause to repeat it.
// One continuous track (not clips started by JavaScript) is what lets iOS keep playing it with the
// screen locked, where timers stop running.

const enFiles = import.meta.glob<string>('../../../assets/audio/en/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** The spoken English meaning (made by the audio script), if there is one. */
export function englishAudio(en: string): string | undefined {
  const file = (enIndex as Record<string, string>)[en];
  return file ? enFiles[`../../../assets/audio/en/${file}`] : undefined;
}

export const canPlayHandsFree = (item: Item) => item.kind !== 'sound' && !!englishAudio(item.en);

export type Pause = 'short' | 'medium' | 'long';
/** Seconds to answer, on top of half the answer's own length. */
export const THINK: Record<Pause, number> = { short: 2, medium: 3.5, long: 5.5 };

/** Where each word sits in the track, in seconds: the English starts, the answer starts, the next word starts. */
export type Segment = { item: Item; start: number; answer: number; end: number };
export type Track = { url: string; duration: number; segments: Segment[] };

const RATE = 24000; // the Edge voices' own rate, so nothing is resampled

async function decode(url: string): Promise<Float32Array> {
  const data = await (await fetch(url)).arrayBuffer();
  const buffer = await new OfflineAudioContext(1, 1, RATE).decodeAudioData(data);
  return buffer.getChannelData(0);
}

/** Builds the track for `items` as a WAV file in memory. `onProgress` gets 0..1 as words are added. */
export async function buildTrack(items: Item[], pause: Pause, onProgress?: (done: number) => void): Promise<Track> {
  const parts: Float32Array[] = [];
  let length = 0;
  const add = (samples: Float32Array) => {
    parts.push(samples);
    length += samples.length;
  };
  const silence = (seconds: number) => add(new Float32Array(Math.round(seconds * RATE)));
  const now = () => length / RATE;

  const segments: Segment[] = [];
  silence(0.5);
  const usable = items.filter(canPlayHandsFree);
  for (const [n, item] of usable.entries()) {
    const [english, answer] = await Promise.all([decode(englishAudio(item.en)!), decode(item.audio)]);
    const start = now();
    add(english);
    silence(THINK[pause] + answer.length / RATE / 2); // your turn to say it
    const answerAt = now();
    add(answer);
    silence(answer.length / RATE + 1); // and to say it again after the voice
    segments.push({ item, start, answer: answerAt, end: now() });
    silence(0.4);
    onProgress?.((n + 1) / usable.length);
  }
  const blob = wav(parts, length);
  return { url: URL.createObjectURL(blob), duration: now(), segments };
}

/** 16-bit mono PCM WAV. */
function wav(parts: Float32Array[], length: number): Blob {
  const out = new DataView(new ArrayBuffer(44 + length * 2));
  const text = (at: number, s: string) => [...s].forEach((c, i) => out.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  out.setUint32(4, 36 + length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  out.setUint32(16, 16, true); // fmt chunk size
  out.setUint16(20, 1, true); // PCM
  out.setUint16(22, 1, true); // mono
  out.setUint32(24, RATE, true);
  out.setUint32(28, RATE * 2, true); // bytes per second
  out.setUint16(32, 2, true); // bytes per frame
  out.setUint16(34, 16, true); // bits per sample
  text(36, 'data');
  out.setUint32(40, length * 2, true);
  let at = 44;
  for (const part of parts) {
    for (const v of part) {
      out.setInt16(at, Math.max(-1, Math.min(1, v)) * 0x7fff, true);
      at += 2;
    }
  }
  return new Blob([out], { type: 'audio/wav' });
}

/** The word playing at `time`, and whether its answer has started. */
export function segmentAt(track: Track, time: number): { index: number; revealed: boolean } {
  let index = track.segments.findIndex((s) => time < s.end + 0.4);
  if (index < 0) index = track.segments.length - 1;
  return { index, revealed: time >= track.segments[index].answer };
}
