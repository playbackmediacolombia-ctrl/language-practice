import { useEffect, useRef, useState } from 'react';
import { deviceSpeaking, nowPlaying } from '../lib/audio';

// Lip sync without touching how audio plays. For a recording, each clip's loudness and how
// "bright" it sounds (zero crossings: high for e/i/s, low for o/u) are worked out once from the
// file itself, and the mouth follows the clip's playback position. For the phone's own voice
// there's no file to read, so the mouth follows the text: open on vowels (wide on a, round on
// o/u), closed between words, resynced at each word the voice reports. Smoothed both ways so
// it never snaps.

const FPS = 50;
type Env = { level: Float32Array; bright: Float32Array };
const envelopes = new Map<string, Promise<Env | null>>();

function envelope(url: string): Promise<Env | null> {
  let e = envelopes.get(url);
  if (!e) {
    e = (async () => {
      try {
        const data = await (await fetch(url)).arrayBuffer();
        const buffer = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(data);
        const samples = buffer.getChannelData(0);
        const step = Math.max(1, Math.floor(buffer.sampleRate / FPS));
        const n = Math.ceil(samples.length / step);
        const level = new Float32Array(n);
        const bright = new Float32Array(n);
        let max = 0;
        for (let f = 0; f < n; f++) {
          let sum = 0;
          let crossings = 0;
          const end = Math.min(samples.length, (f + 1) * step);
          for (let i = f * step; i < end; i++) {
            sum += samples[i] * samples[i];
            if (i > f * step && samples[i] >= 0 !== samples[i - 1] >= 0) crossings++;
          }
          level[f] = Math.sqrt(sum / Math.max(1, end - f * step));
          bright[f] = Math.min(1, crossings / Math.max(1, end - f * step) / 0.12);
          max = Math.max(max, level[f]);
        }
        if (max > 0) for (let f = 0; f < n; f++) level[f] /= max;
        return { level, bright };
      } catch {
        return null; // can't read it: the mouth follows a simple speaking rhythm
      }
    })();
    envelopes.set(url, e);
  }
  return e;
}

/** Start working out a clip's lip sync ahead of time, so the mouth moves from the first word. */
export const prepareLipSync = (url: string) => {
  if (!url.startsWith('tts:') && url !== 'device') void envelope(url);
};

const VOWEL: Record<string, [number, number]> = { a: [1, 0.3], á: [1, 0.3], à: [1, 0.3], ã: [0.9, 0.5], e: [0.7, 0.1], é: [0.7, 0.1], è: [0.75, 0.1], ê: [0.65, 0.2], i: [0.5, 0], í: [0.5, 0], o: [0.8, 0.9], ó: [0.8, 0.9], ô: [0.7, 0.9], õ: [0.7, 0.9], u: [0.55, 1], ú: [0.55, 1], ü: [0.55, 1], y: [0.5, 0.1] };

/** The phone's voice: how open the mouth should be now, from where it is in the text. */
function fromText(now: number): [number, number] | null {
  const s = deviceSpeaking();
  if (!s) return null;
  // About 14 characters a second at normal speed; Chinese about 5 characters a second.
  const cjk = /[一-鿿]/.test(s.text);
  const perSec = (cjk ? 4.5 : 14) * s.rate;
  const pos = s.char + ((now - s.at) / 1000) * perSec;
  const ch = s.text[Math.floor(pos)]?.toLowerCase() ?? ' ';
  const phase = pos % 1;
  if (cjk) return /[一-鿿]/.test(ch) ? [0.35 + 0.55 * Math.sin(phase * Math.PI), 0.4] : [0, 0.4];
  const v = VOWEL[ch];
  if (v) return [v[0] * (0.75 + 0.25 * Math.sin(phase * Math.PI)), v[1]];
  return /[a-zñç]/.test(ch) ? [0.18, 0.4] : [0, 0.4];
}

/**
 * How open the mouth is (0 to 1) and how round (0 wide to 1 round) while `url` is playing; a
 * "tts:" clip or "device" follows the phone's voice. 0 when nothing is playing.
 */
export function useMouth(url: string | null): { open: number; round: number } {
  const [shape, setShape] = useState({ open: 0, round: 0.4 });
  const env = useRef<Env | null>(null);
  useEffect(() => {
    env.current = null;
    if (!url) {
      setShape({ open: 0, round: 0.4 });
      return;
    }
    let live = true;
    const device = url === 'device' || url.startsWith('tts:');
    if (!device) void envelope(url).then((e) => live && (env.current = e));
    let frame = 0;
    let open = 0;
    let round = 0.4;
    const tick = () => {
      let target = 0;
      let targetRound = round;
      if (device) {
        const t = fromText(performance.now());
        if (t) [target, targetRound] = t;
      } else {
        const now = nowPlaying();
        if (now.playing && now.src.endsWith(url)) {
          const f = Math.floor(now.time * FPS);
          if (env.current) {
            const l = env.current.level[f] ?? 0;
            target = l < 0.08 ? 0 : Math.min(1, (l - 0.08) * 1.5);
            targetRound = 1 - (env.current.bright[f] ?? 0.5);
          } else target = (Math.sin(now.time * 18) + 1) / 2;
        }
      }
      // Opens quickly, closes a little slower: like real lips.
      open += (target - open) * (target > open ? 0.55 : 0.3);
      round += (targetRound - round) * 0.2;
      const q = (n: number) => Math.round(n * 20) / 20;
      setShape((s) => (s.open === q(open) && s.round === q(round) ? s : { open: q(open), round: q(round) }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
  }, [url]);
  return shape;
}
