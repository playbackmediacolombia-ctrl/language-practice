import { useEffect, useMemo, useRef, useState } from 'react';
import { compare, type TokenResult } from '../../../shared/compare';
import { glossKey, tokenize } from '../../../shared/tokens';
import { clipSeconds, playAndWait, playPhrase, playSequence, type Recording, startRecording, unlockAudio } from '../lib/audio';
import { type Lang, shuffle } from '../lib/content';
import { haptic, sfx, tapFeedback } from '../lib/fx';
import { recordShadowing, recordShadowLine, recordStory, recordStoryAnswer, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { getStories, getStory, type Gloss, LEVELS, type Line, optionEn, optionText, type Story } from '../lib/stories';
import { isModelReady, loadModel, transcribe } from '../lib/whisper';
import { Icon, Screen, Waveform } from '../ui';
import { LangSwitcher } from './Path';

const STORY_XP = 10;
const SHADOW_XP = 5;

/** How a line went in shadowing: Whisper's score and the words it heard (score null: not graded). */
type LineResult = { score: number | null; heard?: string; tokens?: TokenResult[] };
/** Where shadowing is: hearing the line, your turn, speech heard, Whisper checking, or showing the grade. */
type ShadowPhase = 'listen' | 'speak' | 'heard' | 'checking' | 'result';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const testHook = location.search.includes('test');

/** Practice tab › Stories & dialogues: three levels, a story and a dialogue each. */
export function StoryList({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const stories = getStories(lang);
  return (
    <Screen title="Stories & dialogues" back="/practice">
      <LangSwitcher lang={lang} to={(l) => `/${l}/stories`} />
      <p className="muted small" style={{ margin: '0 4px' }}>
        Listen, tap any word for its meaning, then answer three questions.
      </p>
      {LEVELS.map((lv) => (
        <section key={lv.level} className="story-level">
          <div className="section-title">{lv.title}</div>
          <p className="muted small" style={{ margin: '-4px 4px 0' }}>
            {lv.about}
          </p>
          <div className="list">
            {stories
              .filter((s) => s.level === lv.level)
              .map((s) => {
                const best = progress.stories[`${lang}:${s.id}`];
                return (
                  <button
                    key={s.id}
                    className="list-row link"
                    data-testid={`story-${s.id}`}
                    onClick={() => {
                      tapFeedback();
                      navigate(`/${lang}/stories/${s.id}`);
                    }}
                  >
                    <span className="row-icon">
                      <Icon name={s.kind === 'dialogue' ? 'chat' : 'book'} />
                    </span>
                    <span className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="row-title" lang={lang}>
                        {s.title}
                      </span>
                      <span className="row-hint">
                        {s.en} · {s.kind === 'dialogue' ? 'Dialogue' : 'Story'} · {s.lines.length} lines
                      </span>
                    </span>
                    {best !== undefined && (
                      <span className={best === 1 ? 'story-score full' : 'story-score'}>
                        {Math.round(best * s.questions.length)}/{s.questions.length}
                      </span>
                    )}
                    <Icon name="chevron" />
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </Screen>
  );
}

const glossText = (g: Gloss) => (typeof g === 'string' ? g : g.en);
const glossPinyin = (g: Gloss) => (typeof g === 'string' ? undefined : g.py);

export function StoryScreen({ lang, id }: { lang: Lang; id: string }) {
  const story = getStory(lang, id);
  const [playing, setPlaying] = useState(-1); // line being read, -1 when stopped
  const [slow, setSlow] = useState(false);
  const [english, setEnglish] = useState(false);
  const [word, setWord] = useState<{ text: string; gloss?: Gloss; line: number } | null>(null);
  const stop = useRef<(() => void) | null>(null);
  // Shadowing: hear a line, say it back, Whisper grades it, on to the next.
  const [shadow, setShadow] = useState<{ line: number; phase: ShadowPhase } | null>(null);
  const [results, setResults] = useState<Record<number, LineResult>>({});
  const [shadowEnd, setShadowEnd] = useState<{ average: number | null; error?: string } | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const run = useRef<symbol | null>(null);
  const recording = useRef<Recording | null>(null);

  const stopShadow = () => {
    run.current = null;
    recording.current?.stop();
    recording.current = null;
    setAnalyser(null);
    setShadow(null);
  };
  useEffect(
    () => () => {
      stop.current?.();
      run.current = null;
      recording.current?.stop();
    },
    [],
  );
  const current = shadow?.line ?? playing;
  useEffect(() => {
    if (current >= 0) document.querySelector(`[data-line="${current}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [current]);

  if (!story) {
    navigate(`/${lang}/stories`, { replace: true });
    return null;
  }

  /** Shadows from line `from` to the end. Call it from a tap (iOS starts audio only then). */
  const runShadow = async (from: number) => {
    stop.current?.();
    recording.current?.stop();
    const me = Symbol('shadowing');
    run.current = me;
    const alive = () => run.current === me;
    const graded = isModelReady();
    if (graded) loadModel().catch(() => {});
    setWord(null);
    setShadowEnd(null);
    const scores: (number | null)[] = [];
    for (let i = from; i < story.lines.length; i++) {
      const line = story.lines[i];
      setShadow({ line: i, phase: 'listen' });
      if (testHook) Object.assign(window, { __shadowAudio: new URL(line.audio, location.href).href, __shadowLine: i });
      await playAndWait(line.audio, slow);
      if (!alive()) return;
      setShadow({ line: i, phase: 'speak' });
      let result: LineResult = { score: null };
      if (graded) {
        let audio: Float32Array;
        try {
          const rec = await startRecording(() => alive() && setShadow({ line: i, phase: 'heard' }));
          recording.current = rec;
          setAnalyser(rec.analyser);
          audio = await rec.done;
        } catch (e) {
          if (alive()) {
            stopShadow();
            setShadowEnd({ average: null, error: e instanceof Error ? e.message : String(e) });
          }
          return;
        }
        recording.current = null;
        setAnalyser(null);
        if (!alive()) return;
        if (audio.length) {
          setShadow({ line: i, phase: 'checking' });
          const heard = await transcribe(audio, lang);
          if (!alive()) return;
          const c = compare(line.text, heard, lang);
          result = { score: c.score, heard, tokens: c.tokens };
        } else {
          result = { score: 0, heard: '' };
        }
        sfx(result.score! >= 0.5 ? 'correct' : 'wrong');
        haptic(result.score! >= 0.5 ? 'success' : 'error');
      } else {
        // No speech model: a pause long enough to say it, without a grade.
        await sleep(Math.max(2200, clipSeconds() * 1300));
        if (!alive()) return;
      }
      recordShadowLine(lang, result.score);
      scores.push(result.score);
      setResults((r) => ({ ...r, [i]: result }));
      setShadow({ line: i, phase: 'result' });
      await sleep(graded ? 1500 : 400);
      if (!alive()) return;
    }
    run.current = null;
    setShadow(null);
    const scored = scores.filter((x): x is number => x !== null);
    const average = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
    if (from === 0) recordShadowing(lang, story.id, average, SHADOW_XP); // a whole pass counts like a short lesson
    setShadowEnd({ average });
    sfx('complete');
  };

  const startShadow = (from: number) => {
    tapFeedback();
    unlockAudio([]);
    void runShadow(from);
  };

  const playAll = () => {
    tapFeedback();
    if (shadow) stopShadow();
    if (playing >= 0) {
      stop.current?.();
      return;
    }
    setWord(null);
    stop.current = playSequence(
      story.lines.map((l) => l.audio),
      0,
      slow,
      setPlaying,
    );
  };
  const playLine = (i: number) => {
    stop.current?.();
    setPlaying(-1);
    playPhrase(story.lines[i].audio, slow);
  };
  const speakers = Object.keys(story.speakers ?? {});

  return (
    <Screen title={story.kind === 'dialogue' ? 'Dialogue' : 'Story'} back={`/${lang}/stories`}>
      <div className="card story-head">
        <div>
          <div className="story-title" lang={lang}>
            {story.title}
          </div>
          <div className="muted">{story.en}</div>
        </div>
        <div className="row">
          <button className="btn flex" onClick={playAll} data-testid="play-all">
            <Icon name={playing >= 0 ? 'stop' : 'play'} size={18} /> {playing >= 0 ? 'Stop' : 'Play all'}
          </button>
          <button className="btn secondary flex" onClick={() => (shadow ? stopShadow() : startShadow(0))} data-testid="shadow-start">
            <Icon name={shadow ? 'stop' : 'mic'} size={18} /> {shadow ? 'Stop' : 'Shadow'}
          </button>
        </div>
        <div className="row story-toggles">
          <label className="chip-toggle">
            <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> Slow
          </label>
          <label className="chip-toggle">
            <input type="checkbox" checked={english} onChange={(e) => setEnglish(e.target.checked)} /> English
          </label>
        </div>
      </div>

      <div className={story.kind === 'dialogue' ? 'story-lines dialogue' : 'story-lines'}>
        {story.lines.map((line, i) => (
          <StoryLine
            key={i}
            index={i}
            line={line}
            lang={lang}
            story={story}
            side={line.speaker ? speakers.indexOf(line.speaker) % 2 : 0}
            active={current === i}
            result={results[i]}
            english={english}
            picked={word?.line === i ? word.text : null}
            onPlay={() => (shadow ? startShadow(i) : playLine(i))}
            onWord={(text, gloss) => {
              tapFeedback();
              setWord(word?.line === i && word.text === text ? null : { text, gloss, line: i });
            }}
          />
        ))}
      </div>

      {shadowEnd && (
        <div className={`card grade ${shadowEnd.error ? 'wrong' : 'ok'}`} data-testid="shadow-done">
          {shadowEnd.error ? (
            <p style={{ margin: 0 }}>{shadowEnd.error}</p>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                Shadowing done{shadowEnd.average !== null ? `: ${Math.round(shadowEnd.average * 100)}% on average` : ''}
              </div>
              <p style={{ margin: 0 }}>
                {shadowEnd.average === null
                  ? 'Download the speech model in Settings to get each line graded.'
                  : 'Lines in orange or red are worth another go: tap the line, then Shadow from there.'}
              </p>
            </>
          )}
        </div>
      )}

      <Questions key={story.id} lang={lang} story={story} />
      {shadow && <div style={{ height: 150 }} aria-hidden="true" /> /* room to scroll past the shadowing bar */}
      {shadow && (
        <ShadowBar
          line={shadow.line}
          total={story.lines.length}
          phase={shadow.phase}
          result={results[shadow.line]}
          graded={isModelReady()}
          analyser={analyser}
          onAgain={() => startShadow(shadow.line)}
          onSkip={() => (shadow.line + 1 < story.lines.length ? startShadow(shadow.line + 1) : stopShadow())}
          onStop={stopShadow}
        />
      )}

      {word && <div style={{ height: 96 }} aria-hidden="true" /> /* room to scroll past the word card */}
      {word && (
        <div className="word-sheet" role="dialog" aria-label={`${word.text}: meaning`} data-testid="word-sheet">
          <div className="grow">
            <div className="word-sheet-word" lang={lang}>
              {word.text}
              {word.gloss && glossPinyin(word.gloss) && <span className="pinyin"> {glossPinyin(word.gloss)}</span>}
            </div>
            <div className="word-sheet-en">{word.gloss ? glossText(word.gloss) : 'No translation for this word.'}</div>
          </div>
          <button className="icon-btn" aria-label="Play this line" onClick={() => playLine(word.line)}>
            <Icon name="speaker" />
          </button>
          <button className="icon-btn" aria-label="Close" onClick={() => setWord(null)}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </Screen>
  );
}

function StoryLine(props: {
  index: number;
  line: Line;
  lang: Lang;
  story: Story;
  side: number;
  active: boolean;
  result?: LineResult;
  english: boolean;
  picked: string | null;
  onPlay: () => void;
  onWord: (text: string, gloss?: Gloss) => void;
}) {
  const { index, line, lang, story, side, active, result, english, picked, onPlay, onWord } = props;
  const tokens = useMemo(() => tokenize(line.text, line.seg), [line]);
  const speaker = line.speaker ? story.speakers?.[line.speaker] : undefined;
  return (
    <div className={['story-line', side ? 'right' : 'left', active && 'active'].filter(Boolean).join(' ')} data-line={index}>
      {speaker && <div className="speaker">{speaker.name}</div>}
      <div className="bubble">
        <p className="line-text" lang={lang}>
          {tokens.map((t, k) =>
            t.word ? (
              <button key={k} className={t.text === picked ? 'word picked' : 'word'} onClick={() => onWord(t.text, story.glossary[glossKey(t.text)])}>
                {t.text}
              </button>
            ) : (
              <span key={k}>{t.text}</span>
            ),
          )}
        </p>
        {line.pinyin && <p className="line-pinyin">{line.pinyin}</p>}
        {english && <p className="line-en">{line.en}</p>}
        {result && <LineGrade result={result} />}
        <button className="line-play" aria-label={`Play line ${index + 1}`} onClick={onPlay}>
          <Icon name="speaker" size={18} />
        </button>
      </div>
    </div>
  );
}

const gradeClass = (score: number) => (score >= 0.85 ? 'ok' : score >= 0.5 ? 'close' : 'wrong');

/** Under a shadowed line: Whisper's score and the words marked right, almost or missed. */
function LineGrade({ result }: { result: LineResult }) {
  if (result.score === null) return <p className="line-grade muted small">Repeated (not graded)</p>;
  return (
    <div className="line-grade" title={result.heard ? `Whisper heard: ${result.heard}` : undefined}>
      <span className={`score-chip ${gradeClass(result.score)}`}>{Math.round(result.score * 100)}%</span>
      {result.tokens?.length ? (
        <span className="tokens small">
          {result.tokens.map((t, i) => (
            <span key={i} className={`token ${t.status}`}>
              {t.text}
            </span>
          ))}
        </span>
      ) : (
        <span className="muted small">{result.heard === '' ? "Didn't hear you" : ''}</span>
      )}
    </div>
  );
}

/** The bar at the bottom while shadowing: what's happening now, and Again / Skip / Stop. */
function ShadowBar(props: {
  line: number;
  total: number;
  phase: ShadowPhase;
  result?: LineResult;
  graded: boolean;
  analyser: AnalyserNode | null;
  onAgain: () => void;
  onSkip: () => void;
  onStop: () => void;
}) {
  const { line, total, phase, result, graded, analyser, onAgain, onSkip, onStop } = props;
  const status =
    phase === 'listen'
      ? 'Listen…'
      : phase === 'speak'
        ? graded
          ? 'Your turn: say it'
          : 'Your turn: say it out loud'
        : phase === 'heard'
          ? 'Listening… stops when you finish'
          : phase === 'checking'
            ? 'Checking…'
            : result?.score == null
              ? 'Next line…'
              : result.score >= 0.85
                ? `${Math.round(result.score * 100)}% · Great!`
                : result.score >= 0.5
                  ? `${Math.round(result.score * 100)}% · Close`
                  : result.heard === ''
                    ? "Didn't hear you"
                    : `${Math.round(result.score * 100)}% · Try it again later`;
  return (
    <div className="lesson-foot shadow-bar" data-testid="shadow-bar">
      <div className="row">
        {/* Red only while the mic is really on (graded); without the speech model it's just a pause. */}
        <span className={`shadow-dot ${graded || phase === 'listen' ? phase : 'pause'}`} aria-hidden="true">
          <Icon name={phase === 'listen' ? 'speaker' : 'mic'} size={20} />
        </span>
        <div className="grow">
          <div className="muted small">
            Shadowing · line {line + 1} of {total}
          </div>
          <div className="shadow-status" data-testid="shadow-status" aria-live="polite">
            {status}
          </div>
        </div>
      </div>
      {(phase === 'speak' || phase === 'heard') && graded && <Waveform analyser={analyser} />}
      {!graded && <p className="muted small" style={{ margin: 0 }}>Not graded: download the speech model in Settings to get a score.</p>}
      <div className="row">
        <button className="btn secondary flex" onClick={onAgain}>
          <Icon name="review" size={18} /> Again
        </button>
        <button className="btn secondary flex" onClick={onSkip}>
          Skip
        </button>
        <button className="btn secondary flex" onClick={onStop}>
          <Icon name="stop" size={18} /> Stop
        </button>
      </div>
    </div>
  );
}

function Questions({ lang, story }: { lang: Lang; story: Story }) {
  // Options shuffled once per visit; `answer` is an index into the original order.
  const [order] = useState(() => story.questions.map((q) => shuffle(q.options.map((_, i) => i))));
  const [picked, setPicked] = useState<(number | null)[]>(() => story.questions.map(() => null));
  const [saved, setSaved] = useState(false);
  const answered = picked.filter((p) => p !== null).length;
  const right = picked.filter((p, i) => p === story.questions[i].answer).length;

  const pick = (qi: number, oi: number) => {
    if (picked[qi] !== null) return;
    const next = picked.map((p, i) => (i === qi ? oi : p));
    setPicked(next);
    const ok = oi === story.questions[qi].answer;
    recordStoryAnswer(lang, ok);
    sfx(ok ? 'correct' : 'wrong');
    haptic(ok ? 'success' : 'error');
    if (next.every((p) => p !== null) && !saved) {
      setSaved(true);
      const score = next.filter((p, i) => p === story.questions[i].answer).length / next.length;
      recordStory(lang, story.id, score, STORY_XP);
      setTimeout(() => sfx('complete'), 400);
    }
  };

  return (
    <section className="story-questions" data-testid="questions">
      <div className="section-title">Check your understanding</div>
      {story.questions.map((q, qi) => (
        <div key={qi} className="card question">
          <div className="question-q" lang={q.qEn ? lang : undefined}>
            {qi + 1}. {q.q}
          </div>
          {q.qEn && <div className="muted small">{q.qEn}</div>}
          <div className="options">
            {order[qi].map((oi) => {
              const o = q.options[oi];
              const state = picked[qi] === null ? '' : oi === q.answer ? 'picked-right' : oi === picked[qi] ? 'picked-wrong' : 'faded';
              return (
                <button key={oi} className={`btn secondary option ${state}`} disabled={picked[qi] !== null} onClick={() => pick(qi, oi)}>
                  <span lang={optionEn(o) ? lang : undefined}>{optionText(o)}</span>
                  {optionEn(o) && picked[qi] !== null && <small className="muted"> {optionEn(o)}</small>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {answered === story.questions.length && (
        <div className={`card grade ${right === story.questions.length ? 'ok' : right > 0 ? 'close' : 'wrong'}`} data-testid="story-result">
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {right}/{story.questions.length} right{right === story.questions.length ? '. You understood it all!' : ''}
          </div>
          <p style={{ margin: 0 }}>+{STORY_XP} XP. {right < story.questions.length ? 'Listen again with English on, then come back.' : ''}</p>
          <button className="btn secondary" onClick={() => navigate(`/${lang}/stories`, { direction: 'back' })}>
            More stories
          </button>
        </div>
      )}
    </section>
  );
}
