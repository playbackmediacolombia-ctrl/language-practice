import HanziWriter from 'hanzi-writer';
import { useEffect, useRef, useState } from 'react';
import { playPhrase } from '../lib/audio';
import { haptic, reducedMotion, sfx, tapFeedback } from '../lib/fx';
import { recordWriting, useProgress, type WritingProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { useDarkMode } from '../lib/theme';
import { type WritingChar, writingChar, writingChars } from '../lib/writing';
import { Icon, ProgressBar, Screen, Segmented } from '../ui';

// Character writing with Hanzi Writer: watch the stroke order, trace over the outline, then
// write from memory. Strokes are checked as you draw; the end shows how it went.

type Mode = 'watch' | 'trace' | 'memory';
const MODES: { value: Mode; label: string }[] = [
  { value: 'watch', label: 'Watch' },
  { value: 'trace', label: 'Trace' },
  { value: 'memory', label: 'From memory' },
];

/** Mastered once written from memory with at most one slip. */
const mastered = (w?: WritingProgress) => w?.memory !== undefined && w.memory !== null && w.memory <= 1;

function loadChar(ch: string, onLoad: (data: never) => void, onError: (e?: unknown) => void) {
  fetch(new URL(`hanzi/${ch}.json`, document.baseURI))
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`No stroke data for ${ch}`))))
    .then((data) => onLoad(data as never), onError);
}

/** Practice tab › Character writing: every character, in the order you meet them. */
export function WritingList() {
  const progress = useProgress();
  const chars = writingChars(progress);
  const seen = chars.filter((c) => c.seen);
  const later = chars.filter((c) => !c.seen);
  const done = chars.filter((c) => mastered(progress.writing[c.char])).length;
  const open = (c: WritingChar) => {
    tapFeedback();
    navigate(`/zh/write/${encodeURIComponent(c.char)}`);
  };
  const grid = (list: WritingChar[]) => (
    <div className="char-grid">
      {list.map((c) => {
        const w = progress.writing[c.char];
        const state = mastered(w) ? 'mastered' : w ? 'started' : '';
        return (
          <button key={c.char} className={`char-tile ${state}`} onClick={() => open(c)} aria-label={`${c.char}, ${c.pinyin}${state ? `, ${state}` : ''}`}>
            <span className="char-glyph" lang="zh-CN">
              {c.char}
            </span>
            <span className="char-pinyin">{c.pinyin}</span>
            {state === 'mastered' && <Icon name="check" size={14} className="char-badge" />}
          </button>
        );
      })}
    </div>
  );
  return (
    <Screen title="Character writing" back="/practice">
      <div className="card">
        <div className="row">
          <span className="grow muted small">Written from memory</span>
          <span className="muted small">
            {done}/{chars.length}
          </span>
        </div>
        <ProgressBar value={done / chars.length} tone="ok" />
        <p className="muted small" style={{ margin: 0 }}>
          Watch the stroke order, trace it with your finger, then write it from memory.
        </p>
      </div>
      {seen.length > 0 && (
        <>
          <div className="section-title">From your lessons</div>
          {grid(seen)}
        </>
      )}
      <div className="section-title">{seen.length ? 'Coming up' : 'All characters'}</div>
      {grid(later)}
    </Screen>
  );
}

type Result = { mistakes: number; strokes: number };

