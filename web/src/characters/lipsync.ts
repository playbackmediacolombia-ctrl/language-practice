import { useEffect, useRef, useState } from 'react';
import { nowPlaying } from '../lib/audio';

// Lip sync without touching how audio plays: each clip's loudness over time is worked out once
// from the file itself (decoded in the browser), and the mouth follows the clip's playback
// position. 0 is closed, 3 is wide open.

const FPS = 50;
const envelopes = new Map<string, Promise<Float32Array | null>>();

function envelope(url: string): Promise<Float32Array | null> {
  let e = envelopes.get(url);
  if (!e) {
    e = (async () => {
      try {
        const data = await (await fetch(url)).arrayBuffer();
        const buffer = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(data);
        const samples = buffer.getChannelData(0);
        const step = Math.max(1, Math.floor(buffer.sampleRate / FPS));
        const out = new Float32Array(Math.ceil(samples.length / step));
        let max = 0;
        for (let f = 0; f < out.length; f++) {
          let sum = 0;
          const end = Math.min(samples.length, (f + 1) * step);
          for (let i = f * step; i < end; i++) sum += samples[i] * samples[i];
          out[f] = Math.sqrt(sum / Math.max(1, end - f * step));
          max = Math.max(max, out[f]);
        }
        if (max > 0) for (let f = 0; f < out.length; f++) out[f] /= max;
        return out;
      } catch {
        return null; // can't read it: the mouth just opens and closes in a simple rhythm
      }
    })();
    envelopes.set(url, e);
  }
  return e;
}

/** Start working out a clip's lip sync ahead of time, so the mouth moves from the first word. */
export const prepareLipSync = (url: string) => void envelope(url);

/** How open the mouth is (0 to 3) while `url` is playing; 0 otherwise. */
export function useMouth(url: string | null): number {
  const [open, setOpen] = useState(0);
  const env = useRef<Float32Array | null>(null);
  useEffect(() => {
    env.current = null;
    if (!url) {
      setOpen(0);
      return;
    }
    let live = true;
    void envelope(url).then((e) => live && (env.current = e));
    let frame = 0;
    const tick = () => {
      const now = nowPlaying();
      let next = 0;
      if (now.playing && now.src.endsWith(url)) {
        const level = env.current ? env.current[Math.floor(now.time * FPS)] ?? 0 : (Math.sin(now.time * 18) + 1) / 2;
        next = level < 0.12 ? 0 : level < 0.35 ? 1 : level < 0.65 ? 2 : 3;
      }
      setOpen((o) => (o === next ? o : next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
  }, [url]);
  return open;
}
