import { audioContext } from './audio';
import { getProgress } from './progress';

// Sound effects, haptics and reduced motion. Everything here is optional polish: it checks
// the user's settings and fails silently where the browser can't do it.

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Sound effects (synthesized, so there are no files to download) ----

type Note = { freq: number; at: number; len: number; type?: OscillatorType; gain?: number; slideTo?: number };

function tone(c: AudioContext, out: AudioNode, { freq, at, len, type = 'sine', gain = 0.2, slideTo }: Note) {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + len);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + len + 0.02);
}

const SOUNDS: Record<'tap' | 'correct' | 'wrong' | 'complete', Note[]> = {
  // A soft, short tick.
  tap: [{ freq: 1500, at: 0, len: 0.04, gain: 0.05, slideTo: 900 }],
  // Two bright rising notes with a little shimmer on top.
  correct: [
    { freq: 784, at: 0, len: 0.16, type: 'triangle', gain: 0.18 },
    { freq: 1175, at: 0.08, len: 0.26, type: 'triangle', gain: 0.18 },
    { freq: 2350, at: 0.08, len: 0.18, gain: 0.03 },
  ],
  // A gentle low "bonk", not a buzzer.
  wrong: [
    { freq: 300, at: 0, len: 0.2, type: 'triangle', gain: 0.16, slideTo: 190 },
    { freq: 220, at: 0.09, len: 0.22, type: 'sine', gain: 0.12, slideTo: 150 },
  ],
  // A rising arpeggio that lands on a chord.
  complete: [
    { freq: 523, at: 0, len: 0.18, type: 'triangle', gain: 0.16 },
    { freq: 659, at: 0.09, len: 0.18, type: 'triangle', gain: 0.16 },
    { freq: 784, at: 0.18, len: 0.18, type: 'triangle', gain: 0.16 },
    { freq: 1047, at: 0.27, len: 0.7, type: 'triangle', gain: 0.16 },
    { freq: 784, at: 0.27, len: 0.7, gain: 0.08 },
    { freq: 2093, at: 0.27, len: 0.5, gain: 0.025 },
  ],
};

export type Sound = keyof typeof SOUNDS;

export function sfx(sound: Sound) {
  if (!getProgress().sfx) return;
  try {
    const c = audioContext();
    const out = c.createGain();
    out.gain.value = 0.9;
    out.connect(c.destination);
    SOUNDS[sound].forEach((n) => tone(c, out, n));
  } catch {
    // No sound is fine.
  }
}

// ---- Haptics ----

// iPhone Safari has no navigator.vibrate, but since iOS 18 toggling an
// <input type="checkbox" switch> gives a light system haptic. Clicking its label from
// inside a tap toggles it; anywhere else this does nothing.
let switchLabel: HTMLLabelElement | null = null;
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

function iosTick() {
  if (!switchLabel) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.id = 'haptic-switch';
    input.tabIndex = -1;
    switchLabel = document.createElement('label');
    switchLabel.htmlFor = input.id;
    switchLabel.setAttribute('aria-hidden', 'true');
    switchLabel.className = 'haptic-switch';
    switchLabel.append(input);
    document.body.append(switchLabel);
  }
  switchLabel.click();
}

const PATTERNS = { light: 10, success: [12, 60, 18], error: [25, 50, 25, 50, 25] };

/** Call from inside a tap handler. */
export function haptic(kind: keyof typeof PATTERNS = 'light') {
  if (!getProgress().haptics) return;
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(PATTERNS[kind]);
    } else if (isIOS) {
      iosTick();
      // A second tick reads as "something happened" for results; iOS may drop it, which is fine.
      if (kind !== 'light') setTimeout(iosTick, 110);
    }
  } catch {
    // Unsupported: no haptics.
  }
}

/** The usual feedback for tapping an answer: a tick and a click. */
export function tapFeedback() {
  haptic('light');
  sfx('tap');
}
