import { pinyin } from 'pinyin-pro';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { compare } from '../../../shared/compare';
import { playChime, playClip, playClipAfterPhrase, playPhrase, type Recording, startRecording, unlockAudio } from '../lib/audio';
import { type Lang, shuffle } from '../lib/content';
import { getLesson, getLessons, type Item, weakItems } from '../lib/course';
import { allClips, Coach, type Line, type Reaction } from '../lib/feedback';
import { checkTiles, checkTyped, type Exercise, itemsOf, lessonExercises, reviewExercises } from '../lib/exercises';
import {
  completeLesson,
  gainHeart,
  heartsNow,
  loseHeart,
  recordAnswer,
  streak,
  todayXp,
  useProgress,
} from '../lib/progress';
import { navigate } from '../lib/router';
import { isModelReady, transcribe } from '../lib/whisper';
import { ProgressBar } from '../ui';

const LESSON_XP = 10;
const PERFECT_BONUS = 5;
const REVIEW_XP = 5;

type Result = {
  right: boolean;
  /** Shown under "Great job!" or the correct answer, e.g. a missing accent. */
  note?: string;
  /** Mistakes that don't cost a heart or come back: new words, speaking. */
  free?: boolean;
  /** Skipped ("can't speak now"): no grade at all. */
  skipped?: boolean;
  /** Spoken answer that was close rather than spot on. */
  close?: boolean;
  /** What the coach shows (and maybe says); filled in by the lesson. */
  reaction?: Reaction;
};

const testHook = location.search.includes('test');

function autoPlay(ex: Exercise | undefined) {
  if (ex && (ex.type === 'meaning' || ex.type === 'listen' || ex.type === 'type')) playPhrase(ex.item.audio);
}

