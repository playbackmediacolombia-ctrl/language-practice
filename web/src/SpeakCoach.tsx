import { useEffect, useRef, useState } from 'react';
import { audioContext, cutFeedback, type Feedback, playAndWait, type PlaySpeed, type Recording, sayFeedback, startRecording, stopAllVoices, unlockAudio } from './lib/audio';
import type { Lang } from './lib/content';
import { haptic, sfx, tapFeedback } from './lib/fx';
import { type Contour, nativeSamples, pitchTrack, toContour } from './lib/pitch';
import { useProgress } from './lib/progress';
import { navigate } from './lib/router';
import { distance, features } from './lib/soundMatch';
import { gradeSpeech, isShort, type Verdict } from './lib/speechGrade';
import { checkTones, spokenTones, type Tone, TONE_SHAPES } from './lib/tones';
import { chosenModel, isModelReady, loadModel, MODELS, transcribe } from './lib/whisper';
import { Heatmap } from './Heatmap';
import { Icon, ProgressBar, Waveform } from './ui';

// Every speaking exercise goes through here: the voice plays, the mic opens by itself with a live
// meter, it stops after a second of silence, and you hear how it went. Right moves on; a near
// miss says what was off and listens again; a miss replays the model first. Hearing nothing
// always says so and waits for a tap. After three misses you can skip it for now.

export type Spoken = { text: string; alt?: string[]; pinyin?: string; audio?: string; id?: string; en?: string; kind?: string };

/** `play`: the voice, then the mic. `listen`: the mic straight away (recall, or the parent just played it). `tap`: nothing until you tap. */
export type CoachStart = 'play' | 'listen' | 'tap';

const SHOW_RIGHT_MS = 900; // how long "Great!" stays before moving on
const MISSES_TO_SKIP = 3;
const AFTER_VOICE_MS = 150; // lets the speaker's tail die away before the mic opens

const LABEL: Record<Verdict['grade'], string> = { great: 'Great!', close: 'Close, try again', retry: 'Not quite, listen again' };
const NOHEAR = "I didn't hear you, tap the mic to try again.";

type Stage = 'idle' | 'playing' | 'listening' | 'heard' | 'checking' | 'telling' | 'done' | 'no-model';

const testHook = location.search.includes('test');

