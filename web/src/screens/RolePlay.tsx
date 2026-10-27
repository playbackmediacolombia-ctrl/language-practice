import { useEffect, useRef, useState } from 'react';
import { CharacterStage } from '../characters/Stage';
import { compare, type TokenResult } from '../../../shared/compare';
import { pauseFor, playAndWait, playPhrase, type Recording, startRecording, stopPhrase, unlockAudio } from '../lib/audio';
import type { Lang } from '../lib/content';
import { haptic, sfx, tapFeedback } from '../lib/fx';
import { recordRoleplay, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { getScenario, getScenarios, LEVELS, promptMode, type Scenario, type ScenarioLine, TOPICS } from '../lib/scenarios';
import { isModelReady, loadModel, transcribe } from '../lib/whisper';
import { Icon, Screen, Waveform } from '../ui';
import { AdultGate, AdultGateScreen } from './AdultGate';
import { LangSwitcher } from './Path';
import { Heatmap } from '../Heatmap';

const ROLEPLAY_XP = 10;
/** At or above this a turn counts as said and the conversation moves on. */
const PASS = 0.5;

const testHook = location.search.includes('test');
/** A hint: the first two words of a line (two characters in Chinese), then "…". */
function startOf(text: string, lang: Lang): string {
  if (lang === 'zh') return [...text.replace(/[^\p{Script=Han}]/gu, '')].slice(0, 2).join('') + '…';
  const words = text.split(/\s+/);
  return words.length <= 2 ? `${words[0]}…` : `${words.slice(0, 2).join(' ')}…`;
}

const gradeClass = (score: number) => (score >= 0.85 ? 'ok' : score >= PASS ? 'close' : 'wrong');

/** Practice › Real-life role-plays: three per level, Beginner to Fluent. */
export function RolePlayList({ lang }: { lang: Lang }) {
  const progress = useProgress();
  // Flirting role-plays wait behind the one-tap 18+ check.
  const hidden = progress.adult ? 0 : getScenarios(lang).filter((s) => s.topic === 'flirting').length;
  const all = getScenarios(lang).filter((s) => progress.adult || s.topic !== 'flirting');
  return (
    <Screen title="Role-plays" back="/practice">
      <LangSwitcher lang={lang} to={(l) => `/${l}/roleplay`} />
      <p className="muted small" style={{ margin: '0 4px' }}>
        Play your part in a real conversation. The other person talks; on your turn, say your line and Whisper grades it.
      </p>
      {LEVELS.map((name, i) => {
        const level = i + 1;
        const list = all.filter((s) => s.level === level);
        if (!list.length) return null;
        return (
          <section key={name}>
            <div className="section-title">{name}</div>
            <p className="muted small" style={{ margin: '-4px 4px 6px' }}>
              {promptMode(level) === 'words'
                ? 'Your lines are shown: read them out loud.'
                : promptMode(level) === 'hint'
                  ? 'You see the English; tap to show the words if you need them.'
                  : 'You see what to say in English. Put it in your own words.'}
            </p>
            <div className="list">
              {list.map((s) => {
                const best = progress.roleplays[`${lang}:${s.id}`];
                return (
                  <button
                    key={s.id}
                    className="list-row link"
                    data-testid={`roleplay-${s.id}`}
                    onClick={() => {
                      tapFeedback();
                      navigate(`/${lang}/roleplay/${s.id}`);
                    }}
                  >
                    <span className="row-icon" aria-hidden="true">
                      {TOPICS[s.topic].emoji}
                    </span>
                    <span className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="row-title">{s.en}</span>
                      <span className="row-hint">
                        <span lang={lang}>{s.title}</span> · {TOPICS[s.topic].label}
                      </span>
                    </span>
                    {best !== undefined && <span className={`story-score ${best >= 0.85 ? 'full' : ''}`}>{Math.round(best * 100)}%</span>}
                    <Icon name="chevron" />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      {hidden > 0 && <AdultGate count={`${hidden} role-plays`} />}
    </Screen>
  );
}

type Turn = { score: number | null; heard?: string; tokens?: TokenResult[] };
/** Where your turn is: waiting for you, mic on, speech heard, Whisper checking, graded. */
type TurnPhase = 'ready' | 'listening' | 'heard' | 'checking' | 'graded';

export function RolePlayScreen({ lang, id }: { lang: Lang; id: string }) {
  const scenario = getScenario(lang, id);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0); // the line the conversation is on
  const [turns, setTurns] = useState<Record<number, Turn>>({});
  const [phase, setPhase] = useState<TurnPhase>('ready');
  const [reveal, setReveal] = useState(false);
  // Stuck? A hint (how the line starts) after one miss or on request, the whole line after two.
  const [misses, setMisses] = useState(0);
  const [hinted, setHinted] = useState(false);
  const [english, setEnglish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [result, setResult] = useState<number | null | undefined>(undefined); // average once finished
  const recording = useRef<Recording | null>(null);
  const alive = useRef(true);
  const graded = isModelReady();
  const { characters } = useProgress();

  useEffect(() => {
    alive.current = true;
    if (graded) loadModel().catch(() => {});
    return () => {
      alive.current = false;
      recording.current?.stop();
      stopPhrase();
    };
  }, [graded]);

  const lines = scenario?.lines ?? [];
  const line: ScenarioLine | undefined = lines[step];
  const finished = started && step >= lines.length;

  // Their lines play by themselves, then the conversation moves on.
  useEffect(() => {
    if (!started || !line || line.who !== 'them') return;
    let current = true;
    void playAndWait(line.audio).then(() => current && alive.current && setStep((s) => s + 1));
    return () => {
      current = false;
    };
  }, [started, step]);

  // Your turn: get ready for it, and tell the tests what you're meant to say.
  useEffect(() => {
    if (!line || line.who !== 'you') return;
    setPhase('ready');
    setReveal(promptMode(scenario!.level) === 'words');
    setMisses(0);
    setHinted(false);
    setError(null);
    if (testHook) Object.assign(window, { __roleplayAudio: new URL(line.audio, location.href).href, __roleplayLines: lines.map((l) => new URL(l.audio, location.href).href) });
  }, [step]);

  // The end: average the graded turns, save the best, and earn XP.
  useEffect(() => {
    if (!finished || result !== undefined) return;
    const scores = Object.values(turns)
      .map((t) => t.score)
      .filter((x): x is number => x !== null);
    const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    recordRoleplay(lang, id, average, ROLEPLAY_XP);
    setResult(average);
    sfx('complete');
  }, [finished]);

  // Keep the newest line in view.
  useEffect(() => {
    document.querySelector(`[data-line="${Math.min(step, lines.length - 1)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [step, lines.length]);

  if (!scenario) {
    navigate(`/${lang}/roleplay`, { replace: true });
    return null;
  }

  const next = () => setStep((s) => s + 1);

  /** Your turn: record, have Whisper grade it, and move on if it was close enough. */
  const speak = async () => {
    if (!line) return;
    if (phase === 'listening' || phase === 'heard') return recording.current?.stop();
    tapFeedback();
    stopPhrase();
    setError(null);
    let audio: Float32Array;
    try {
      const rec = await startRecording(() => alive.current && setPhase('heard'), { silence: pauseFor(line.text) });
      recording.current = rec;
      setAnalyser(rec.analyser);
      setPhase('listening');
      audio = await rec.done;
    } catch (e) {
      setPhase('ready');
      setError(e instanceof Error ? e.message : String(e));
      return;
    } finally {
      recording.current = null;
      setAnalyser(null);
    }
    if (!alive.current) return;
    if (!audio.length) {
      setPhase('ready');
      setError("I didn't hear anything. Tap the mic and say your line.");
      return;
    }
    setPhase('checking');
    let turn: Turn;
    try {
      const heard = await transcribe(audio, lang);
      const c = compare(line.text, heard, lang, line.alt);
      turn = { score: c.score, heard, tokens: c.tokens };
      if (testHook) Object.assign(window, { __roleplayHeard: heard });
    } catch (e) {
      setPhase('ready');
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    if (!alive.current) return;
    setTurns((t) => ({ ...t, [step]: turn }));
    setPhase('graded');
    const ok = turn.score! >= PASS;
    sfx(ok ? 'correct' : 'wrong');
    haptic(ok ? 'success' : 'error');
    if (!ok) {
      setMisses((m) => m + 1);
      if (misses + 1 >= 2) setReveal(true);
    }
    if (ok) {
      setReveal(true);
      const here = step;
      setTimeout(() => alive.current && setStep((s) => (s === here ? s + 1 : s)), 1400);
    }
  };

  const start = () => {
    tapFeedback();
    unlockAudio([]);
    // iOS lets this audio element play later only if it first plays inside a tap.
    if (lines[0]) playPhrase(lines[0].audio);
    setStarted(true);
    setStep(0);
    setTurns({});
    setResult(undefined);
  };

  const shown = started ? lines.slice(0, Math.min(step + 1, lines.length)) : [];
  const turn = line?.who === 'you' ? turns[step] : undefined;
  const mode = promptMode(scenario.level);
  const themClips = lines.filter((l) => l.who === 'them').map((l) => l.audio);

  return (
    <Screen title="Role-play" back={`/${lang}/roleplay`}>
      <div className="card story-head">
        <div>
          <div className="muted small">
            {LEVELS[scenario.level - 1]} · {TOPICS[scenario.topic].label}
          </div>
          <div className="story-title" lang={lang}>
            {scenario.title}
          </div>
          <div className="muted">{scenario.en}</div>
        </div>
        <p style={{ margin: 0 }}>{scenario.setting}</p>
        <p className="muted small" style={{ margin: 0 }}>
          You talk with: <b>{scenario.them}</b>
        </p>
        {!started && (
          <button className="btn" onClick={start} data-testid="roleplay-start">
            <Icon name="play" size={18} /> Start
          </button>
        )}
        {!started && (
          <button className="btn secondary" onClick={() => navigate(`/${lang}/talk/${scenario.id}`)} data-testid="roleplay-ai">
            <Icon name="mic" size={18} /> Role-play it with the AI (free-form, online)
          </button>
        )}
        {started && (
          <label className="chip-toggle" style={{ alignSelf: 'flex-start' }}>
            <input type="checkbox" checked={english} onChange={(e) => setEnglish(e.target.checked)} /> English
          </label>
        )}
        {!graded && (
          <p className="muted small" style={{ margin: 0 }}>
            Without the speech model your turns aren't graded.{' '}
            <button className="link-btn" onClick={() => navigate('/settings')}>
              Download it in Settings
            </button>
          </p>
        )}
      </div>

      {characters && (
        <CharacterStage
          them={scenario.them}
          topic={scenario.topic}
          clips={themClips}
          speaking={started && line?.who === 'them' ? line.audio : null}
          mood={turn?.score != null && phase === 'graded' ? (turn.score >= PASS ? 'happy' : 'confused') : finished && result != null && result >= PASS ? 'happy' : 'idle'}
        />
      )}

      <div className="story-lines dialogue" aria-live="polite">
        {shown.map((l, i) => {
          const mine = l.who === 'you';
          const t = turns[i];
          // Your line stays a placeholder until you've said it (the panel below shows the prompt).
          const hidden = mine && i === step && !finished && !t;
          return (
            <div key={i} className={['story-line', mine ? 'right' : 'left', i === step && !finished && 'active'].filter(Boolean).join(' ')} data-line={i}>
              <div className="speaker">{mine ? 'You' : scenario.them}</div>
              <div className="bubble">
                {hidden ? (
                  <p className="line-text muted">{mode === 'meaning' ? 'Say it your way…' : 'Your turn…'}</p>
                ) : (
                  <>
                    <p className="line-text" lang={lang}>
                      {t?.tokens?.length
                        ? t.tokens.map((tok, k) => (
                            <span key={k}>
                              {k > 0 && lang !== 'zh' ? ' ' : ''}
                              <span className={`token ${tok.status}`}>{tok.text}</span>
                            </span>
                          ))
                        : l.text}
                    </p>
                    {l.pinyin && <p className="line-pinyin">{l.pinyin}</p>}
                  </>
                )}
                {english && !hidden && <p className="line-en">{l.en}</p>}
                {t && t.score !== null && (
                  <div className="line-grade">
                    <span className={`score-chip ${gradeClass(t.score)}`}>{Math.round(t.score * 100)}%</span>
                  </div>
                )}
                <button className="line-play" aria-label={`Play line ${i + 1}`} onClick={() => playPhrase(l.audio)}>
                  <Icon name="speaker" size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {finished && result !== undefined && (
        <div className={`card grade ${result === null || result >= 0.85 ? 'ok' : result >= PASS ? 'close' : 'wrong'}`} data-testid="roleplay-done">
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {result === null ? 'Conversation done!' : `Conversation done: ${Math.round(result * 100)}% on average`}
          </div>
          <p style={{ margin: 0 }}>
            +{ROLEPLAY_XP} XP.{' '}
            {result === null
              ? 'Download the speech model in Settings to get your turns graded.'
              : result < 0.85
                ? 'Lines in orange or red are worth another go.'
                : 'You sounded great.'}
          </p>
          <div className="row">
            <button className="btn secondary flex" onClick={start}>
              <Icon name="review" size={18} /> Again
            </button>
            <button className="btn flex" onClick={() => navigate(`/${lang}/roleplay`, { direction: 'back' })}>
              More role-plays
            </button>
          </div>
        </div>
      )}

      {started && line?.who === 'you' && <div style={{ height: 230 }} aria-hidden="true" /> /* room to scroll past the turn panel */}
      {started && line?.who === 'you' && (
        <TurnPanel
          lang={lang}
          scenario={scenario}
          line={line}
          mode={mode}
          reveal={reveal}
          phase={phase}
          turn={turn}
          graded={graded}
          error={error}
          analyser={analyser}
          onReveal={() => {
            tapFeedback();
            setReveal(true);
          }}
          hint={misses > 0 || hinted ? startOf(line.text, lang) : null}
          onHint={() => {
            tapFeedback();
            setHinted(true);
          }}
          onSpeak={speak}
          onSkip={() => {
            tapFeedback();
            recording.current?.stop();
            next();
          }}
        />
      )}
    </Screen>
  );
}

/** The bar at the bottom on your turn: what to say, Hear it, the mic, and Skip. */
function TurnPanel(props: {
  lang: Lang;
  scenario: Scenario;
  line: ScenarioLine;
  mode: 'words' | 'hint' | 'meaning';
  reveal: boolean;
  phase: TurnPhase;
  turn?: Turn;
  graded: boolean;
  error: string | null;
  analyser: AnalyserNode | null;
  onReveal: () => void;
  hint: string | null;
  onHint: () => void;
  onSpeak: () => void;
  onSkip: () => void;
}) {
  const { lang, line, mode, reveal, phase, turn, graded, error, analyser, onReveal, hint, onHint, onSpeak, onSkip } = props;
  const busy = phase === 'listening' || phase === 'heard';
  const failed = phase === 'graded' && turn?.score != null && turn.score < PASS;
  const status =
    phase === 'listening'
      ? 'Speak now'
      : phase === 'heard'
        ? 'Listening… stops when you finish'
        : phase === 'checking'
          ? 'Checking…'
          : phase === 'graded' && turn?.score != null
            ? turn.score >= 0.85
              ? `${Math.round(turn.score * 100)}% · Great!`
              : turn.score >= PASS
                ? `${Math.round(turn.score * 100)}% · Close enough`
                : turn.heard
                  ? `${Math.round(turn.score * 100)}% · Not quite. Try again, or skip.`
                  : "Didn't hear you. Try again."
            : graded
              ? 'Your turn: tap the mic and say it'
              : 'Your turn: say it out loud, then Next';
  return (
    <div className="lesson-foot turn-panel" data-testid="turn-panel">
      <div className="turn-prompt">
        <div className="muted small">{mode === 'meaning' ? 'Say this, in your own words:' : 'Your line:'}</div>
        <div className="turn-en">{line.en}</div>
        {reveal ? (
          <div className="turn-text" lang={lang}>
            {line.text}
            {line.pinyin && <div className="pinyin small">{line.pinyin}</div>}
          </div>
        ) : (
          <>
            {hint && (
              <div className="turn-hint" lang={lang} data-testid="turn-hint">
                Starts with <b>{hint}</b>
              </div>
            )}
            <div className="row" style={{ gap: 16 }}>
              {!hint && (
                <button className="link-btn" onClick={onHint} data-testid="show-hint">
                  Hint
                </button>
              )}
              <button className="link-btn" onClick={onReveal} data-testid="show-words">
                Show the words
              </button>
            </div>
          </>
        )}
      </div>
      <div className="row turn-actions">
        <button className="btn secondary sound-sm" onClick={() => playPhrase(line.audio)} aria-label="Hear it said">
          <Icon name="speaker" size={20} />
          Hear it
        </button>
        {graded ? (
          <button
            className={phase === 'checking' ? 'mic small checking' : busy ? 'mic small on' : 'mic small'}
            onClick={onSpeak}
            disabled={phase === 'checking' || (phase === 'graded' && !failed)}
            aria-label={busy ? 'Stop recording' : 'Record your line'}
            data-testid="turn-mic"
          >
            {phase === 'checking' ? <span className="spinner" /> : <Icon name={busy ? 'stop' : 'mic'} size={30} />}
          </button>
        ) : (
          <button className="btn flex" onClick={onSkip} data-testid="turn-next">
            Next
          </button>
        )}
        {graded && (
          <button className="btn secondary sound-sm" onClick={onSkip} aria-label="Skip this line" data-testid="turn-skip">
            <Icon name="chevron" size={20} />
            Skip
          </button>
        )}
      </div>
      {busy && <Waveform analyser={analyser} />}
      <div className="shadow-status" aria-live="polite" data-testid="turn-status">
        {status}
      </div>
      {turn?.tokens && phase === 'graded' && (
        <Heatmap tokens={turn.tokens} lang={lang} small />
      )}
      {error && <p style={{ color: 'var(--wrong)', margin: 0 }}>{error}</p>}
    </div>
  );
}

/** A flirting role-play opens only after the 18+ check. */
export function GatedRolePlay(props: { lang: Lang; id: string }) {
  const { adult } = useProgress();
  if (!adult && getScenario(props.lang, props.id)?.topic === 'flirting') return <AdultGateScreen back={`/${props.lang}/roleplay`} />;
  return <RolePlayScreen {...props} />;
}
