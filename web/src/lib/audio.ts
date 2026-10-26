import { getProgress, type Speed } from './progress';

/** Playback rates: the speed setting's three, and the Slow buttons' slower one. */
export const RATES: Record<Speed, number> = { slow: 0.8, normal: 1, fast: 1.25 };
const SLOW_BUTTON = 0.7;

/** `true` is a Slow button; `false` uses the speed setting; a Speed picks that speed. */
export type PlaySpeed = boolean | Speed;
export const rateFor = (speed: PlaySpeed = false) => (speed === true ? SLOW_BUTTON : RATES[speed || getProgress().speed] ?? 1);

// One shared <audio> element. iOS only lets a page play sound after a tap; once this element
// has played inside a tap, later plays (like the quiz's next question) are allowed too.
const player = new Audio();
player.preload = 'auto';

export function playPhrase(url: string, speed: PlaySpeed = false, fromSequence = false) {
  if (!fromSequence) sequence?.(); // a single clip interrupts a story being read
  player.pause();
  if (!player.src.endsWith(url)) player.src = url;
  player.currentTime = 0;
  player.playbackRate = rateFor(speed);
  player.play().catch(() => {
    // Autoplay blocked before the first tap; the user can press the play button.
  });
}

let sequence: (() => void) | null = null;

/** Stops whatever phrase (or story) is playing. */
export function stopPhrase() {
  sequence?.();
  player.pause();
}

/**
 * Plays a clip and resolves when it ends: true if it played to the end, false if something else
 * paused or replaced it (or it failed). Start it from a tap the first time (iOS).
 */
export function playAndWait(url: string, speed: PlaySpeed = false): Promise<boolean> {
  return new Promise((resolve) => {
    let started = false; // a 'pause' from stopping the previous clip arrives late; ignore it
    const settle = (ended: boolean) => {
      clearTimeout(timer);
      player.removeEventListener('playing', onPlaying);
      player.removeEventListener('ended', onEnded);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('error', onError);
      resolve(ended);
    };
    const onPlaying = () => (started = true);
    const onEnded = () => settle(true);
    const onPause = () => started && !player.ended && settle(false);
    const onError = () => settle(false);
    const timer = setTimeout(() => !started && settle(false), 8000); // never started (blocked or offline)
    playPhrase(url, speed);
    player.addEventListener('playing', onPlaying);
    player.addEventListener('ended', onEnded);
    player.addEventListener('pause', onPause);
    player.addEventListener('error', onError);
  });
}

/** What the shared player is doing right now (for the role-play characters' lip sync). */
export const nowPlaying = () => ({ src: player.src, time: player.currentTime, playing: !player.paused && !player.ended });

/** Length of the clip that's loaded, in seconds (0 if unknown). */
export const clipSeconds = () => (Number.isFinite(player.duration) ? player.duration : 0);

/**
 * Plays clips one after another with a short pause between them (a story read aloud), from
 * `start`. `onIndex` gets each clip's index as it starts, and -1 when it's over or stopped.
 * Returns a stop function. Start it from a tap (iOS).
 */
export function playSequence(urls: string[], start: number, speed: PlaySpeed, onIndex: (i: number) => void): () => void {
  sequence?.();
  let i = start;
  let timer = 0;
  const onEnded = () => {
    timer = window.setTimeout(next, 450);
  };
  const stop = () => {
    clearTimeout(timer);
    player.removeEventListener('ended', onEnded);
    if (sequence === stop) sequence = null;
    onIndex(-1);
  };
  const next = () => {
    if (i >= urls.length) return stop();
    onIndex(i);
    playPhrase(urls[i++], speed, true);
  };
  player.addEventListener('ended', onEnded);
  sequence = stop;
  next();
  return () => {
    player.pause();
    stop();
  };
}

// One shared AudioContext for the mic and spoken feedback. iOS only starts it inside a tap,
// so startRecording() resumes it before its first await; it then stays usable for the
// feedback that plays after Whisper finishes.
let ctx: AudioContext | null = null;

/** The shared AudioContext (sound effects use it too). */
export function audioContext(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state !== 'running') void ctx.resume(); // also wakes it after an iOS 'interrupted'
  return ctx;
}

type AudioSession = { type: string };
const session = (navigator as { audioSession?: AudioSession }).audioSession;
// Safari 16.4+: play Web Audio sounds even with the silent switch on, like the phrase audio does.
if (session) session.type = 'playback';

// Listen & repeat's graded lines. Lessons use the varied clips in feedback.ts instead.
const FEEDBACK = ['great', 'close', 'retry'] as const;
export type Feedback = (typeof FEEDBACK)[number];
const feedbackUrl = (name: Feedback) => new URL(`feedback/${name}.mp3`, document.baseURI).href;

/** Call from a tap before sounds play without one (iOS). `preload` clips are fetched now. */
export function unlockAudio(preload: string[] = FEEDBACK.map(feedbackUrl)) {
  audioContext();
  preload.forEach((url) => void loadClip(url));
}

const clips = new Map<string, Promise<AudioBuffer>>();

function loadClip(url: string): Promise<AudioBuffer> {
  let clip = clips.get(url);
  if (!clip) {
    clip = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => audioContext().decodeAudioData(data));
    clip.catch(() => clips.delete(url));
    clips.set(url, clip);
  }
  return clip;
}

/** Plays a short clip through Web Audio. Needs unlockAudio() or a recording first (iOS). */
export async function playClip(url: string, delay = 0) {
  try {
    const buffer = await loadClip(url);
    const c = audioContext();
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(c.destination);
    source.start(c.currentTime + delay);
  } catch {
    // Spoken feedback is a bonus; the result is already on screen.
  }
}

