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

// "tts:<lang>:<text>" plays text with the phone's own voice (words the AI partner taught you
// have no recording). Offline, free and private: iPhones have Spanish, French and Chinese voices.
const VOICE_LANGS: Record<string, string[]> = { es: ['es-CO', 'es-MX', 'es-US', 'es-ES', 'es'], fr: ['fr-FR', 'fr-CA', 'fr'], zh: ['zh-CN', 'zh-TW', 'zh'], pt: ['pt-BR', 'pt-PT', 'pt'], it: ['it-IT', 'it'], en: ['en-US', 'en-GB', 'en'] };

/** Says `text` with the device's voice for `lang`; resolves when it's done (or can't speak). */
export function speakDevice(text: string, lang: string, speed: PlaySpeed = false): Promise<boolean> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth || !text) return resolve(false);
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    for (const tag of VOICE_LANGS[lang] ?? [lang]) {
      const v = voices.find((x) => x.lang.replace('_', '-').startsWith(tag));
      if (v) {
        u.voice = v;
        break;
      }
    }
    u.lang = (VOICE_LANGS[lang] ?? [lang])[0];
    u.rate = rateFor(speed) * 0.95;
    u.onstart = () => (deviceSpeech = { text, at: performance.now(), char: 0, rate: u.rate });
    u.onboundary = (e) => deviceSpeech && Object.assign(deviceSpeech, { char: e.charIndex, at: performance.now() });
    u.onend = () => {
      deviceSpeech = null;
      resolve(true);
    };
    u.onerror = () => {
      deviceSpeech = null;
      resolve(false);
    };
    synth.speak(u);
  });
}

/** What the phone's voice is saying now (for lip sync): the text, and the word it last reached. */
let deviceSpeech: { text: string; at: number; char: number; rate: number } | null = null;
export const deviceSpeaking = () => deviceSpeech;

const deviceClip = (url: string) => {
  const [, lang, ...rest] = url.split(':');
  return { lang, text: decodeURIComponent(rest.join(':')) };
};

// One voice at a time. Phrases (the <audio> player), spoken feedback (Web Audio clips) and the
// phone's own voice all go through this: starting one stops the others, and after a feedback
// line finishes the next clip waits a moment (QUIET_MS) so they never run together.
const QUIET_MS = 650;
let voiceClip: AudioBufferSourceNode | null = null; // a feedback line playing now
let pendingClip = 0; // a feedback line waiting to start
let pendingPhrase = 0; // a phrase waiting for the pause after a feedback line
let quietUntil = 0; // performance.now() before which a new phrase waits
const phraseWaiters = new Set<() => void>(); // feedback lines waiting for the phrase to end

/** Cuts off spoken feedback (playing or waiting), e.g. when you tap Continue. */
export function cutFeedback() {
  clearTimeout(pendingClip);
  pendingClip = 0;
  phraseWaiters.forEach((go) => player.removeEventListener('ended', go));
  phraseWaiters.clear();
  if (voiceClip) {
    try {
      voiceClip.stop();
    } catch {
      // already ended
    }
    voiceClip = null;
    quietUntil = performance.now() + 120; // a clean, short break before what comes next
  }
}

/** Stops everything that talks: phrases, stories, feedback lines and the phone's voice. */
export function stopAllVoices() {
  sequence?.();
  cutFeedback();
  clearTimeout(pendingPhrase);
  window.speechSynthesis?.cancel();
  player.pause();
}

export function playPhrase(url: string, speed: PlaySpeed = false, fromSequence = false) {
  if (!fromSequence) sequence?.(); // a single clip interrupts a story being read
  cutFeedback();
  clearTimeout(pendingPhrase);
  window.speechSynthesis?.cancel();
  player.pause();
  const wait = quietUntil - performance.now();
  if (wait > 0) {
    pendingPhrase = window.setTimeout(() => startPhrase(url, speed), wait);
    return;
  }
  startPhrase(url, speed);
}

function startPhrase(url: string, speed: PlaySpeed) {
  pendingPhrase = 0;
  if (url.startsWith('tts:')) {
    const { lang, text } = deviceClip(url);
    void speakDevice(text, lang, speed);
    return;
  }
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
  clearTimeout(pendingPhrase);
  window.speechSynthesis?.cancel();
  player.pause();
}

/**
 * Plays a clip and resolves when it ends: true if it played to the end, false if something else
 * paused or replaced it (or it failed). Start it from a tap the first time (iOS).
 */
