// Pitch tracking for Mandarin tone practice, all in the browser. YIN (de Cheveigné & Kawahara,
// 2002) finds the voice's pitch every 10 ms; the line is then smoothed, cleaned of octave jumps
// and turned into semitones around the speaker's own middle pitch, so a deep voice and a high
// one can be compared by shape, which is what a tone is.

export const RATE = 16000;
const HOP = 160; // 10 ms
const WINDOW = 640; // 40 ms: over two periods of the lowest pitch we look for
const MIN_HZ = 60; // a low third tone often goes this deep (creaky voice)
const MAX_HZ = 500;
const THRESHOLD = 0.15; // YIN's aperiodicity cut-off: higher means less sure it's a voice
// Where pitch moves fast (a rising or falling tone) or the voice goes breathy, no dip gets under
// the threshold; YIN then takes the deepest one, if it's still clearly periodic and not quiet.
const FALLBACK = 0.3;
const FALLBACK_ENERGY = 1e-4;

export type Track = {
  /** Seconds between points. */
  step: number;
  /** Pitch in Hz, or null where there's no voice (silence, s, sh, f…). */
  hz: (number | null)[];
};

/** Downsamples to 16 kHz by averaging (which also filters out aliasing). */
export function downsample(input: Float32Array, rate: number): Float32Array {
  if (rate === RATE) return input;
  const ratio = rate / RATE;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / (end - start);
  }
  return out;
}

/** YIN on one frame: the pitch in Hz, or null if the frame isn't clearly voiced. */
function yin(x: Float32Array, start: number, diff: Float32Array): number | null {
  const minLag = Math.floor(RATE / MAX_HZ);
  const maxLag = Math.ceil(RATE / MIN_HZ);
  let energy = 0;
  for (let i = start; i < start + WINDOW; i++) energy += x[i] * x[i];
  if (energy / WINDOW < 1e-5) return null; // silence

  // Difference function, then the cumulative mean normalized difference.
  let running = 0;
  diff[0] = 1;
  for (let lag = 1; lag <= maxLag; lag++) {
    let d = 0;
    for (let i = start; i < start + WINDOW; i++) {
      const v = x[i] - x[i + lag];
      d += v * v;
    }
    running += d;
    diff[lag] = running ? (d * lag) / running : 1;
  }
  // First dip below the threshold, followed down to its bottom.
  let lag = minLag;
  while (lag < maxLag && diff[lag] >= THRESHOLD) lag++;
  if (lag >= maxLag) {
    if (energy / WINDOW < FALLBACK_ENERGY) return null;
    lag = minLag;
    for (let l = minLag + 1; l < maxLag; l++) if (diff[l] < diff[lag]) lag = l;
    if (diff[lag] >= FALLBACK) return null;
  }
  while (lag + 1 < maxLag && diff[lag + 1] < diff[lag]) lag++;
  // Parabolic interpolation for a finer estimate between samples.
  const [a, b, c] = [diff[lag - 1], diff[lag], diff[lag + 1]];
  const shift = (a - c) / (2 * (a - 2 * b + c)) || 0;
  return RATE / (lag + Math.max(-1, Math.min(1, shift)));
}

/** Raw pitch every 10 ms of 16 kHz audio. */
export function pitchTrack(samples: Float32Array): Track {
  const maxLag = Math.ceil(RATE / MIN_HZ);
  const diff = new Float32Array(maxLag + 1);
  const hz: (number | null)[] = [];
  for (let start = 0; start + WINDOW + maxLag < samples.length; start += HOP) hz.push(yin(samples, start, diff));
  return { step: HOP / RATE, hz: clean(hz) };
}

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};

/**
 * Drops lone voiced blips, pulls octave errors back (YIN sometimes locks onto half or double
 * the pitch), and smooths with a 5-point median.
 */
function clean(hz: (number | null)[]): (number | null)[] {
  const voiced = hz.filter((v): v is number => v !== null);
  if (voiced.length < 5) return hz.map(() => null);
  const mid = median(voiced);
  const fixed = hz.map((v) => {
    if (v === null) return null;
    if (v > mid * 1.8) return v / 2;
    if (v < mid / 1.8) return v * 2;
    return v;
  });
  // A voiced run shorter than 40 ms is noise, not a syllable.
  const out = [...fixed];
  for (let i = 0; i < out.length; ) {
    if (out[i] === null) {
      i++;
      continue;
    }
    let j = i;
    while (j < out.length && out[j] !== null) j++;
    if (j - i < 4) for (let k = i; k < j; k++) out[k] = null;
    i = j;
  }
  return out.map((v, i) => {
    if (v === null) return null;
    const near = out.slice(Math.max(0, i - 2), i + 3).filter((n): n is number => n !== null);
    return median(near);
  });
}

/** A contour ready to draw: semitones around the speaker's middle pitch, over 0..1 of the speech. */
export type Contour = { points: ({ x: number; st: number } | null)[]; centerHz: number };

/** Semitones around the median, with time stretched so the voiced part runs from 0 to 1. */
export function toContour(track: Track): Contour | null {
  const voiced = track.hz.filter((v): v is number => v !== null);
  if (voiced.length < 8) return null;
  const first = track.hz.findIndex((v) => v !== null);
  let last = track.hz.length - 1;
  while (track.hz[last] === null) last--;
  const center = median(voiced);
  const span = Math.max(1, last - first);
  const points = track.hz.slice(first, last + 1).map((v, i) => (v === null ? null : { x: i / span, st: 12 * Math.log2(v / center) }));
  return { points, centerHz: center };
}

/** The contour's value at `x` (0..1), bridging short gaps; null in long unvoiced stretches. */
function valueAt(points: Contour['points'], x: number): number | null {
  const i = Math.round(x * (points.length - 1));
  for (let d = 0; d <= 6; d++) {
    const p = points[i - d] ?? points[i + d];
    if (p) return p.st;
  }
  return null;
}

/**
 * How closely your tone shapes follow the native speaker's, 0 to 1: the average gap between the
 * two lines in semitones, at 40 points where both are voiced. 1 is identical; 3 semitones off on
 * average (a clearly different tone) is about 0.5.
 */
export function toneMatch(native: Contour, mine: Contour): number | null {
  let total = 0;
  let n = 0;
  for (let k = 0; k < 40; k++) {
    const x = k / 39;
    const a = valueAt(native.points, x);
    const b = valueAt(mine.points, x);
    if (a === null || b === null) continue;
    total += Math.abs(a - b);
    n++;
  }
  if (n < 10) return null;
  return Math.max(0, Math.min(1, 1 - total / n / 6));
}

const nativeCache = new Map<string, Promise<Contour | null>>();

/** The native recording's contour (fetched from the offline cache, decoded once). */
export function nativeContour(url: string, ctx: BaseAudioContext): Promise<Contour | null> {
  let c = nativeCache.get(url);
  if (!c) {
    c = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((buf) => toContour(pitchTrack(downsample(buf.getChannelData(0), buf.sampleRate))));
    c.catch(() => nativeCache.delete(url));
    nativeCache.set(url, c);
  }
  return c;
}