/** A pause long enough for a breath between sentences, otherwise a second. */
const silenceFor = (text: string) => (/[.!?。！？…][\s"”»]*\S/u.test(text.trim()) ? 1.8 : 1);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function SpeakCoach({
  lang,
  said,
  start = 'play',
  advance = true,
  drill = false,
  onRight,
  onMiss,
  onSkip,
  onBusy,
  compact = false,
  speed,
}: {
  lang: Lang;
  said: Spoken;
  start?: CoachStart;
  /** Pause on "Great!" and then call onRight (off: Day 1, where you tap Next yourself). */
  advance?: boolean;
  /** A tone exercise: the shape itself must be right, not just like the recording. */
  drill?: boolean;
  onRight: (v: Verdict, misses: number) => void;
  /** Each close or wrong try. */
  onMiss?: (v: Verdict, misses: number) => void;
  /** `saved`: skipped after three misses, so it belongs in Mistakes (not when the mic or model isn't available). */
  onSkip: (saved: boolean) => void;
  onBusy?: (busy: boolean) => void;
  compact?: boolean;
  speed?: PlaySpeed;
}) {
  const { voice } = useProgress();
  const [stage, setStage] = useState<Stage>(() => (isModelReady() ? 'idle' : 'no-model'));
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [mine, setMine] = useState<Contour | null | undefined>(undefined);
  const [nohear, setNohear] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const run = useRef(0);
  const recording = useRef<Recording | null>(null);
  const missCount = useRef(0);
  const shown = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // The mic and its meter have to be on screen while it's listening.
  useEffect(() => {
    if (stage === 'listening') panel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [stage]);
  // What it says about your try, and your pitch line, shouldn't be below the fold on a phone.
  useEffect(() => {
    if (verdict || nohear) shown.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [verdict, nohear, mine]);
  const voiceOn = useRef(voice);
  voiceOn.current = voice;
  const handlers = useRef({ onRight, onMiss });
  handlers.current = { onRight, onMiss };

  useEffect(() => {
    onBusy?.(stage !== 'idle' && stage !== 'done' && stage !== 'no-model');
  }, [stage]);
  useEffect(
    () => () => {
      run.current++;
      recording.current?.stop();
      stopAllVoices();
      onBusy?.(false);
    },
    [],
  );
  useEffect(() => {
    if (start !== 'tap') void attempt(start === 'play');
    else if (stage !== 'idle' && stage !== 'no-model') {
      // The parent took over (Again): stop listening and wait.
      run.current++;
      recording.current?.stop();
      setStage('idle');
    }
  }, [start, said.text]);
  if (testHook) (window as { __coach?: unknown }).__coach = { stage, verdict, misses };

  const say = async (...names: Feedback[]) => {
    if (!voiceOn.current) return sleep(700);
    for (const name of names) await sayFeedback(name);
  };

  /** One go: the voice if asked for, then the mic, the grade and what happens because of it. */
  async function attempt(withVoice: boolean) {
    const me = ++run.current;
    const alive = () => run.current === me;
    recording.current?.stop();
    setProblem(null);
    if (!isModelReady()) return setStage('no-model');
    loadModel().catch(() => {}); // from the browser's cache, so the first check doesn't wait for it
    cutFeedback();
    if (withVoice && said.audio) {
      setStage('playing');
      await playAndWait(said.audio, speed);
      if (!alive()) return;
      await sleep(AFTER_VOICE_MS);
      if (!alive()) return;
    }
    let audio: Float32Array;
    try {
      setNohear(false);
      const rec = await startRecording(() => alive() && setStage('heard'), { silence: silenceFor(said.text) });
      if (!alive()) return rec.stop();
      recording.current = rec;
      setAnalyser(rec.analyser);
      setStage('listening');
      audio = await rec.done;
    } catch (e) {
      if (alive()) fail(e);
      return;
    } finally {
      recording.current = null;
      setAnalyser(null);
    }
    if (!alive()) return;
    if (!audio.length) {
      // Silence isn't a wrong answer, but three of them shouldn't trap you here either.
      missCount.current++;
      setMisses(missCount.current);
      setNohear(true);
      setVerdict(null);
      setStage('telling');
      await say('nohear');
      if (alive()) setStage('idle');
      return;
    }
    setStage('checking');
    let v: Verdict;
    try {
      v = await grade(audio);
    } catch (e) {
      if (alive()) fail(e);
      return;
    }
    if (!alive()) return;
    setVerdict(v);
    setStage('telling');
    if (v.grade === 'great') {
      sfx('correct');
      haptic('success');
      if (!advance) handlers.current.onRight(v, missCount.current);
      await say('great');
      if (!alive()) return;
      if (advance) {
        await sleep(SHOW_RIGHT_MS);
        if (alive()) handlers.current.onRight(v, missCount.current);
      }
      setStage('done');
      return;
    }
    missCount.current++;
    setMisses(missCount.current);
    sfx('wrong');
    haptic('error');
    handlers.current.onMiss?.(v, missCount.current);
    const detail: Feedback | null = v.tone?.tone ? (`tone-${v.tone.tone}` as Feedback) : v.grade === 'close' ? 'off-sound' : null;
    await say(v.grade, ...(detail ? [detail] : []));
    if (!alive()) return;
    if (missCount.current >= MISSES_TO_SKIP || start === 'tap') return setStage('idle');
    void attempt(v.grade === 'retry'); // Close: straight back to the mic. Not quite: hear it again first.
  }

  async function grade(audio: Float32Array): Promise<Verdict> {
    const short = isShort(said.text, lang);
    const zh = lang === 'zh';
    const url = said.audio && !said.audio.startsWith('tts:') ? said.audio : undefined;
    const model = url && (short || zh) ? await nativeSamples(url, audioContext()).catch(() => null) : null;
    const pitch = zh ? toContour(pitchTrack(audio)) : undefined;
    if (zh) setMine(pitch ?? null);
    const dist = short && model ? distance(features(audio), features(model)) : Infinity;
    const tone = zh ? checkTones(said.text, said.pinyin, pitch, model ? toContour(pitchTrack(model)) : null, drill) : null;
    const heard = await transcribe(audio, lang);
    return gradeSpeech({ lang, text: said.text, alt: said.alt, heard, distance: dist, tone });
  }

  function fail(e: unknown) {
    setProblem(e instanceof Error ? e.message : String(e));
    setStage('idle');
  }

  const tapMic = () => {
    tapFeedback();
    unlockAudio();
    if (stage === 'listening' || stage === 'heard') return recording.current?.stop();
    void attempt(false);
  };
  const tapPlay = () => {
    tapFeedback();
    unlockAudio();
    void attempt(true);
  };
  const skip = () => {
    tapFeedback();
    run.current++;
    recording.current?.stop();
    stopAllVoices();
    onSkip(missCount.current >= MISSES_TO_SKIP);
  };

  if (stage === 'no-model') return <DownloadModel onReady={() => (start === 'tap' ? setStage('idle') : void attempt(start === 'play'))} onSkip={skip} />;

  const listening = stage === 'listening' || stage === 'heard';
  const checking = stage === 'checking';
  const zh = lang === 'zh' && spokenTones(said.text, said.pinyin).length > 0;
  const status = listening
    ? stage === 'heard'
      ? 'Listening… stops when you finish'
      : 'Speak now'
    : stage === 'playing'
      ? 'Listen…'
      : checking
        ? 'Checking…'
        : stage === 'idle' && !verdict && !nohear
          ? start === 'tap'
            ? 'Tap Play to hear it, then say it back'
            : 'Tap the mic and say it'
          : '';

  return (
    <div ref={panel} className={compact ? 'coach compact' : 'coach'} data-testid="speak-coach" data-stage={stage} data-misses={misses}>
      <div className="coach-controls">
        {said.audio && (
          <button className="btn secondary coach-play" onClick={tapPlay} disabled={stage === 'playing' || listening || checking} data-testid="coach-play">
            <Icon name="speaker" size={20} /> {verdict?.grade === 'retry' && start === 'tap' ? 'Listen again' : 'Play'}
          </button>
        )}
        <button
          className={checking ? 'mic checking' : listening ? 'mic on' : 'mic'}
          onClick={tapMic}
          disabled={checking || stage === 'playing'}
          aria-label={listening ? 'Stop recording' : 'Start recording'}
          data-testid="coach-mic"
        >
          {checking ? <span className="spinner" /> : <Icon name={listening ? 'stop' : 'mic'} size={compact ? 30 : 40} />}
        </button>
      </div>
      <Waveform analyser={analyser} />
      <p className="status" aria-live="polite" data-testid="coach-status">
        {status}
      </p>
      {nohear && (
        <p className="coach-result wrong" role="status" data-testid="coach-nohear">
          {NOHEAR}
        </p>
      )}
      {verdict && !nohear && (
        <div className={`coach-result ${verdict.grade === 'great' ? 'ok' : verdict.grade === 'close' ? 'close' : 'wrong'}`} role="status" data-testid="coach-result" data-grade={verdict.grade}>
          <div className="coach-grade">
            <Icon name={verdict.grade === 'great' ? 'check' : verdict.grade === 'close' ? 'review' : 'speaker'} size={20} /> {LABEL[verdict.grade]}
          </div>
          {verdict.detail && (
            <p className="coach-detail" data-testid="coach-detail">
              {verdict.detail}
            </p>
          )}
          {!compact && verdict.tokens.length > 0 && <Heatmap tokens={verdict.tokens} lang={lang} />}
          <p className="muted small coach-heard">Whisper heard: “{verdict.heard || '…'}”</p>
        </div>
      )}
      {zh && mine !== undefined && <PitchOverlay text={said.text} pinyin={said.pinyin} mine={mine} />}
      <div ref={shown} aria-hidden="true" />
      {problem && (
        <p className="coach-result wrong" role="alert" data-testid="coach-problem">
          {problem}
        </p>
      )}
      {(misses >= MISSES_TO_SKIP || problem) && stage !== 'done' && (
        <button className="btn secondary" onClick={skip} disabled={listening || checking} data-testid="coach-skip">
          Skip for now
        </button>
      )}
    </div>
  );
}

const W = 300;
const H = 110;
const TOP = 8;
const BOTTOM = H - 22;
/** One pitch level on the chart, in semitones of your voice. */
const LEVEL_ST = 2.5;

/** Your pitch line over the correct tone shapes, a chart for every syllable, after each try. */
export function PitchOverlay({ text, pinyin, mine }: { text: string; pinyin?: string; mine: Contour | null }) {
  const list = spokenTones(text, pinyin);
  const n = list.length;
  const y = (level: number) => BOTTOM - ((level - 1) / 4) * (BOTTOM - TOP);
  const correct: [number, number][] = list.flatMap((s, i) =>
    TONE_SHAPES[s.tone as Tone].map((level, k, all): [number, number] => [(i + 0.08 + (0.84 * k) / (all.length - 1)) / n, level]),
  );
  const curve = (i: number) => {
    const pts = correct.filter(([x]) => x >= i / n && x <= (i + 1) / n);
    return pts.map(([x, l], k) => `${k ? 'L' : 'M'}${(x * W).toFixed(1)},${y(l).toFixed(1)}`).join('');
  };
  // Only the shape counts, so your line is centered on the correct one's average height.
  const middle = correct.reduce((sum, [, l]) => sum + l, 0) / correct.length;
  const clampLevel = (l: number) => Math.max(0.6, Math.min(5.4, l));
  let d = '';
  let gap = Infinity;
  mine?.points.forEach((p) => {
    if (!p) return void gap++;
    d += `${gap > 3 || !d ? 'M' : 'L'}${(p.x * W).toFixed(1)},${y(clampLevel(middle + p.st / LEVEL_ST)).toFixed(1)}`;
    gap = 0;
  });
  return (
    <figure className="pitch-overlay" data-testid="pitch-overlay">
      <div className="tone-head">
        <span className="legend">
          <span className="swatch native" /> Correct tone
        </span>
        <span className="legend">
          <span className="swatch mine" /> You
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Your pitch line over the correct tone shape for ${list.map((s) => s.syllable).join(' ')}`}>
        {[1, 2, 3, 4, 5].map((l) => (
          <line key={l} x1={0} x2={W} y1={y(l)} y2={y(l)} className="tone-grid" />
        ))}
        {list.map((s, i) =>
          s.tone === 5 ? (
            <circle key={i} cx={((i + 0.5) / n) * W} cy={y(2.5)} r={6} className="tone-dot" />
          ) : (
            <path key={i} d={curve(i)} className="tone-curve on" data-testid="correct-shape" />
          ),
        )}
        {d && <path d={d} className="tone-line mine" data-testid="my-pitch" />}
        {list.map((s, i) => (
          <text key={i} x={((i + 0.5) / n) * W} y={H - 6} textAnchor="middle" className="syllable">
            {s.syllable}
          </text>
        ))}
      </svg>
      {!mine && <figcaption className="muted small">Couldn't find your pitch. Say it a little louder, in a normal voice.</figcaption>}
    </figure>
  );
}

/** Until the Whisper model is on the phone: one button that downloads it right here. */
export function DownloadModel({ onReady, onSkip }: { onReady: () => void; onSkip?: () => void }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const info = MODELS[chosenModel()];
  const download = async () => {
    setError(null);
    setProgress(0);
    try {
      await loadModel(setProgress);
      onReady();
    } catch (e) {
      setError(`Download failed: ${e instanceof Error ? e.message : String(e)}. Check your connection and try again.`);
      setProgress(null);
    }
  };
  return (
    <div className="card" data-testid="coach-download">
      <p style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>Speech model needed</p>
      <p style={{ margin: 0, lineHeight: 1.4 }}>
        To grade your pronunciation, download the free Whisper speech model once ({info.sizeMB} MB). After that it works offline, and your voice never leaves the phone.
      </p>
      {progress !== null ? (
        <>
          <ProgressBar value={progress} />
          <p className="muted">Downloading… {Math.round(progress * 100)}%. Keep this screen open.</p>
        </>
      ) : (
        <button className="btn" onClick={download}>
          <Icon name="download" /> Download speech model ({info.sizeMB} MB)
        </button>
      )}
      {error && <p style={{ margin: 0, color: 'var(--wrong)' }}>{error}</p>}
      {progress === null && (
        <>
          <button className="btn secondary" onClick={() => navigate('/settings')}>
            Choose a different model
          </button>
          {onSkip && (
            <button className="btn secondary" onClick={onSkip} data-testid="coach-skip">
              Skip for now
            </button>
          )}
        </>
      )}
    </div>
  );
}
