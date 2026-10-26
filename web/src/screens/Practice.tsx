import { useRef, useState } from 'react';
import { compare, type Comparison } from '../../../shared/compare';
import { playPhrase, type Recording, startRecording } from '../lib/audio';
import { getPhrases, type Lang } from '../lib/content';
import { recordSpeech } from '../lib/progress';
import { navigate } from '../lib/router';
import { isModelReady, transcribe } from '../lib/whisper';
import { PhraseText, Screen } from '../ui';

type State =
  | { kind: 'idle' }
  | { kind: 'recording' }
  | { kind: 'thinking' }
  | { kind: 'result'; heard: string; result: Comparison }
  | { kind: 'error'; message: string };

function peak(audio: Float32Array) {
  let max = 0;
  for (const v of audio) max = Math.max(max, Math.abs(v));
  return max;
}

export default function Practice({ lang, topic }: { lang: Lang; topic: string }) {
  const phrases = getPhrases(lang, topic);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const recording = useRef<Recording | null>(null);
  const phrase = phrases[index];
  const back = `/${lang}/${topic}`;

  if (!isModelReady()) {
    return (
      <Screen title="Listen & repeat" back={back}>
        <div className="card">
          <p style={{ margin: 0 }}>To check your pronunciation, download the Whisper speech model once.</p>
          <button className="btn" onClick={() => navigate('/settings')}>
            Set up speech checking
          </button>
        </div>
      </Screen>
    );
  }

  const go = (delta: number) => {
    setIndex((i) => (i + delta + phrases.length) % phrases.length);
    setState({ kind: 'idle' });
  };

  const toggleRecording = async () => {
    try {
      if (state.kind === 'recording' && recording.current) {
        setState({ kind: 'thinking' });
        const audio = await recording.current.stop();
        recording.current = null;
        if (audio.length < 16000 * 0.3) throw new Error('That was too short. Tap the mic, say the phrase, then tap again.');
        // Whisper invents text when given silence, so check there was actually some sound.
        if (peak(audio) < 0.02) throw new Error("I didn't hear anything. Check the mic isn't covered and speak a little louder.");
        const heard = await transcribe(audio, lang);
        const result = compare(phrase.text, heard, lang, phrase.alt);
        recordSpeech(lang, phrase.id, result.score);
        setState({ kind: 'result', heard, result });
      } else {
        recording.current = await startRecording();
        setState({ kind: 'recording' });
      }
    } catch (e) {
      recording.current = null;
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const isRecording = state.kind === 'recording';
  const thinking = state.kind === 'thinking';

  return (
    <Screen title={`Listen & repeat  ${index + 1}/${phrases.length}`} back={back}>
      <div className="card" style={{ gap: 16 }}>
        <PhraseText phrase={phrase} />
        <div className="row">
          <button className="btn secondary flex" onClick={() => playPhrase(phrase.audio)}>
            🔊 Listen
          </button>
          <button className="btn secondary flex" onClick={() => playPhrase(phrase.audio, true)}>
            🐢 Slow
          </button>
        </div>
      </div>

      <button
        className={isRecording ? 'mic on' : 'mic'}
        onClick={toggleRecording}
        disabled={thinking}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {thinking ? <span className="spinner" /> : isRecording ? '■' : '🎙️'}
      </button>
      <p className="muted" style={{ textAlign: 'center' }}>
        {isRecording ? 'Speak now… tap to stop' : thinking ? 'Checking what you said…' : 'Tap the mic and say the phrase'}
      </p>

      {state.kind === 'result' && (
        <div className="card" style={{ gap: 12 }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{Math.round(state.result.score * 100)}%</div>
          <div className="tokens">
            {state.result.tokens.map((t, i) => (
              <span key={i} className={`token ${t.status}`}>
                {t.text}
              </span>
            ))}
          </div>
          <p className="muted">Whisper heard: “{state.heard || '(nothing)'}”</p>
          <p className="muted small">
            <span style={{ color: 'var(--ok)' }}>green</span> = right · <span style={{ color: 'var(--close)' }}>orange</span> =
            almost · <span style={{ color: 'var(--wrong)' }}>red</span> = missed or wrong
          </p>
        </div>
      )}
      {state.kind === 'error' && <p style={{ color: 'var(--wrong)', textAlign: 'center', margin: 0 }}>{state.message}</p>}

      <div className="row">
        <button className="btn secondary flex" onClick={() => go(-1)} disabled={isRecording || thinking}>
          ‹ Previous
        </button>
        <button className="btn flex" onClick={() => go(1)} disabled={isRecording || thinking}>
          Next ›
        </button>
      </div>
    </Screen>
  );
}