export function WritingScreen({ char }: { char: string }) {
  const progress = useProgress();
  const info = writingChar(progress, char);
  const known = !!info;
  const all = writingChars(progress);
  const box = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const dark = useDarkMode();
  const [mode, setMode] = useState<Mode>(() => (progress.writing[char] ? 'trace' : 'watch'));
  const [strokes, setStrokes] = useState(0);
  const strokeCount = useRef(0);
  const [done, setDone] = useState(0); // strokes drawn so far
  const [mistakes, setMistakes] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0); // bump to restart

  useEffect(() => {
    const el = box.current;
    if (!el || !known) return;
    el.innerHTML = '';
    const css = getComputedStyle(el);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const size = Math.min(300, el.clientWidth);
    const w = HanziWriter.create(el, char, {
      width: size,
      height: size,
      padding: 12,
      charDataLoader: loadChar,
      onLoadCharDataSuccess: (data) => {
        strokeCount.current = (data as { strokes: string[] }).strokes.length;
        setStrokes(strokeCount.current);
      },
      onLoadCharDataError: () => setError('Stroke data for this character is missing.'),
      showCharacter: false,
      showOutline: mode !== 'memory',
      strokeColor: color('--text'),
      outlineColor: color('--trace'),
      drawingColor: color('--accent'),
      highlightColor: color('--chart-2'),
      highlightCompleteColor: color('--ok'),
      radicalColor: null,
      drawingWidth: 22,
      strokeAnimationSpeed: reducedMotion() ? 3 : 1,
      delayBetweenStrokes: reducedMotion() ? 100 : 400,
      renderer: 'svg',
    });
    writer.current = w;
    setDone(0);
    setMistakes(0);
    setHint(null);
    setResult(null);

    if (mode === 'watch') {
      void w.animateCharacter();
    } else {
      void w.quiz({
        showHintAfterMisses: mode === 'trace' ? 1 : 3,
        markStrokeCorrectAfterMisses: mode === 'trace' ? 4 : false,
        leniency: mode === 'trace' ? 1.2 : 1,
        onCorrectStroke: (s) => {
          setDone(s.strokeNum + 1);
          setHint(null);
          sfx('tap');
          haptic('light');
        },
        onMistake: (s) => {
          setMistakes(s.totalMistakes);
          setHint(
            s.isBackwards
              ? 'Right stroke, wrong direction: draw it the other way.'
              : s.mistakesOnStroke >= (mode === 'trace' ? 1 : 3)
                ? 'Follow the highlighted stroke.'
                : 'Not that one. Which stroke comes next?',
          );
          haptic('error');
        },
        onComplete: ({ totalMistakes }) => {
          setResult({ mistakes: totalMistakes, strokes: strokeCount.current });
          setHint(null);
          recordWriting(char, mode, totalMistakes);
          sfx(totalMistakes === 0 ? 'complete' : 'correct');
          haptic('success');
        },
      });
    }
    return () => {
      w.cancelQuiz();
      el.innerHTML = '';
    };
    // `run` restarts; colors follow the theme.
  }, [char, mode, run, dark, known]);

  if (!info) {
    navigate('/zh/write', { replace: true });
    return null;
  }

  const index = all.findIndex((c) => c.char === char);
  const next = all[index + 1];
  const w = progress.writing[char];
  const choose = (m: Mode) => {
    setMode(m);
    setRun((r) => r + 1);
  };

  return (
    <Screen title="Write" back="/zh/write">
      <div className="card write-head">
        <div className="row">
          <div className="grow">
            <div className="write-pinyin">{info.pinyin}</div>
            <div className="muted">
              <span lang="zh-CN">{info.word.text}</span> · {info.word.pinyin} · {info.word.en}
            </div>
          </div>
          <button className="audio-btn" aria-label="Listen" onClick={() => playPhrase(info.word.audio)}>
            <Icon name="speaker" size={24} />
          </button>
        </div>
        <Segmented label="Mode" value={mode} onChange={choose} options={MODES} />
      </div>

      <div className="write-pad" data-testid="write-pad">
        <svg className="write-guide" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M0 50H100M50 0V100M0 0L100 100M100 0L0 100" />
        </svg>
        <div ref={box} className="write-box" aria-label={`Writing area for ${char}`} />
      </div>

      <p className="status" aria-live="polite" data-testid="write-status">
        {error ??
          (result
            ? ''
            : mode === 'watch'
              ? `${strokes || ''} stroke${strokes === 1 ? '' : 's'}: watch the order, then trace it.`
              : hint ?? `Stroke ${Math.min(done + 1, strokes || 1)} of ${strokes || '…'}${mode === 'memory' ? ' · from memory' : ' · trace over the grey'}`)}
      </p>

      {result && (
        <div className={`card grade ${result.mistakes === 0 ? 'ok' : result.mistakes <= 2 ? 'close' : 'wrong'}`} data-testid="write-result">
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {result.mistakes === 0 ? 'Perfect!' : result.mistakes <= 2 ? 'Nicely done' : 'Done. Practice makes perfect'}
          </div>
          <p style={{ margin: 0 }}>
            {result.strokes} strokes in the right order
            {result.mistakes ? `, ${result.mistakes} mistake${result.mistakes === 1 ? '' : 's'} on the way` : ', no mistakes'}.
          </p>
          {mode === 'trace' && <p className="muted small">Next, try it from memory.</p>}
          {mode === 'memory' && mastered(w) && <p className="muted small">You can write {char} from memory.</p>}
        </div>
      )}

      <div className="row">
        {mode === 'watch' ? (
          <button className="btn secondary flex" onClick={() => setRun((r) => r + 1)}>
            <Icon name="play" size={18} /> Replay
          </button>
        ) : (
          <button className="btn secondary flex" onClick={() => setRun((r) => r + 1)}>
            <Icon name="review" size={18} /> {result ? 'Again' : 'Start over'}
          </button>
        )}
        {mode === 'watch' ? (
          <button className="btn flex" onClick={() => choose('trace')}>
            Trace it
          </button>
        ) : result && mode === 'trace' ? (
          <button className="btn flex" onClick={() => choose('memory')}>
            From memory
          </button>
        ) : (
          <button className="btn flex" disabled={!next} onClick={() => next && navigate(`/zh/write/${encodeURIComponent(next.char)}`)}>
            Next ›
          </button>
        )}
      </div>
    </Screen>
  );
}
