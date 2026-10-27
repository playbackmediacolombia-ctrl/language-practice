import { useEffect, useRef, useState } from 'react';
import { compare, type Comparison } from '../../../shared/compare';
import { type Feedback, playFeedback, playPhrase, type Recording, startRecording } from '../lib/audio';
import { getPhrases, type Lang } from '../lib/content';
import { recordSpeech, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { chosenModel, isModelReady, loadModel, MODELS, transcribe } from '../lib/whisper';
import { haptic, sfx, tapFeedback } from '../lib/fx';
import { type Contour, pitchTrack, toContour } from '../lib/pitch';
import { ToneChart } from '../ToneChart';
import { Icon, PhraseText, ProgressBar, Screen, Waveform } from '../ui';
import { Heatmap } from '../Heatmap';

type State =
  | { kind: 'idle' }
  | { kind: 'listening'; heard: boolean } // `heard` once speech has started
  | { kind: 'checking'; download: number | null } // `download` if the model has to be fetched again
  | { kind: 'result'; heard: string; result: Comparison; grade: Grade }
  | { kind: 'error'; message: string };

type Grade = Exclude<Feedback, 'try-again'>;

const GRADES: Record<Grade, { label: string; className: string }> = {
  great: { label: 'Great job!', className: 'ok' },
  close: { label: 'Close, try again.', className: 'close' },
  retry: { label: 'Not quite. Listen, and try again.', className: 'wrong' },
};

function gradeFor(score: number): Grade {
  return score >= 0.85 ? 'great' : score >= 0.5 ? 'close' : 'retry';
}

export default function Practice({ lang, topic }: { lang: Lang; topic: string }) {
  const phrases = getPhrases(lang, topic);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [ready, setReady] = useState(isModelReady());
  const { voice } = useProgress();
  const recording = useRef<Recording | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [mine, setMine] = useState<Contour | null | undefined>(undefined); // your pitch, Mandarin only
  const phrase = phrases[index];
  const back = `/${lang}/${topic}`;

  // Load the model from the browser cache now, so the first check doesn't wait for it.
  useEffect(() => {
    if (ready) loadModel().catch(() => {});
  }, [ready]);
  // Turn the mic off when leaving the screen mid-recording.
  useEffect(() => () => recording.current?.stop(), []);

  if (!ready) {
    return (
      <Screen title="Listen & repeat" back={back}>
        <DownloadModel onReady={() => setReady(true)} />
      </Screen>
    );
  }

  const go = (delta: number) => {
    setIndex((i) => (i + delta + phrases.length) % phrases.length);
    setState({ kind: 'idle' });
    setMine(undefined);
  };

  const check = async (rec: Recording) => {
    const audio = await rec.done;
    recording.current = null;
    setAnalyser(null);
    if (!audio.length) throw new Error("I didn't hear anything. Check the mic isn't covered, tap the mic and speak a little louder.");
    // Read the pitch first: transcribe() hands the samples over to the Whisper worker.
    if (lang === 'zh') setMine(toContour(pitchTrack(audio)));
    setState({ kind: 'checking', download: null });
    const heard = await transcribe(audio, lang, (download) => setState({ kind: 'checking', download }));
    const result = compare(phrase.text, heard, lang, phrase.alt);
    const grade = gradeFor(result.score);
    recordSpeech(lang, phrase.id, result.score);
    setState({ kind: 'result', heard, result, grade });
    sfx(grade === 'retry' ? 'wrong' : 'correct');
    haptic(grade === 'retry' ? 'error' : 'success');
    if (voice) void playFeedback(grade);
  };

  const onMic = async () => {
    if (state.kind === 'listening') {
      recording.current?.stop(); // finish early; `check` carries on from here
      return;
    }
    try {
      tapFeedback();
      const rec = await startRecording(() => setState({ kind: 'listening', heard: true }));
      recording.current = rec;
      setAnalyser(rec.analyser);
      setState({ kind: 'listening', heard: false });
      await check(rec);
    } catch (e) {
      recording.current = null;
      setAnalyser(null);
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const listening = state.kind === 'listening';
  const checking = state.kind === 'checking';
  const busy = listening || checking;

  return (
    <Screen title={`Listen & repeat  ${index + 1}/${phrases.length}`} back={back}>
      <div className="card" style={{ gap: 16 }}>
        <PhraseText phrase={phrase} />
        <div className="row">
          <button className="btn secondary flex" onClick={() => playPhrase(phrase.audio)} disabled={busy}>
            <Icon name="speaker" /> Listen
          </button>
          <button className="btn secondary flex" onClick={() => playPhrase(phrase.audio, true)} disabled={busy}>
            <Icon name="speaker" size={18} /> Slow
          </button>
        </div>
      </div>

      <button
        className={listening ? 'mic on' : checking ? 'mic checking' : 'mic'}
        onClick={onMic}
        disabled={checking}
        aria-label={listening ? 'Stop recording' : 'Start recording'}
      >
        {checking ? <span className="spinner" /> : <Icon name={listening ? 'stop' : 'mic'} size={44} />}
      </button>
      <Waveform analyser={analyser} />
      <p className="status" aria-live="polite">
        {state.kind === 'listening'
          ? state.heard
            ? 'Listening… stops when you finish'
            : 'Speak now'
          : state.kind === 'checking'
            ? state.download === null
              ? 'Checking your pronunciation…'
              : `Re-downloading the speech model… ${Math.round(state.download * 100)}%`
            : 'Tap the mic and say the phrase'}
      </p>
      {state.kind === 'checking' && state.download !== null && <ProgressBar value={state.download} />}

      {state.kind === 'result' && (
        <div className={`card grade ${GRADES[state.grade].className}`} style={{ gap: 12 }}>
          <div className="row">
            <div className="grow" style={{ fontSize: 24, fontWeight: 700 }}>
              {GRADES[state.grade].label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(state.result.score * 100)}%</div>
          </div>
          <Heatmap tokens={state.result.tokens} lang={lang} />
          <p className="muted">Whisper heard: “{state.heard || '(nothing)'}”</p>
        </div>
      )}
      {state.kind === 'error' && <p style={{ color: 'var(--wrong)', textAlign: 'center', margin: 0 }}>{state.message}</p>}

      {lang === 'zh' && (
        <div className="card">
          <div style={{ fontWeight: 700 }}>Tones</div>
          <ToneChart native={phrase.audio} mine={mine} text={phrase.text} pinyin={phrase.pinyin} />
        </div>
      )}

      <div className="row">
        <button className="btn secondary flex" onClick={() => go(-1)} disabled={busy}>
          ‹ Previous
        </button>
        <button className="btn flex" onClick={() => go(1)} disabled={busy}>
          Next ›
        </button>
      </div>
    </Screen>
  );
}

/** Shown until the Whisper model is on the phone: one button that downloads it right here. */
function DownloadModel({ onReady }: { onReady: () => void }) {
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
    <div className="card">
      <p style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>Speech model needed</p>
      <p style={{ margin: 0, lineHeight: 1.4 }}>
        To grade your pronunciation, download the free Whisper speech model once ({info.sizeMB} MB). After that it works
        offline, and your voice never leaves the phone.
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
        <button className="btn secondary" onClick={() => navigate('/settings')}>
          Choose a different model
        </button>
      )}
    </div>
  );
}