export default function Lesson({ lang, lessonId }: { lang: Lang; lessonId: string }) {
  const progress = useProgress();
  const review = lessonId === 'review';
  const lesson = review ? undefined : getLesson(lang, lessonId);
  const back = `/${lang}`;

  const [queue, setQueue] = useState<Exercise[]>(() => {
    const speaking = progress.speaking && isModelReady();
    const all = getLessons(lang).flatMap((l) => l.items);
    if (review) return reviewExercises(shuffle(weakItems(progress, lang)), all, lang, speaking);
    if (!lesson) return [];
    const index = getLessons(lang).findIndex((l) => l.id === lesson.id);
    const earlier = getLessons(lang)
      .slice(0, index)
      .flatMap((l) => l.items);
    return lessonExercises(lesson.items, earlier, lang, speaking);
  });
  const total = useRef(queue.length); // exercises in the lesson, not counting repeats
  const [phase, setPhase] = useState<'start' | 'play' | 'done' | 'no-hearts'>('start');
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [summary, setSummary] = useState<{ xp: number; goalReached: boolean; line: Line } | null>(null);
  const coach = useRef(new Coach(lang));
  const started = useRef(Date.now());

  const ex = queue[index];
  if (testHook) (window as { __exercise?: Exercise }).__exercise = ex;
  const hearts = heartsNow(progress).hearts;

  if (!queue.length) {
    navigate(back, true);
    return null;
  }

  const submit = (r: Result) => {
    if (r.skipped) return setResult(r);
    const reaction = r.right ? coach.current.right() : coach.current.wrong();
    setResult({ ...r, reaction });
    playChime(r.right);
    itemsOf(ex).forEach((item) => recordAnswer(lang, item.id, r.right));
    if (ex.type !== 'meaning' && ex.type !== 'match' && ex.type !== 'speak') playPhrase(ex.item.audio);
    if (progress.voice && reaction.speak) playClipAfterPhrase(reaction.line.url);
    if (!r.right && !r.free) {
      setMistakes((m) => m + 1);
      setQueue((q) => [...q, ex]); // try it again at the end
      if (!review) loseHeart();
    } else if (!r.right && ex.type === 'meaning') {
      setQueue((q) => [...q, { ...ex, isNew: false, options: shuffle(ex.options) }]);
    }
  };

  const next = () => {
    setResult(null);
    if (!review && heartsNow(progress).hearts <= 0) return setPhase('no-hearts');
    if (index + 1 >= queue.length) return finish();
    setIndex(index + 1);
    autoPlay(queue[index + 1]);
  };

  const finish = () => {
    const xp = review ? REVIEW_XP : LESSON_XP + (mistakes === 0 ? PERFECT_BONUS : 0);
    const before = todayXp(progress);
    completeLesson(lang, review ? null : lessonId, xp);
    if (review) gainHeart();
    const line = coach.current.finished(mistakes === 0);
    setSummary({ xp, goalReached: before < progress.goal && before + xp >= progress.goal, line });
    setPhase('done');
    if (progress.voice) void playClip(line.url, 0.2);
  };

  const quit = () => {
    if (phase !== 'play' || index === 0 || confirm('Quit this lesson? Your progress in it will be lost.')) navigate(back);
  };

  if (phase === 'start') {
    const blocked = !review && hearts <= 0;
    return (
      <LessonFrame onQuit={quit} value={0} hearts={review ? null : hearts}>
        <div className="card" style={{ gap: 14, marginTop: 24 }}>
          <p className="muted">{review ? 'Practice' : 'Lesson'}</p>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{review ? 'Review your weak words' : lesson!.title}</div>
          <p className="muted">
            {total.current} exercises · about {Math.max(2, Math.round(total.current / 4))} minutes · turn your sound on
          </p>
          {review && <p className="muted">Mistakes here don't cost hearts, and finishing earns one back.</p>}
          {blocked ? (
            <NoHeartsMessage lang={lang} />
          ) : (
            <button
              className="btn"
              onClick={() => {
                unlockAudio(progress.voice ? allClips(lang) : []);
                started.current = Date.now();
                setPhase('play');
                autoPlay(ex);
              }}
            >
              Start
            </button>
          )}
        </div>
      </LessonFrame>
    );
  }

  if (phase === 'no-hearts') {
    return (
      <LessonFrame onQuit={() => navigate(back)} value={index / queue.length} hearts={0}>
        <div className="card" style={{ gap: 14, marginTop: 24, alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>💔</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Out of hearts</div>
          <NoHeartsMessage lang={lang} />
        </div>
      </LessonFrame>
    );
  }

  if (phase === 'done' && summary) {
    const accuracy = Math.max(0, Math.round(((total.current - mistakes) / total.current) * 100));
    const minutes = Math.max(1, Math.round((Date.now() - started.current) / 60000));
    const today = todayXp(progress);
    return (
      <main className="page fill" style={{ justifyContent: 'center', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
        <div style={{ textAlign: 'center', fontSize: 64 }}>{mistakes === 0 ? '🏆' : '🎉'}</div>
        <h2 className="heading" style={{ textAlign: 'center' }}>
          {review ? 'Review complete!' : 'Lesson complete!'}
        </h2>
        <div className="cheer">
          <div className="cheer-text">{summary.line.text}</div>
          {summary.line.voice !== 'en' && <div className="muted">{summary.line.en}</div>}
        </div>
        <div className="stats">
          <Stat label="XP earned" value={`+${summary.xp}`} tone="accent" />
          <Stat label="Accuracy" value={`${accuracy}%`} tone={accuracy >= 80 ? 'ok' : 'close'} />
          <Stat label="Time" value={`${minutes} min`} tone="muted" />
        </div>
        <div className="card">
          <div className="row">
            <span className="grow" style={{ fontWeight: 600 }}>
              🔥 {streak(progress)} day streak
            </span>
            <span className="muted">
              {Math.min(today, progress.goal)}/{progress.goal} XP today
            </span>
          </div>
          <ProgressBar value={today / progress.goal} />
          {summary.goalReached && <p style={{ margin: 0, color: 'var(--ok)', fontWeight: 600 }}>🎯 Daily goal reached!</p>}
          {mistakes === 0 && !review && <p className="muted">No mistakes: +{PERFECT_BONUS} bonus XP.</p>}
          {review && <p className="muted">+1 ❤️ for practicing.</p>}
        </div>
        <button className="btn" onClick={() => navigate(back)}>
          Continue
        </button>
      </main>
    );
  }

  return (
    <LessonFrame onQuit={quit} value={index / queue.length} hearts={review ? null : hearts}>
      <ExerciseView key={index} ex={ex} lang={lang} answered={result !== null} onSubmit={submit} />
      {result && <ResultBanner ex={ex} result={result} onContinue={next} />}
    </LessonFrame>
  );
}

function NoHeartsMessage({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const { nextIn } = heartsNow(progress);
  return (
    <>
      <p className="muted">
        A heart comes back every 30 minutes{nextIn ? ` (next in ${Math.ceil(nextIn / 60000)} min)` : ''}. Or practice your weak
        words to earn one now.
      </p>
      <button className="btn" style={{ alignSelf: 'stretch' }} onClick={() => navigate(`/${lang}/learn/review`)}>
        Practice to earn a heart
      </button>
      <button className="btn secondary" style={{ alignSelf: 'stretch' }} onClick={() => navigate(`/${lang}`)}>
        Back to the path
      </button>
    </>
  );
}

function LessonFrame({ onQuit, value, hearts, children }: { onQuit: () => void; value: number; hearts: number | null; children: ReactNode }) {
  return (
    <>
      <header className="header lesson-top">
        <button className="back" aria-label="Quit lesson" onClick={onQuit}>
          ✕
        </button>
        <div className="grow">
          <ProgressBar value={value} />
        </div>
        <span className="hearts" aria-label={hearts === null ? 'Practice, no hearts' : `${hearts} hearts`}>
          {hearts === null ? '∞' : `❤️ ${hearts}`}
        </span>
      </header>
      <main className="page fill lesson">{children}</main>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-value">{value}</div>
      <div className="muted small">{label}</div>
    </div>
  );
}

function Target({ item, size = 30 }: { item: Item; size?: number }) {
  return (
    <div>
      <p className="target" style={{ fontSize: size }}>
        {item.text}
      </p>
      {item.pinyin && (
        <p className="pinyin" style={{ fontSize: size * 0.6 }}>
          {item.pinyin}
        </p>
      )}
    </div>
  );
}

function SoundButtons({ item, big }: { item: Item; big?: boolean }) {
  return (
    <div className="row">
      <button className={big ? 'btn sound-big' : 'btn secondary'} onClick={() => playPhrase(item.audio)} aria-label="Play">
        🔊
      </button>
      <button className={big ? 'btn secondary sound-slow' : 'btn secondary'} onClick={() => playPhrase(item.audio, true)} aria-label="Play slowly">
        🐢
      </button>
    </div>
  );
}

function CheckBar({ disabled, onCheck, children }: { disabled: boolean; onCheck: () => void; children?: ReactNode }) {
  return (
    <div className="lesson-foot">
      {children}
      <button className="btn" disabled={disabled} onClick={onCheck}>
        Check
      </button>
    </div>
  );
}

type ViewProps = { ex: Exercise; lang: Lang; answered: boolean; onSubmit: (r: Result) => void };

function ExerciseView(props: ViewProps) {
  switch (props.ex.type) {
    case 'meaning':
    case 'listen':
    case 'translate':
      return <ChoiceExercise {...props} />;
    case 'tiles':
      return <TilesExercise {...props} />;
    case 'match':
      return <MatchExercise {...props} />;
    case 'type':
      return <TypeExercise {...props} />;
    case 'speak':
      return <SpeakExercise {...props} />;
  }
}

function ChoiceExercise({ ex, answered, onSubmit }: ViewProps) {
  const [picked, setPicked] = useState<number | null>(null);
  if (ex.type !== 'meaning' && ex.type !== 'listen' && ex.type !== 'translate') return null;

  const labels = ex.type === 'meaning' ? ex.options : ex.options.map((o) => (o.pinyin ? `${o.text}\n${o.pinyin}` : o.text));
  const correct = ex.type === 'meaning' ? ex.options.indexOf(ex.item.en) : ex.options.indexOf(ex.item);
  const optionClass = (i: number) => {
    if (!answered) return i === picked ? 'btn secondary option selected' : 'btn secondary option';
    if (i === correct) return 'btn secondary option picked-right';
    if (i === picked) return 'btn secondary option picked-wrong';
    return 'btn secondary option faded';
  };

  return (
    <>
      {ex.type === 'meaning' && (
        <>
          <p className="prompt">{ex.isNew ? <span className="chip-new">New</span> : null} What does this mean?</p>
          <div className="row">
            <div className="grow">
              <Target item={ex.item} size={36} />
            </div>
            <SoundButtons item={ex.item} />
          </div>
        </>
      )}
      {ex.type === 'listen' && (
        <>
          <p className="prompt">{ex.item.kind === 'sound' ? 'Which sound do you hear?' : 'What do you hear?'}</p>
          <SoundButtons item={ex.item} big />
        </>
      )}
      {ex.type === 'translate' && (
        <>
          <p className="prompt">How do you say…</p>
          <div style={{ fontSize: 28, fontWeight: 650 }}>“{ex.item.en}”</div>
        </>
      )}
      <div className="options">
        {labels.map((label, i) => (
          <button key={i} className={optionClass(i)} disabled={answered} onClick={() => setPicked(i)}>
            {label}
          </button>
        ))}
      </div>
      {!answered && (
        <CheckBar
          disabled={picked === null}
          onCheck={() => onSubmit({ right: picked === correct, free: ex.type === 'meaning' && ex.isNew })}
        />
      )}
    </>
  );
}

function TileText({ text, lang }: { text: string; lang: Lang }) {
  if (lang !== 'zh') return <>{text}</>;
  return (
    <span className="tile-zh">
      <span>{text}</span>
      <span className="pinyin small">{pinyin(text)}</span>
    </span>
  );
}

function TilesExercise({ ex, lang, answered, onSubmit }: ViewProps) {
  const [placed, setPlaced] = useState<number[]>([]); // indexes into the bank
  if (ex.type !== 'tiles') return null;
  const words = placed.map((i) => ex.bank[i]);
  return (
    <>
      <p className="prompt">Build the sentence</p>
      <div style={{ fontSize: 26, fontWeight: 650 }}>“{ex.item.en}”</div>
      <div className="answer-line" aria-label="Your answer">
        {placed.map((bankIndex, i) => (
          <button key={bankIndex} className="tile" disabled={answered} onClick={() => setPlaced(placed.filter((_, j) => j !== i))}>
            <TileText text={ex.bank[bankIndex]} lang={lang} />
          </button>
        ))}
      </div>
      <div className="bank">
        {ex.bank.map((word, i) => (
          <button
            key={i}
            className={placed.includes(i) ? 'tile used' : 'tile'}
            disabled={answered || placed.includes(i)}
            onClick={() => setPlaced([...placed, i])}
          >
            <TileText text={word} lang={lang} />
          </button>
        ))}
      </div>
      {!answered && <CheckBar disabled={!placed.length} onCheck={() => onSubmit({ right: checkTiles(words, ex.item) })} />}
    </>
  );
}

function MatchExercise({ ex, onSubmit }: ViewProps) {
  const items = ex.type === 'match' ? ex.items : [];
  const [left] = useState(() => shuffle(items));
  const [right] = useState(() => shuffle(items));
  const [sel, setSel] = useState<{ left?: string; right?: string }>({});
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const mistakes = useRef(0);

  const choose = (side: 'left' | 'right', item: Item) => {
    if (side === 'left') playPhrase(item.audio);
    const next = { ...sel, [side]: item.id };
    if (!next.left || !next.right) return setSel(next);
    setSel({});
    if (next.left === next.right) {
      playChime(true);
      const done = [...matched, item.id];
      setMatched(done);
      if (done.length === items.length) onSubmit({ right: true, note: mistakes.current ? undefined : 'All pairs right first time.' });
    } else {
      mistakes.current++;
      playChime(false);
      setWrong([next.left, next.right]);
      setTimeout(() => setWrong([]), 500);
    }
  };

  const cls = (side: 'left' | 'right', id: string) =>
    ['btn secondary pair', matched.includes(id) && 'picked-right faded', sel[side] === id && 'selected', wrong.includes(id) && wrong[side === 'left' ? 0 : 1] === id && 'picked-wrong']
      .filter(Boolean)
      .join(' ');

  return (
    <>
      <p className="prompt">Tap the matching pairs</p>
      <div className="match">
        <div className="match-col">
          {left.map((item) => (
            <button key={item.id} className={cls('left', item.id)} disabled={matched.includes(item.id)} onClick={() => choose('left', item)}>
              {item.pinyin ? `${item.text}\n${item.pinyin}` : item.text}
            </button>
          ))}
        </div>
        <div className="match-col">
          {right.map((item) => (
            <button key={item.id} className={cls('right', item.id)} disabled={matched.includes(item.id)} onClick={() => choose('right', item)}>
              {item.en}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function TypeExercise({ ex, lang, answered, onSubmit }: ViewProps) {
  const [text, setText] = useState('');
  if (ex.type !== 'type') return null;
  const check = () => {
    const r = checkTyped(text, ex.item, lang);
    onSubmit({ right: r.right, note: r.note });
  };
  return (
    <>
      <p className="prompt">Type what you hear</p>
      <SoundButtons item={ex.item} big />
      <textarea
        className="answer-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (text.trim() && !answered) check();
          }
        }}
        placeholder={lang === 'zh' ? 'Characters, or pinyin with tone numbers (ni3 hao3)' : 'Type it here'}
        lang={lang}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        disabled={answered}
        rows={2}
      />
      {!answered && <CheckBar disabled={!text.trim()} onCheck={check} />}
    </>
  );
}

function SpeakExercise({ ex, lang, answered, onSubmit }: ViewProps) {
  const [state, setState] = useState<'idle' | 'listening' | 'heard' | 'checking'>('idle');
  const [heard, setHeard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recording = useRef<Recording | null>(null);
  useEffect(() => () => recording.current?.stop(), []);
  if (ex.type !== 'speak') return null;

  const onMic = async () => {
    if (state === 'listening' || state === 'heard') return recording.current?.stop();
    setError(null);
    try {
      const rec = await startRecording(() => setState('heard'));
      recording.current = rec;
      setState('listening');
      const audio = await rec.done;
      recording.current = null;
      if (!audio.length) throw new Error("I didn't hear anything. Tap the mic and speak a little louder.");
      setState('checking');
      const text = await transcribe(audio, lang);
      const score = compare(ex.item.text, text, lang, ex.item.alt).score;
      setHeard(text);
      setState('idle');
      onSubmit({ right: score >= 0.5, free: true, close: score >= 0.5 && score < 0.85, note: `Whisper heard: “${text || '(nothing)'}” · ${Math.round(score * 100)}%` });
    } catch (e) {
      recording.current = null;
      setState('idle');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const busy = state !== 'idle';
  return (
    <>
      <p className="prompt">Say it out loud</p>
      <div className="row">
        <div className="grow">
          <Target item={ex.item} size={34} />
          <p className="english">{ex.item.en}</p>
        </div>
        <SoundButtons item={ex.item} />
      </div>
      <button
        className={state === 'checking' ? 'mic checking' : busy ? 'mic on' : 'mic'}
        onClick={onMic}
        disabled={answered || state === 'checking'}
        aria-label={busy ? 'Stop recording' : 'Start recording'}
      >
        {state === 'checking' ? <span className="spinner" /> : busy ? '■' : '🎙️'}
      </button>
      <p className="status" aria-live="polite">
        {state === 'listening'
          ? 'Speak now'
          : state === 'heard'
            ? 'Listening… stops when you finish'
            : state === 'checking'
              ? 'Checking your pronunciation…'
              : heard === null
                ? 'Tap the mic and say it'
                : ''}
      </p>
      {error && <p style={{ color: 'var(--wrong)', textAlign: 'center', margin: 0 }}>{error}</p>}
      {!answered && (
        <div className="lesson-foot">
          <button className="btn secondary" disabled={busy} onClick={() => onSubmit({ right: true, free: true, skipped: true })}>
            Can't speak now
          </button>
        </div>
      )}
    </>
  );
}

function ResultBanner({ ex, result, onContinue }: { ex: Exercise; result: Result; onContinue: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus({ preventScroll: true }), []);
  const item = ex.type === 'match' ? null : ex.item;
  const line = result.reaction?.line;
  const streak = result.reaction?.streak;
  const showAnswer = item && !result.skipped && (!result.right || ex.type === 'meaning' || result.note);
  const tone = result.skipped ? 'neutral' : result.right ? (streak ? 'ok streak' : 'ok') : 'bad';
  return (
    <div className={`banner ${tone}`} role="status">
      {streak && <div className="streak-chip">🔥 {streak} in a row!</div>}
      <div className="banner-title">
        {result.skipped ? '⏭️ Skipped' : `${result.right ? '✅' : '💪'} ${line?.text ?? ''}`}
        {line && line.voice !== 'en' && <span className="banner-en"> {line.en}</span>}
      </div>
      {result.close && <div className="small">Close enough. Listen again to sound even more natural.</div>}
      {showAnswer && (
        <div>
          {!result.right && <div className="small">{ex.type === 'speak' ? 'Listen, then try it next time:' : 'Correct answer:'}</div>}
          {ex.type === 'meaning' ? (
            <b>
              {item.text} = {item.en}
            </b>
          ) : (
            <>
              <b>{item.text}</b>
              {item.pinyin && <span> · {item.pinyin}</span>}
              <div>{item.en}</div>
            </>
          )}
        </div>
      )}
      {result.note && <div className="small">{result.note}</div>}
      <button ref={button} className="btn" onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
