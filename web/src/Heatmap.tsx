import { convert } from 'pinyin-pro';
import { useEffect, useRef, useState } from 'react';
import { compare, type TokenResult } from '../../shared/compare';
import { playPhrase, type Recording, startRecording, stopPhrase } from './lib/audio';
import type { Lang } from './lib/content';
import { courseItemFor } from './lib/course';
import { tapFeedback } from './lib/fx';
import { isModelReady, transcribe } from './lib/whisper';
import { Icon, Waveform } from './ui';

// Pronunciation heatmap: what you said, word by word (character by character in Chinese), in
// green, yellow or red from Whisper's scoring, with wrong tones flagged. Tap a yellow or red word
// to hear it and try just that word again.

// Tests check the scoring (wrong tones) directly.
if (location.search.includes('test')) Object.assign(window, { __compare: compare });

const marks = (numbered: string) => convert(numbered, { format: 'numToSymbol' });
const toneOf = (numbered: string) => numbered.match(/\d/)?.[0] ?? '5';
const TONE_NAME: Record<string, string> = { '1': '1st tone', '2': '2nd tone', '3': '3rd tone', '4': '4th tone', '5': 'light tone' };

/** Where a single word's native audio comes from: its course recording, or the phone's voice. */
function wordAudio(lang: Lang, word: string): string {
  return courseItemFor(lang, word)?.audio ?? `tts:${lang}:${encodeURIComponent(word)}`;
}

export function Heatmap({ tokens, lang, small }: { tokens: TokenResult[]; lang: Lang; small?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const tones = tokens.filter((t) => t.tone).length;
  return (
    <div className={small ? 'heatmap small' : 'heatmap'} data-testid="heatmap">
      <div className="heatmap-words" lang={lang}>
        {tokens.map((t, i) => (
          <button
            key={i}
            className={`heat ${t.status}${t.tone ? ' tone' : ''}${open === i ? ' picked' : ''}`}
            onClick={() => {
              if (t.status === 'ok') return;
              tapFeedback();
              setOpen(open === i ? null : i);
            }}
            aria-label={`${t.text}: ${t.status === 'ok' ? 'said well' : t.status === 'close' ? (t.tone ? `right sound, ${TONE_NAME[toneOf(t.tone.expected)]} needed` : 'nearly') : 'missed'}${t.status !== 'ok' ? ', tap to practice it' : ''}`}
            data-status={t.status}
          >
            {t.text}
            {t.tone && <span className="heat-tone">{marks(t.tone.expected)}</span>}
          </button>
        ))}
      </div>
      {!small && (
        <div className="heatmap-legend muted small">
          <span className="dot ok" /> good <span className="dot close" /> nearly <span className="dot wrong" /> missed
          {tones > 0 && <span> · {tones === 1 ? '1 wrong tone' : `${tones} wrong tones`}</span>}
          {tokens.some((t) => t.status !== 'ok') && <span> · tap a word to practice it</span>}
        </div>
      )}
      {open !== null && <WordPractice key={open} token={tokens[open]} lang={lang} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** One word: hear it, then say just that word. */
function WordPractice({ token, lang, onClose }: { token: TokenResult; lang: Lang; onClose: () => void }) {
  const [state, setState] = useState<'idle' | 'listening' | 'heard' | 'checking'>('idle');
  const [result, setResult] = useState<{ score: number; heard: string; tone?: TokenResult['tone'] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const rec = useRef<Recording | null>(null);
  const word = token.text.replace(/^[¿¡"“«(]+|[.,!?;:"”»)…。，！？、]+$/g, '') || token.text;
  const audio = wordAudio(lang, word);
  useEffect(() => {
    playPhrase(audio);
    return () => {
      rec.current?.stop();
      stopPhrase();
    };
  }, [audio]);

  const tryIt = async () => {
    if (state === 'listening' || state === 'heard') return rec.current?.stop();
    tapFeedback();
    setError(null);
    setResult(null);
    try {
      const r = await startRecording(() => setState('heard'), { silence: 0.8 });
      rec.current = r;
      setAnalyser(r.analyser);
      setState('listening');
      const samples = await r.done;
      rec.current = null;
      setAnalyser(null);
      if (!samples.length) throw new Error("I didn't hear anything. Tap the mic and say the word.");
      setState('checking');
      const heard = await transcribe(samples, lang);
      const c = compare(word, heard, lang);
      setResult({ score: c.score, heard, tone: c.tokens[0]?.tone });
      setState('idle');
    } catch (e) {
      rec.current = null;
      setAnalyser(null);
      setState('idle');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const busy = state === 'listening' || state === 'heard';
  const expected = token.tone?.expected;
  return (
    <div className="word-practice" data-testid="word-practice">
      <div className="row word-practice-head">
        <div className="grow">
          <div className="word-practice-word" lang={lang}>
            {word}
          </div>
          {lang === 'zh' && expected && (
            <div className="muted small">
              Say it with the <b>{TONE_NAME[toneOf(expected)]}</b> ({marks(expected)}); it sounded like {marks(token.tone!.heard)}.
            </div>
          )}
        </div>
        <button className="audio-btn" onClick={() => playPhrase(audio)} aria-label={`Hear ${word}`} data-testid="word-hear">
          <Icon name="speaker" size={24} />
        </button>
        {isModelReady() && (
          <button className={state === 'checking' ? 'mic small checking' : busy ? 'mic small on' : 'mic small'} onClick={tryIt} disabled={state === 'checking'} aria-label={busy ? 'Stop' : `Say ${word}`} data-testid="word-try">
            {state === 'checking' ? <span className="spinner" /> : <Icon name={busy ? 'stop' : 'mic'} size={36} />}
          </button>
        )}
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" size={20} />
        </button>
      </div>
      {busy && <Waveform analyser={analyser} />}
      {result && (
        <p className={`word-practice-result ${result.score >= 0.85 ? 'ok' : result.score >= 0.5 ? 'close' : 'wrong'}`} data-testid="word-result" role="status">
          {result.score >= 0.85 ? 'Spot on!' : result.score >= 0.5 ? (result.tone ? `Nearly: the tone sounded like ${marks(result.tone.heard)}.` : 'Nearly there.') : 'Not quite. Listen once more and try again.'}{' '}
          <span className="muted small">Heard: “{result.heard || '…'}”</span>
        </p>
      )}
      {error && <p style={{ color: 'var(--wrong)', margin: 0 }}>{error}</p>}
      <p className="muted small" style={{ margin: 0 }}>
        Single words are harder for the speech checker than whole sentences, so a near miss is fine.
      </p>
    </div>
  );
}
