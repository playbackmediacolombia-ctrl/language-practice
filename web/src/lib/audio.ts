// One shared <audio> element. iOS only lets a page play sound after a tap; once this element
// has played inside a tap, later plays (like the quiz's next question) are allowed too.
const player = new Audio();
player.preload = 'auto';

export function playPhrase(url: string, slow = false) {
  player.pause();
  if (!player.src.endsWith(url)) player.src = url;
  player.currentTime = 0;
  player.playbackRate = slow ? 0.7 : 1;
  player.play().catch(() => {
    // Autoplay blocked before the first tap; the user can press the play button.
  });
}

// One shared AudioContext for the mic and spoken feedback. iOS only starts it inside a tap,
// so startRecording() resumes it before its first await; it then stays usable for the
// feedback that plays after Whisper finishes.
let ctx: AudioContext | null = null;

function audioContext(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state !== 'running') void ctx.resume(); // also wakes it after an iOS 'interrupted'
  return ctx;
}

export type Feedback = 'great' | 'close' | 'retry';
const feedbackClips = new Map<Feedback, Promise<AudioBuffer>>();

function feedbackClip(name: Feedback): Promise<AudioBuffer> {
  let clip = feedbackClips.get(name);
  if (!clip) {
    clip = fetch(new URL(`feedback/${name}.mp3`, document.baseURI))
      .then((r) => r.arrayBuffer())
      .then((data) => audioContext().decodeAudioData(data));
    clip.catch(() => feedbackClips.delete(name));
    feedbackClips.set(name, clip);
  }
  return clip;
}

/** Says "Great job!" etc. Needs a recording to have started first (that unlocks audio on iOS). */
export async function playFeedback(name: Feedback) {
  try {
    const buffer = await feedbackClip(name);
    const c = audioContext();
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(c.destination);
    source.start();
  } catch {
    // Spoken feedback is a bonus; the colored result is already on screen.
  }
}

export type Recording = {
  /** Resolves with 16 kHz mono samples for Whisper, or an empty array if no speech was heard. */
  done: Promise<Float32Array>;
  /** Stops early (the mic button). Normally recording stops by itself after the speaker pauses. */
  stop: () => void;
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
export async function startRecording(onSpeechStart?: () => void): Promise<Recording> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot record audio. Open the app in Safari.');
  }
  const c = audioContext();
  player.pause();
  (['great', 'close', 'retry'] as const).forEach((name) => void feedbackClip(name));

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
  } catch {
    throw new Error('Microphone access was blocked. Allow it in Settings › Safari › Microphone (or tap "aA" › Website Settings).');
  }
  await c.resume();

  const source = c.createMediaStreamSource(stream);
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
    if (speechStart >= 0 && (i - lastSpeech) * frameSeconds >= SILENCE_TO_STOP) finish();
    else if (speechStart < 0 && seconds >= NO_SPEECH_TIMEOUT) finish();
    else if (seconds >= MAX_LENGTH) finish();
  };

  return { done, stop: () => finish() };
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
