// How much your recording sounds like the model recording, all in the browser. Whisper guesses
// words, so a lone syllable often comes back as something else ("是" as "shit", "rue" as "Ré")
// even when it's said perfectly. Comparing the sound itself doesn't have that problem: MFCCs
// describe the shape of the mouth frame by frame, and dynamic time warping lines the two up so
// speed doesn't matter. Normalizing each recording's average takes out the voice and the mic.

const RATE = 16000;
const FRAME = 400; // 25 ms
const HOP = 160; // 10 ms
const FFT = 512;
const MELS = 26;
const COEFFS = 12; // c1..c12: c0 is only loudness

const mel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
const hz = (m: number) => 700 * (10 ** (m / 2595) - 1);

const filters: { start: number; weights: number[] }[] = [];
for (let i = 0; i < MELS; i++) {
  const at = (k: number) => hz(mel(100) + ((mel(7000) - mel(100)) * k) / (MELS + 1));
  const [a, b, c] = [at(i), at(i + 1), at(i + 2)].map((f) => (f * FFT) / RATE);
  const start = Math.ceil(a);
  const weights: number[] = [];
  for (let k = start; k <= c; k++) weights.push(k <= b ? (k - a) / (b - a) : (c - k) / (c - b));
  filters.push({ start, weights });
}
const window = Float32Array.from({ length: FRAME }, (_, i) => 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (FRAME - 1)));
const dct = Array.from({ length: COEFFS }, (_, c) => Float32Array.from({ length: MELS }, (_, m) => Math.cos((Math.PI * (c + 1) * (m + 0.5)) / MELS)));

/** In-place radix-2 FFT. */
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const step = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const [c, s] = [Math.cos(step * k), Math.sin(step * k)];
        const [a, b] = [i + k, i + k + len / 2];
        const tr = re[b] * c - im[b] * s;
        const ti = re[b] * s + im[b] * c;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

/** The MFCCs of 16 kHz audio, with quiet frames at either end cut off and each coefficient's mean removed. */
export function features(samples: Float32Array): Float32Array[] {
  const frames: { c: Float32Array; energy: number }[] = [];
  const re = new Float32Array(FFT);
  const im = new Float32Array(FFT);
  for (let start = 0; start + FRAME <= samples.length; start += HOP) {
    re.fill(0);
    im.fill(0);
    let energy = 0;
    for (let i = 0; i < FRAME; i++) {
      re[i] = samples[start + i] * window[i];
      energy += re[i] * re[i];
    }
    fft(re, im);
    const logs = filters.map(({ start: s, weights }) => {
      let sum = 0;
      weights.forEach((w, k) => (sum += w * (re[s + k] ** 2 + im[s + k] ** 2)));
      return Math.log(sum + 1e-8);
    });
    frames.push({ c: dct.map((d) => d.reduce((t, v, m) => t + v * logs[m], 0) as number).reduce((out, v, i) => ((out[i] = v), out), new Float32Array(COEFFS)), energy });
  }
  const loudest = Math.max(0, ...frames.map((f) => f.energy));
  let from = 0;
  let to = frames.length;
  while (from < to && frames[from].energy < loudest * 0.01) from++;
  while (to > from && frames[to - 1].energy < loudest * 0.01) to--;
  const kept = frames.slice(from, to).map((f) => f.c);
  if (!kept.length) return [];
  const mean = new Float32Array(COEFFS);
  for (const f of kept) f.forEach((v, i) => (mean[i] += v / kept.length));
  return kept.map((f) => f.map((v, i) => v - mean[i]));
}

/** Average frame distance along the best time alignment (lower is more alike). */
export function distance(a: Float32Array[], b: Float32Array[]): number {
  if (!a.length || !b.length) return Infinity;
  if (a.length > b.length * 3 || b.length > a.length * 3) return Infinity; // nothing like the same length
  const band = Math.max(20, Math.abs(a.length - b.length) + 10);
  let prev = new Float32Array(b.length + 1).fill(Infinity);
  let cur = new Float32Array(b.length + 1);
  prev[0] = 0;
  for (let i = 1; i <= a.length; i++) {
    cur.fill(Infinity);
    const centre = Math.round((i * b.length) / a.length);
    for (let j = Math.max(1, centre - band); j <= Math.min(b.length, centre + band); j++) {
      let d = 0;
      for (let k = 0; k < COEFFS; k++) d += (a[i - 1][k] - b[j - 1][k]) ** 2;
      cur[j] = Math.sqrt(d) + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length] / (a.length + b.length);
}