export const playFeedback = (name: Feedback, delay = 0) => playClip(feedbackUrl(name), delay);

/** Plays a clip once the phrase audio (if any) has finished, so the two don't talk over each other. */
export function playClipAfterPhrase(url: string) {
  if (player.paused || player.ended) return void playClip(url, 0.35);
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    player.removeEventListener('ended', go);
    void playClip(url, 0.2);
  };
  player.addEventListener('ended', go);
  setTimeout(go, 4000); // in case 'ended' never fires (e.g. the phrase was interrupted)
}

export type Recording = {
  /** Resolves with 16 kHz mono samples for Whisper, or an empty array if no speech was heard. */
  done: Promise<Float32Array>;
  /** Stops early (the mic button). Normally recording stops by itself after the speaker pauses. */
  stop: () => void;
  /** Live input, for drawing a sound wave while recording. */
  analyser: AnalyserNode;
};

const FRAME = 4096;
const SILENCE_TO_STOP = 1.0; // seconds of quiet after speaking that ends the recording (default)
const NO_SPEECH_TIMEOUT = 6; // give up if nothing is said for this long
const MAX_LENGTH = 12; // our phrases are short
const PAD = 0.25; // seconds kept before and after the speech

/**
 * Starts recording from the mic and stops automatically when the speaker finishes.
 * Call it directly from a tap handler (iOS needs that to start audio).
 */
/**
 * How long a pause should end the recording when you're saying `text`: longer when it's more
 * than one sentence, since people (and the model recordings) pause between sentences.
 */
export const pauseFor = (text: string) => (/[.!?。！？…][\s"”»]*\S/u.test(text.trim()) ? 1.8 : 1.2);

export async function startRecording(onSpeechStart?: () => void, { silence = SILENCE_TO_STOP } = {}): Promise<Recording> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot record audio. Open the app in Safari.');
  }
  const c = audioContext();
  player.pause();
  unlockAudio();
  if (session) session.type = 'play-and-record';

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
  } catch {
    if (session) session.type = 'playback';
    throw new Error('Microphone access was blocked. Allow it in Settings › Safari › Microphone (or tap "aA" › Website Settings).');
  }
  await c.resume();

  const source = c.createMediaStreamSource(stream);
  const analyser = c.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  // ScriptProcessorNode is deprecated but, unlike MediaRecorder + decodeAudioData, gives raw
  // samples reliably on every iOS version. Its output is silent; it only has to be connected.
  const processor = c.createScriptProcessor(FRAME, 1, 1);
  source.connect(processor);
  processor.connect(c.destination);

  const frameSeconds = FRAME / c.sampleRate;
  const frames: Float32Array[] = [];
  let noise = 0; // running estimate of the background level
  let loudFrames = 0;
  let speechStart = -1; // frame index where speech began
  let lastSpeech = -1;

  let finish: () => void = () => {};
  const done = new Promise<Float32Array>((resolve) => {
    let finished = false;
    finish = () => {
      if (finished) return;
      finished = true;
      processor.onaudioprocess = null;
      source.disconnect();
      processor.disconnect();
      stream.getTracks().forEach((t) => t.stop()); // turn the mic indicator off
      if (session) session.type = 'playback';
      if (speechStart < 0) return resolve(new Float32Array(0));
      const pad = Math.ceil(PAD / frameSeconds);
      const kept = frames.slice(Math.max(0, speechStart - pad), lastSpeech + 1 + pad);
      resolve(resample(kept, c.sampleRate));
    };
  });

  processor.onaudioprocess = (e) => {
    const samples = new Float32Array(e.inputBuffer.getChannelData(0));
    const i = frames.push(samples) - 1;
    const level = rms(samples);

    // Track the room's noise level (drops at once, rises only slowly and only between words),
    // and treat clearly louder frames as speech.
    const loud = i > 0 && level > Math.max(0.01, noise * 3);
    if (i === 0 || level < noise) noise = level;
    else if (!loud) noise = noise * 0.95 + level * 0.05;
    loudFrames = loud ? loudFrames + 1 : 0;
    if (loud && speechStart >= 0) lastSpeech = i;
    if (loudFrames >= 2 && speechStart < 0) {
      speechStart = i - 1;
      lastSpeech = i;
      onSpeechStart?.();
    }

    const seconds = (i + 1) * frameSeconds;
    if (speechStart >= 0 && (i - lastSpeech) * frameSeconds >= silence) finish();
    else if (speechStart < 0 && seconds >= NO_SPEECH_TIMEOUT) finish();
    else if (seconds >= MAX_LENGTH) finish();
  };

  return { done, stop: () => finish(), analyser };
}

function rms(samples: Float32Array) {
  let sum = 0;
  for (const v of samples) sum += v * v;
  return Math.sqrt(sum / samples.length);
}

/** Joins the frames and downsamples to 16 kHz by averaging (which also filters out aliasing). */
function resample(frames: Float32Array[], rate: number): Float32Array {
  const total = frames.reduce((n, f) => n + f.length, 0);
  const input = new Float32Array(total);
  let offset = 0;
  for (const f of frames) {
    input.set(f, offset);
    offset += f.length;
  }
  const ratio = rate / 16000;
  const out = new Float32Array(Math.floor(total / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(total, Math.max(start + 1, Math.floor((i + 1) * ratio)));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / (end - start);
  }
  return out;
}
