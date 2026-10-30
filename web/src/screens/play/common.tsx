import { type ReactNode, useEffect, useRef, useState } from 'react';
import { pinyin as toPinyin } from 'pinyin-pro';
import { Bird, type BirdPose } from '../../Bird';
import { pauseFor, playAndWait, type Recording, startRecording, stopPhrase } from '../../lib/audio';
import type { Lang } from '../../lib/content';
import { tapFeedback } from '../../lib/fx';
import { navigate } from '../../lib/router';
import { isModelReady, loadModel, transcribe } from '../../lib/whisper';
import { Confetti, Icon, Waveform } from '../../ui';

// Pieces every Play activity shares: answering out loud (or typing), the bird with a speech
// bubble, a line you can hear again, and the card at the end.

const testHook = location.search.includes('test');

/** Pinyin for a Mandarin line (shown under it); nothing for the other languages. */
export const pinyinOf = (lang: Lang, text: string) => (lang === 'zh' ? toPinyin(text, { toneType: 'symbol' }) : '');

/** A line in the language, with its pinyin, and its English when `en` is shown. */
export function LineText({ lang, text, en, showEn }: { lang: Lang; text: string; en?: string; showEn?: boolean }) {
  return (
    <>
      <span className="line-text" lang={lang}>
        {text}
      </span>
      {lang === 'zh' && <span className="line-pinyin">{pinyinOf(lang, text)}</span>}
      {showEn && en && <span className="line-en">{en}</span>}
    </>
  );
}

/** A small button that plays a line (its recording, or the phone's voice). */
export function HearButton({ url, label = 'Hear it' }: { url: string; label?: string }) {
  return (
    <button
      className="audio-btn hear-btn"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        tapFeedback();
        stopPhrase();
        void playAndWait(url);
      }}
    >
      <Icon name="speaker" size={24} />
    </button>
  );
}

export type VoiceState = 'idle' | 'listening' | 'heard' | 'checking';

/**
 * Say an answer out loud: records until you pause, Whisper writes it down on the phone, and
 * `onText` gets it. Without the speech model (or if you'd rather), you can type it instead.
 */
export function AnswerBar({
  lang,
  onText,
  disabled,
  expected = '',
  placeholder,
  sayLabel = 'Say it',
}: {
  lang: Lang;
  onText: (text: string, how: 'voice' | 'typed') => void;
  disabled?: boolean;
  expected?: string;
  placeholder?: string;
  sayLabel?: string;
}) {
  const ready = isModelReady();
  const [state, setState] = useState<VoiceState>('idle');
  const [typing, setTyping] = useState(!ready);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const rec = useRef<Recording | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    if (ready) loadModel().catch(() => {});
    return () => {
      alive.current = false;
      rec.current?.stop();
    };
  }, [ready]);

  const listen = async () => {
    if (state === 'listening' || state === 'heard') return rec.current?.stop();
    tapFeedback();
    stopPhrase();
    setError(null);
    let audio: Float32Array;
    try {
      const r = await startRecording(() => alive.current && setState('heard'), { silence: pauseFor(expected || '…') });
      rec.current = r;
      setAnalyser(r.analyser);
      setState('listening');
      audio = await r.done;
    } catch (e) {
      setState('idle');
      setError(e instanceof Error ? e.message : String(e));
      return;
    } finally {
      rec.current = null;
      setAnalyser(null);
    }
    if (!alive.current) return;
    if (!audio.length) {
      setState('idle');
      setError("I didn't hear anything. Tap the mic and try again.");
      return;
    }
    setState('checking');
    try {
      const heard = (await transcribe(audio, lang)).trim();
      if (testHook) Object.assign(window, { __playHeard: heard });
      if (!alive.current) return;
      setState('idle');
      if (!heard) setError("I couldn't make that out. Try once more?");
      else onText(heard, 'voice');
    } catch (e) {
      setState('idle');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const busy = state !== 'idle';
  return (
    <div className="answer-bar" data-testid="answer-bar">
      {error && (
        <p className="muted small" role="status" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      {typing ? (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!typed.trim() || disabled) return;
            onText(typed.trim(), 'typed');
            setTyped('');
          }}
        >
          <input
            className="answer-input grow"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={placeholder ?? 'Type your answer…'}
            lang={lang}
            aria-label="Your answer"
            data-testid="answer-input"
            disabled={disabled}
          />
          <button className="btn" type="submit" disabled={!typed.trim() || disabled} aria-label="Send" data-testid="answer-send">
            <Icon name="send" size={20} />
          </button>
        </form>
      ) : (
        <div className="answer-voice">
          {busy && state !== 'checking' && <Waveform analyser={analyser} />}
          <button
            className={state === 'checking' ? 'mic checking' : busy ? 'mic on' : 'mic'}
            onClick={listen}
            disabled={disabled || state === 'checking'}
            aria-label={busy ? 'Stop recording' : sayLabel}
            data-testid="answer-mic"
          >
            {state === 'checking' ? <span className="spinner" /> : <Icon name={busy ? 'stop' : 'mic'} size={36} />}
          </button>
          <span className="status answer-status" aria-live="polite">
            {state === 'checking' ? 'Writing it down…' : busy ? 'Listening… tap when done' : sayLabel}
          </span>
        </div>
      )}
      {ready ? (
        <button className="link-btn small" onClick={() => setTyping(!typing)} data-testid="answer-switch">
          {typing ? 'Speak instead' : 'Type instead'}
        </button>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>
          To answer out loud, download the free speech model in{' '}
          <button className="link-btn" onClick={() => navigate('/settings')}>
            Settings
          </button>
          .
        </p>
      )}
    </div>
  );
}

/** The bird saying something: a speech bubble with the line, its English a tap away, and a replay. */
export function BirdSays({ pose, lang, text, en, url, talking, children }: { pose: BirdPose; lang: Lang; text?: string; en?: string; url?: string; talking?: boolean; children?: ReactNode }) {
  const [showEn, setShowEn] = useState(false);
  useEffect(() => setShowEn(false), [text]);
  return (
    <div className="bird-says" data-testid="bird-says">
      <Bird pose={pose} size={96} className={`bird-speaker${talking ? ' talking' : ''}`} />
      {(text || children) && (
        <div className="bird-bubble" role="status">
          {children}
          {text && (
            <p className="bubble-line">
              <LineText lang={lang} text={text} en={en} showEn={showEn} />
            </p>
          )}
          <div className="row bubble-tools">
            {url && <HearButton url={url} label="Hear it again" />}
            {en && (
              <button className="link-btn small" onClick={() => setShowEn(!showEn)} data-testid="bird-translate">
                {showEn ? 'Hide English' : 'English'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** The end of an activity: the bird dances, the XP, and what to do next. */
export function DoneCard({ title, detail, xp, children }: { title: string; detail?: ReactNode; xp: number; children?: ReactNode }) {
  return (
    <div className="card start-card done-card" data-testid="play-done">
      <Confetti pieces={40} />
      <Bird pose="dance" size={110} />
      <div className="start-title">{title}</div>
      {detail && <div className="muted">{detail}</div>}
      {xp > 0 && <div className="xp-pill">+{xp} XP</div>}
      {children}
    </div>
  );
}

/** Plays a line and resolves when it's done, telling `onSpeaking` which clip is playing (for lip sync). */
export async function say(url: string, onSpeaking?: (url: string | null) => void) {
  if (testHook) Object.assign(window, { __played: url });
  onSpeaking?.(url);
  await playAndWait(url);
  onSpeaking?.(null);
}