export function playAndWait(url: string, speed: PlaySpeed = false): Promise<boolean> {
  if (url.startsWith('tts:')) {
    const { lang, text } = deviceClip(url);
    return speakDevice(text, lang, speed);
  }
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

/**
 * Call inside a tap before audio that arrives later (the AI partner's replies): iOS only lets the
 * shared player, and the phone's own voice, start by themselves after they've played in a tap.
 */
export function primePlayer() {
  const rate = 8000;
  const samples = rate / 20; // 50 ms of silence, as a WAV
  const buf = new DataView(new ArrayBuffer(44 + samples * 2));
  const str = (o: number, t: string) => [...t].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  buf.setUint32(4, 36 + samples * 2, true);
  str(8, 'WAVEfmt ');
  buf.setUint32(16, 16, true);
  buf.setUint16(20, 1, true);
  buf.setUint16(22, 1, true);
  buf.setUint32(24, rate, true);
  buf.setUint32(28, rate * 2, true);
  buf.setUint16(32, 2, true);
  buf.setUint16(34, 16, true);
  str(36, 'data');
  buf.setUint32(40, samples * 2, true);
  player.src = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  player.play().catch(() => {});
  const synth = window.speechSynthesis;
  if (synth) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  }
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

// Speaking exercises open the mic and play the model by themselves, sometimes on a screen you've
// only just tapped your way to. iOS allows that once audio has started inside any tap, so the
// first tap of the visit unlocks both the player and the shared context.
let primed = false;
const unlockOnTap = () => {
  audioContext();
  if (primed) return;
  primed = true;
  primePlayer();
};
for (const type of ['click', 'touchend']) document.addEventListener(type, unlockOnTap, { capture: true });

type AudioSession = { type: string };
const session = (navigator as { audioSession?: AudioSession }).audioSession;
// Safari 16.4+: play Web Audio sounds even with the silent switch on, like the phrase audio does.
if (session) session.type = 'playback';

// What a speaking exercise says about your try. Lessons' other answers use the varied clips in feedback.ts.
const FEEDBACK = ['great', 'close', 'retry', 'nohear', 'off-sound', 'tone-1', 'tone-2', 'tone-3', 'tone-4', 'tone-5'] as const;
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
/** Plays a spoken feedback line on the voice channel after `delay` seconds (cancelled by cutFeedback). */
export function playClip(url: string, delay = 0) {
  clearTimeout(pendingClip);
  const go = async () => {
    pendingClip = 0;
    try {
      const buffer = await loadClip(url);
      // A phrase is talking (or about to): speak right after it instead of over it.
      if ((!player.paused && !player.ended) || pendingPhrase) return void playClipAfterPhrase(url);
      cutFeedback();
      const c = audioContext();
      const source = c.createBufferSource();
      source.buffer = buffer;
      source.connect(c.destination);
      voiceClip = source;
      quietUntil = Infinity; // while it talks, phrases wait (or cut it off, see playPhrase)
      source.onended = () => {
        if (voiceClip !== source) return;
        voiceClip = null;
        quietUntil = performance.now() + QUIET_MS;
      };
      source.start();
    } catch {
      // Spoken feedback is a bonus; the result is already on screen.
    }
  };
  pendingClip = window.setTimeout(() => void go(), delay * 1000);
}

export const playFeedback = (name: Feedback, delay = 0) => playClip(feedbackUrl(name), delay);

/** Says a feedback line and resolves when it has finished (or was cut off), so what comes next never talks over it. */
export async function sayFeedback(name: Feedback): Promise<void> {
  let buffer: AudioBuffer;
  try {
    // Never let a clip that won't load or decode hold up the exercise.
    buffer = await Promise.race([loadClip(feedbackUrl(name)), new Promise<never>((_, no) => setTimeout(() => no(new Error('too slow')), 3000))]);
  } catch {
    return; // spoken feedback is a bonus; it's on screen too
  }
  cutFeedback();
  const c = audioContext();
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.connect(c.destination);
  voiceClip = source;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, buffer.duration * 1000 + 500); // a suspended context never reports the end
    source.onended = () => {
      clearTimeout(timer);
      if (voiceClip === source) voiceClip = null;
      resolve();
    };
    source.start();
  });
}

/** Plays a clip once the phrase audio (if any) has finished, so the two don't talk over each other. */
export function playClipAfterPhrase(url: string) {
  if ((player.paused || player.ended) && !pendingPhrase) return void playClip(url, 0.35);
  const go = () => {
    if (!phraseWaiters.delete(go)) return;
    player.removeEventListener('ended', go);
    playClip(url, 0.3);
  };
  phraseWaiters.add(go);
  player.addEventListener('ended', go);
  // If the phrase never ends (cut off by Continue), cutFeedback() removes this waiter.
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
const SILENCE_TO_STOP = 1.0; // seconds of quiet after speaking that ends the recording
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
