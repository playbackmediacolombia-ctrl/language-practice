import { pinyin } from 'pinyin-pro';
import { Sticker, UnitArt } from '../art';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { compare, type TokenResult } from '../../../shared/compare';
import { cutFeedback, playClip, playClipAfterPhrase, playPhrase, type Recording, startRecording, stopAllVoices, unlockAudio } from '../lib/audio';
import { type Lang, LANGS, shuffle } from '../lib/content';
import { allItems, DAILY_MAX, dueItems, dueTomorrow, getLesson, getLessons, getPath, type Item, MISTAKES_MAX, mistakeItems, weakItems } from '../lib/course';
import { isDay1, unitRoleplays } from '../lib/classes';
import { getScenario } from '../lib/scenarios';
import { allClips, Coach, type Line, type Reaction } from '../lib/feedback';
import { haptic, sfx, tapFeedback } from '../lib/fx';
import { checkTiles, checkTyped, type Exercise, itemsOf, lessonExercises, mistakeExercises, repeatExercises, reviewExercises, speakingFirst, unitTestExercises } from '../lib/exercises';
import { getTip } from '../lib/grammar';
import { completeLesson, gainHeart, heartsNow, LESSON_XP, loseHeart, markTipSeen, MISTAKE_RIGHTS, PERFECT_BONUS, recordAnswer, recordTest, setPref, streak, todayXp, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { type Contour, pitchTrack, toContour } from '../lib/pitch';
import { isModelReady, transcribe } from '../lib/whisper';
import { GrammarSheet } from '../GrammarTip';
import { ToneChart } from '../ToneChart';
import { Burst, Confetti, CountUp, Flame, Icon, ProgressBar, Waveform } from '../ui';
import { Heatmap } from '../Heatmap';
import { HintBubble, type HintSet, hintsFor, useHintTimer } from '../Hints';
import { Bird } from '../Bird';

const REVIEW_XP = 5;
const DAILY_XP = 10;
const MISTAKES_XP = 10;

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
  /** A spoken answer, word by word, for the pronunciation heatmap. */
  tokens?: TokenResult[];
  /** Your pitch for a Mandarin "say it" (null if none was found), shown next to the native speaker's. */
  tones?: Contour | null;
  /** What the coach shows (and maybe says); filled in by the lesson. */
  reaction?: Reaction;
};

const testHook = location.search.includes('test');

/** The hints for a question, if it has an answer to hint at (match-the-pairs doesn't; nor does repeating words you can see). */
export function exerciseHints(ex: Exercise, lang: Lang): HintSet | null {
  switch (ex.type) {
    case 'meaning':
      return hintsFor(ex.item.en, { lang: 'en', en: ex.item.en });
    case 'listen':
    case 'type':
      return hintsFor(ex.item.text, { lang, pinyin: ex.item.pinyin, en: ex.item.en });
    case 'translate':
    case 'tiles':
      return hintsFor(ex.item.text, { lang, pinyin: ex.item.pinyin }); // the meaning's on screen: no picture
    case 'speak':
      return ex.recall ? hintsFor(ex.item.text, { lang, pinyin: ex.item.pinyin }) : null;
    case 'fact':
      return hintsFor(ex.answer, { lang: 'en' });
    default:
      return null;
  }
}

/** Each answer right only with a hint costs 1 XP, never more than half the lesson's. */
const withHints = (xp: number, hinted: number) => xp - Math.min(hinted, Math.floor(xp / 2));

export function autoPlay(ex: Exercise | undefined) {
  if (ex && (ex.type === 'meaning' || ex.type === 'listen' || ex.type === 'type' || ex.type === 'repeat')) playPhrase(ex.item.audio);
}

export default function Lesson({ lang, lessonId }: { lang: Lang; lessonId: string }) {
  const progress = useProgress();
  // 'review' drills weak words; 'daily' is the spaced-repetition review of words due today;
  // 'mistakes' drills words got wrong until each is cleared. None of them costs hearts.
  const daily = lessonId === 'daily';
  const drill = lessonId === 'mistakes';
  // A unit's Test ('test-u4'): graded, and hearts count. The unit's lessons are its Practice:
  // gentle, with hints and no hearts lost. Day 1's practice is listening and repeating only.
  const testUnit = lessonId.startsWith('test-') ? getPath(lang).flatMap((s) => s.units).find((u) => u.id === lessonId.slice(5)) : undefined;
  const review = lessonId === 'review' || daily || drill;
  const lesson = review || testUnit ? undefined : getLesson(lang, lessonId);
  const gentle = review || !!lesson; // no hearts lost
  const day1 = !!lesson && isDay1(lesson.unitId);
  const back = daily || drill ? '/practice' : `/${lang}`;
  const drilled = useRef(drill ? mistakeItems(progress, lang).slice(0, MISTAKES_MAX) : []); // this session's words

  // Speaking-first (Settings, or the switch on the start card) turns tapping into speaking.
  const speakFirst = !!progress.speakFirst?.[lang];
  const build = (voiceOnly: boolean): Exercise[] => {
    const speaking = progress.speaking && isModelReady();
    const list = buildExercises(speaking);
    return speaking && voiceOnly ? speakingFirst(list, lang) : list;
  };
  function buildExercises(speaking: boolean): Exercise[] {
    const all = getLessons(lang).flatMap((l) => l.items);
    if (daily) return reviewExercises(shuffle(dueItems(progress, lang).slice(0, DAILY_MAX)), allItems(lang), lang, speaking);
    if (drill) return mistakeExercises(drilled.current, allItems(lang), lang, speaking);
    if (review) return reviewExercises(shuffle(weakItems(progress, lang)), all, lang, speaking);
    if (testUnit) {
      const at = getLessons(lang).findIndex((l) => l.unitId === testUnit.id);
      const earlier = getLessons(lang).slice(0, Math.max(0, at)).flatMap((l) => l.items);
      return unitTestExercises(testUnit.lessons.flatMap((l) => l.items), earlier, lang, speaking);
    }
    if (!lesson) return [];
    if (day1) return repeatExercises(lesson.items);
    const index = getLessons(lang).findIndex((l) => l.id === lesson.id);
    const earlier = getLessons(lang)
      .slice(0, index)
      .flatMap((l) => l.items);
    return lessonExercises(lesson.items, earlier, lang, speaking, lesson.quiz);
  }
  const [queue, setQueue] = useState<Exercise[]>(() => build(speakFirst));
  const total = useRef(queue.length); // exercises in the lesson, not counting repeats
  useEffect(() => () => stopAllVoices(), []); // leaving the lesson silences it
  const [phase, setPhase] = useState<'start' | 'play' | 'done' | 'no-hearts'>('start');
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hinted, setHinted] = useState(0); // answers right only with a hint
  const [busy, setBusy] = useState(false); // you're speaking (or it's being checked): no hints then
  const [summary, setSummary] = useState<{ xp: number; xpBefore: number; streakUp: boolean; goalReached: boolean; line: Line; hinted: number; hintCost: number } | null>(null);
  const coach = useRef(new Coach(lang));
  const started = useRef(Date.now());
  // A lesson that brings in a new grammar rule shows its tip once, before it starts, unless the
  // unit's Class (taken, not skipped) has just taught it.
  const tip = lesson && !day1 ? getTip(lang, lesson.id) : undefined;
  const classTaught = !!lesson && (progress.classes?.[`${lang}:${lesson.unitId}`] ?? 0) > 0;
  const [showTip, setShowTip] = useState(() => !!tip && !classTaught && !progress.tips[`${lang}:${lessonId}`]);
  const closeTip = () => {
    markTipSeen(lang, lessonId);
    setShowTip(false);
  };
  const tipSheet = tip && showTip && <GrammarSheet tip={tip} lang={lang} onClose={closeTip} />;
  const tipButton = tip && (
    <button className="icon-btn" aria-label="Grammar tip" data-testid="tip-button" onClick={() => setShowTip(true)}>
      <Icon name="book" size={24} />
    </button>
  );

  const ex = queue[index];
  if (testHook) (window as { __exercise?: Exercise }).__exercise = ex;
  const hints = ex ? exerciseHints(ex, lang) : null;
  const hint = useHintTimer(index, { paused: phase !== 'play' || result !== null || busy || showTip || !hints, wait: progress.hintWait });
  const hearts = heartsNow(progress).hearts;

  if (!queue.length) {
    navigate(back, { replace: true });
    return null;
  }

  const submit = (r: Result) => {
    if (r.skipped) return setResult(r);
    const reaction = r.right ? coach.current.right() : coach.current.wrong();
    const helped = r.right && hint.level > 0;
    if (helped) {
      setHinted((n) => n + 1);
      r = { ...r, note: [r.note, 'With a hint: it comes back in your Mistakes review.'].filter(Boolean).join(' · ') };
    }
    setResult({ ...r, reaction });
    sfx(r.right ? 'correct' : 'wrong');
    haptic(r.right ? 'success' : 'error');
    itemsOf(ex).forEach((item) => recordAnswer(lang, item.id, r.right, { soft: r.free, track: item.kind !== 'sound', drill, hinted: helped }));
    if (ex.type !== 'meaning' && ex.type !== 'match' && ex.type !== 'speak' && ex.type !== 'fact') playPhrase(ex.item.audio);
    if (progress.voice && reaction.speak) playClipAfterPhrase(reaction.line.url);
    if (!r.right && !r.free) {
      setMistakes((m) => m + 1);
      setQueue((q) => [...q, ex]); // try it again at the end
      if (!gentle) loseHeart();
    } else if (!r.right && ex.type === 'meaning') {
      setQueue((q) => [...q, { ...ex, isNew: false, options: shuffle(ex.options) }]);
    }
  };

  const next = () => {
    cutFeedback(); // Continue cuts off spoken feedback cleanly; the next clip waits a beat
    setResult(null);
    if (!gentle && heartsNow(progress).hearts <= 0) return setPhase('no-hearts');
    if (index + 1 >= queue.length) return finish();
    setIndex(index + 1);
    autoPlay(queue[index + 1]);
  };

  const finish = () => {
    const full = daily ? DAILY_XP : drill ? MISTAKES_XP : review ? REVIEW_XP : day1 ? LESSON_XP : LESSON_XP + (mistakes === 0 && hinted === 0 ? PERFECT_BONUS : 0);
    const xp = withHints(full, hinted);
    const before = todayXp(progress);
    const streakUp = before === 0; // first lesson today extends (or starts) the streak
    const xpBefore = progress.xp;
    completeLesson(lang, review || testUnit ? null : lessonId, xp);
    if (testUnit) recordTest(lang, testUnit.id, Math.max(0, (total.current - mistakes) / total.current));
    if (review) gainHeart();
    const line = coach.current.finished(mistakes === 0);
    setSummary({ xp, xpBefore, streakUp, goalReached: before < progress.goal && before + xp >= progress.goal, line, hinted, hintCost: full - xp });
    setPhase('done');
    sfx('complete');
    haptic('success');
    if (progress.voice) void playClip(line.url, 0.9);
  };

  const quit = () => {
    if (phase !== 'play' || index === 0 || confirm('Quit this lesson? Your progress in it will be lost.')) navigate(back);
  };

  if (phase === 'start') {
    const blocked = !gentle && hearts <= 0;
    return (
      <LessonFrame onQuit={quit} value={0} hearts={gentle ? null : hearts}>
        <div className="card start-card" style={{ gap: 14, marginTop: 24 }}>
          <span className="start-sticker" aria-hidden="true">
            {lesson ? <UnitArt unitId={lesson.unitId} size={88} /> : testUnit ? <Sticker name="trophy" size={88} /> : <Sticker name={drill ? 'pin' : daily ? 'sun' : 'bulb'} size={88} />}
          </span>
          <p className="muted start-kicker" data-testid="lesson-kind">{testUnit ? 'Step 3 · Test' : day1 ? 'Day 1 · Listen and repeat' : lesson ? 'Step 2 · Practice' : 'Practice'}</p>
          <div className="start-title">{daily ? 'Daily review' : drill ? 'Mistakes' : review ? 'Review your weak words' : testUnit ? `Test: ${testUnit.title}` : lesson!.title}</div>
          {testUnit && <p className="muted">Only words and rules from your Classes. Mistakes cost a heart here.</p>}
          {lesson && !day1 && <p className="muted">Only what your Class just taught. Hints are always there, and mistakes don't cost hearts.</p>}
          {day1 && <p className="muted">Hear each sound and say it back. Nothing is graded today.</p>}
          {daily && <p className="muted">Words and phrases you're about to forget, brought back at just the right time.</p>}
          {drill && (
            <>
              <p className="muted">
                Each word you got wrong comes up three times. Get it right {MISTAKE_RIGHTS} times here to clear it; a new mistake starts it
                over.
              </p>
              <MistakeChips lang={lang} items={drilled.current} />
            </>
          )}
          <p className="muted">
            {total.current} exercises · about {Math.max(2, Math.round(total.current / 4))} minutes · turn your sound on
          </p>
          {review && <p className="muted">Mistakes here don't cost hearts, and finishing earns one back.</p>}
          {lesson && (
            <button className="btn secondary" onClick={() => navigate(`/${lang}/class/${lesson.unitId}`)} data-testid="open-class">
              <Icon name="book" size={20} /> See the Class again
            </button>
          )}
          {progress.speaking && (
            <label className="chip-toggle speak-first" data-testid="speak-first">
              <input
                type="checkbox"
                checked={speakFirst}
                onChange={(e) => {
                  setPref('speakFirst', { ...progress.speakFirst, [lang]: e.target.checked });
                  const next = build(e.target.checked);
                  setQueue(next);
                  total.current = next.length;
                }}
              />{' '}
              Speaking-first: answer everything out loud
            </label>
          )}
          {speakFirst && progress.speaking && !isModelReady() && (
            <p className="muted small" data-testid="speak-first-needs-model">
              Speaking-first needs the free speech model. Download it in Settings › Speech checking; until then you tap your answers.
            </p>
          )}
          {tip && (
            <button className="btn secondary tip-open" onClick={() => setShowTip(true)}>
              <Icon name="book" size={20} /> <span className="grow">{tip.title.startsWith('Culture') ? tip.title.replace('Culture:', 'Culture note:') : `Grammar tip: ${tip.title}`}</span>
            </button>
          )}
          {blocked ? (
            <NoHeartsMessage lang={lang} />
          ) : (
            <button
              className="btn"
              onClick={() => {
                tapFeedback();
                unlockAudio(progress.voice ? allClips(lang) : []);
                started.current = Date.now();
                setPhase('play');
                autoPlay(ex);
              }}
            >
              Start
            </button>
          )}
          {lesson && !day1 && (
            <button className="btn secondary" onClick={() => navigate(`/${lang}/handsfree/${lesson.id}`)}>
              <Icon name="speaker" size={20} /> Hands-free (audio only)
            </button>
          )}
        </div>
        {tipSheet}
      </LessonFrame>
    );
  }

  if (phase === 'no-hearts') {
    return (
      <LessonFrame onQuit={() => navigate(back)} value={index / queue.length} hearts={0}>
        <div className="card" style={{ gap: 14, marginTop: 24, alignItems: 'center', textAlign: 'center' }}>
          <Icon name="heart" size={72} style={{ color: 'var(--faint)' }} />
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
    const perfect = mistakes === 0 && summary.hinted === 0;
    return (
      <main className="page fill celebrate">
        <Confetti pieces={perfect ? 90 : 60} />
        <div className="trophy-row">
          <div className={perfect ? 'trophy perfect' : 'trophy done'}>
            <Sticker name={perfect ? 'trophy' : 'party'} size={96} />
          </div>
          <Bird pose="dance" size={104} className="complete-bird" />
        </div>
        <h2 className="heading">{daily ? 'Daily review done!' : drill ? 'Mistakes practiced!' : review ? 'Review complete!' : testUnit ? 'Test complete!' : 'Lesson complete!'}</h2>
        <div className="cheer">
          <div className="cheer-text">{summary.line.text}</div>
          {summary.line.voice !== 'en' && <div className="muted">{summary.line.en}</div>}
        </div>
        <div className="stats">
          <Stat label="XP earned" value={<CountUp value={summary.xp} prefix="+" duration={1100} />} tone="accent" />
          <Stat label="Accuracy" value={<CountUp value={accuracy} duration={1100} />} unit="%" tone={accuracy >= 80 ? 'ok' : 'close'} />
          <Stat label="Time" value={minutes} unit=" min" tone="muted" />
        </div>
        <div className="card" style={{ textAlign: 'left' }}>
          <div className="row">
            <span className="grow streak-up">
              <Flame lit={streak(progress) > 0} size={26} /> {streak(progress)} day streak{summary.streakUp ? '!' : ''}
            </span>
            <span className="muted small">
              <Icon name="bolt" size={14} style={{ display: 'inline', color: 'var(--xp)', verticalAlign: '-2px' }} />{' '}
              <CountUp value={progress.xp} from={summary.xpBefore} duration={1200} /> XP
            </span>
          </div>
          <div className="row">
            <span className="grow muted small">Daily goal</span>
            <span className="muted small">
              {Math.min(today, progress.goal)}/{progress.goal} XP
            </span>
          </div>
          <ProgressBar value={today / progress.goal} tone="flame" />
          {summary.goalReached && (
            <p className="row" style={{ margin: 0, color: 'var(--ok)', fontWeight: 700 }}>
              <Icon name="target" size={18} /> Daily goal reached!
            </p>
          )}
          {perfect && !review && <p className="muted small">No mistakes: +{PERFECT_BONUS} bonus XP.</p>}
          {summary.hinted > 0 && (
            <p className="muted small" data-testid="hint-xp">
              {summary.hinted} {summary.hinted === 1 ? 'answer' : 'answers'} with a hint: −{summary.hintCost} XP. {summary.hinted === 1 ? "It's" : "They're"} in your Mistakes review.
            </p>
          )}
          {review && <p className="muted small">+1 heart for practicing.</p>}
          {daily && <DailyNext lang={lang} />}
          {testUnit && <TestRoleplays lang={lang} unitId={testUnit.id} />}
          {drill && <MistakesNext lang={lang} items={drilled.current} />}
        </div>
        <button
          className="btn"
          onClick={() => {
            tapFeedback();
            navigate(back, { direction: 'back' });
          }}
        >
          Continue
        </button>
      </main>
    );
  }

  return (
    <LessonFrame
      onQuit={quit}
      value={index / queue.length}
      hearts={gentle ? null : hearts}
      feedback={result && !result.skipped ? (result.right ? 'ok' : 'bad') : undefined}
      action={tipButton}
    >
      {result?.right && !result.skipped && <div key={index} className="flash ok" aria-hidden="true" />}
      {/* Typing, tapping or a key press starts the hint wait over. */}
      <div className="exercise" onPointerDown={hint.poke} onKeyDown={hint.poke} onInput={hint.poke}>
        <ExerciseView key={index} ex={ex} lang={lang} answered={result !== null} onSubmit={submit} onBusy={setBusy} onNext={next} />
      </div>
      {hints && !result && <HintBubble key={index} hints={hints} level={hint.level} onNext={hint.next} />}
      {result && <ResultBanner ex={ex} result={result} lang={lang} onContinue={next} />}
      {tipSheet}
    </LessonFrame>
  );
}

/** After a unit test: the unit's role-plays, the other half of the Test. */
function TestRoleplays({ lang, unitId }: { lang: Lang; unitId: string }) {
  const list = unitRoleplays(lang, unitId)
    .map((id) => getScenario(lang, id))
    .filter((s) => !!s);
  if (!list.length) return null;
  return (
    <div className="card test-roleplays" data-testid="test-roleplays">
      <div className="card-title">Now the role-play</div>
      <p className="muted small">You'll hear the words you need first.</p>
      {list.map((s) => (
        <button key={s!.id} className="btn secondary" onClick={() => navigate(`/${lang}/roleplay/${s!.id}`)}>
          <Icon name="chat" size={20} /> <span className="grow">{s!.en}</span>
        </button>
      ))}
    </div>
  );
}

/** After a daily review: what's left today, or when the next one is. */
function DailyNext({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const left = dueItems(progress, lang).length;
  const tomorrow = dueTomorrow(progress, lang);
  return (
    <p className="muted small" data-testid="daily-next">
      {left > 0
        ? `${left} more word${left === 1 ? '' : 's'} due today.`
        : tomorrow > 0
          ? `All caught up. ${tomorrow} word${tomorrow === 1 ? '' : 's'} come${tomorrow === 1 ? 's' : ''} back tomorrow.`
          : 'All caught up for today.'}
    </p>
  );
}

/** The session's words, each with dots for the right answers still needed to clear it. */
function MistakeChips({ lang, items }: { lang: Lang; items: Item[] }) {
  const progress = useProgress();
  return (
    <ul className="mistake-chips" data-testid="mistake-chips">
      {items.map((item) => {
        const left = progress.mistakes[`${lang}:${item.id}`]?.left ?? 0;
        return (
          <li key={item.id} className="mistake-chip">
            <span lang={lang}>{item.text}</span>
            <span className="dots" aria-label={left ? `${left} more to clear` : 'cleared'}>
              {Array.from({ length: MISTAKE_RIGHTS }, (_, i) => (
                <span key={i} className={i < MISTAKE_RIGHTS - left ? 'dot on' : 'dot'} />
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** After a Mistakes session: what got cleared and what's left. */
function MistakesNext({ lang, items }: { lang: Lang; items: Item[] }) {
  const progress = useProgress();
  const cleared = items.filter((i) => !progress.mistakes[`${lang}:${i.id}`]).length;
  const left = mistakeItems(progress, lang).length;
  return (
    <>
      <p className="muted small" data-testid="mistakes-next">
        {cleared ? `${cleared} word${cleared === 1 ? '' : 's'} cleared. ` : ''}
        {left ? `${left} still on your list.` : 'Your mistakes list is empty!'}
      </p>
      <MistakeChips lang={lang} items={items} />
    </>
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

export function LessonFrame({
  onQuit,
  value,
  hearts,
  feedback,
  action,
  children,
}: {
  onQuit: () => void;
  value: number;
  hearts: number | null;
  feedback?: 'ok' | 'bad';
  /** An extra button before the hearts (the grammar tip). */
  action?: ReactNode;
  children: ReactNode;
}) {
  // Sound effects and spoken feedback, on or off together (the same switches as in Settings).
  const { sfx: sounds, voice } = useProgress();
  const muted = !sounds && !voice;
  // Shake the heart counter when one is lost.
  const prev = useRef(hearts);
  const lost = hearts !== null && prev.current !== null && hearts < prev.current;
  useEffect(() => {
    prev.current = hearts;
  }, [hearts]);
  return (
    <>
      <header className="header lesson-top">
        <div className="header-bar">
          <button className="icon-btn back" aria-label="Quit lesson" onClick={onQuit}>
            <Icon name="close" size={24} />
          </button>
          <div className="grow">
            <ProgressBar value={value} />
          </div>
          {action}
          <button
            className="icon-btn"
            aria-label={muted ? 'Turn sounds on' : 'Mute sounds'}
            aria-pressed={muted}
            data-testid="lesson-mute"
            onClick={() => {
              setPref('sfx', muted);
              setPref('voice', muted);
            }}
          >
            <Icon name={muted ? 'mute' : 'speaker'} size={22} />
          </button>
          <span key={hearts ?? 'inf'} className={lost ? 'hearts lost' : 'hearts'} aria-label={hearts === null ? 'Practice, no hearts' : `${hearts} hearts`}>
            {hearts === null ? (
              <Icon name="review" size={22} style={{ color: 'var(--accent)' }} />
            ) : (
              <>
                <Icon name="heart" size={22} /> {hearts}
              </>
            )}
          </span>
        </div>
      </header>
      <main className="page fill lesson" data-feedback={feedback}>
        <img className="lesson-watermark" src="brand/mark.png" alt="" aria-hidden="true" />
        {children}
      </main>
    </>
  );
}

function Stat({ label, value, unit = '', tone }: { label: string; value: ReactNode; unit?: string; tone: string }) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-value">
        {value}
        {unit}
      </div>
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
    <div className="sound-row">
      <button className={big ? 'btn sound-big' : 'btn secondary sound-sm'} onClick={() => playPhrase(item.audio)} aria-label="Play">
        <Icon name="speaker" size={big ? 40 : 24} />
      </button>
      <button className={big ? 'btn secondary sound-slow' : 'btn secondary sound-sm'} onClick={() => playPhrase(item.audio, true)} aria-label="Play slowly">
        <Icon name="speaker" size={big ? 26 : 18} />
        Slow
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

type ViewProps = {
  ex: Exercise;
  lang: Lang;
  answered: boolean;
  onSubmit: (r: Result) => void;
  /** Adds an "I don't know" button (the placement test, where guessing would skew the result). */
  onSkip?: () => void;
  /** Speaking: you're talking, or it's being checked (hints wait until you're done). */
  onBusy?: (busy: boolean) => void;
  /** Go on without a grade (listen and repeat). */
  onNext?: () => void;
};

export function ExerciseView(props: ViewProps) {
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
    case 'fact':
      return <FactExercise {...props} />;
    case 'repeat':
      return <RepeatExercise {...props} />;
  }
}

/** Listen and repeat: hear it, say it back. No grade, no wrong answers (Day 1). */
function RepeatExercise({ ex, onNext }: ViewProps) {
  if (ex.type !== 'repeat') return null;
  const { item } = ex;
  return (
    <>
      <p className="prompt">
        <span className="chip-new">Listen and repeat</span> Say it after the recording
      </p>
      <div className="card repeat-card" data-testid="repeat-card">
        <Target item={item} size={46} />
        <p className="muted">{item.en}</p>
        <SoundButtons item={item} big />
      </div>
      <div className="lesson-foot">
        <button className="btn" onClick={onNext} data-testid="repeat-next">
          I said it
        </button>
      </div>
    </>
  );
}

/** A culture lesson's quiz question: pick the answer. Free (no hearts), and shows the answer if missed. */
function FactExercise({ ex, answered, onSubmit }: ViewProps) {
  const [picked, setPicked] = useState<number | null>(null);
  if (ex.type !== 'fact') return null;
  const correct = ex.options.indexOf(ex.answer);
  return (
    <>
      <p className="prompt">
        <span className="chip-new culture">Culture quiz</span>
      </p>
      <div className="fact-q">{ex.q}</div>
      <div className="options">
        {ex.options.map((label, i) => (
          <button
            key={i}
            className={!answered ? (i === picked ? 'btn secondary option selected' : 'btn secondary option') : i === correct ? 'btn secondary option picked-right' : i === picked ? 'btn secondary option picked-wrong' : 'btn secondary option faded'}
            disabled={answered}
            onClick={() => {
              tapFeedback();
              setPicked(i);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {!answered && (
        <CheckBar disabled={picked === null} onCheck={() => onSubmit({ right: picked === correct, free: true, note: picked === correct ? undefined : `Answer: ${ex.answer}` })} />
      )}
    </>
  );
}

function ChoiceExercise({ ex, answered, onSubmit, onSkip }: ViewProps) {
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
        {labels.map((label, i) => {
          // "How do you say…": each answer says itself when tapped, so you hear what you picked.
          const spoken = ex.type === 'translate' ? ex.options[i] : null;
          return (
            <button
              key={i}
              className={`${optionClass(i)}${spoken ? ' with-sound' : ''}`}
              disabled={answered}
              onClick={() => {
                tapFeedback();
                setPicked(i);
                if (spoken) playPhrase(spoken.audio);
              }}
            >
              {spoken && (
                <span className="option-speaker" aria-hidden="true">
                  <Icon name="speaker" size={20} />
                </span>
              )}
              <span className="option-text">{label}</span>
            </button>
          );
        })}
      </div>
      {!answered && (
        <CheckBar
          disabled={picked === null}
          onCheck={() => onSubmit({ right: picked === correct, free: ex.type === 'meaning' && ex.isNew })}
        >
          {onSkip && (
            <button className="btn secondary" onClick={onSkip}>
              I don't know
            </button>
          )}
        </CheckBar>
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
          <button key={bankIndex} className="tile" disabled={answered} onClick={() => {
              tapFeedback();
              setPlaced(placed.filter((_, j) => j !== i));
            }}>
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
            onClick={() => {
              tapFeedback();
              setPlaced([...placed, i]);
            }}
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
    haptic('light');
    const next = { ...sel, [side]: item.id };
    if (!next.left || !next.right) return setSel(next);
    setSel({});
    if (next.left === next.right) {
      sfx('correct');
      const done = [...matched, item.id];
      setMatched(done);
      if (done.length === items.length) onSubmit({ right: true, note: mistakes.current ? undefined : 'All pairs right first time.' });
    } else {
      mistakes.current++;
      sfx('wrong');
      haptic('error');
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

function SpeakExercise({ ex, lang, answered, onSubmit, onBusy }: ViewProps) {
  const [state, setState] = useState<'idle' | 'listening' | 'heard' | 'checking'>('idle');
  useEffect(() => {
    onBusy?.(state !== 'idle');
    return () => onBusy?.(false);
  }, [state]);
  const [heard, setHeard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recording = useRef<Recording | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => () => recording.current?.stop(), []);
  if (ex.type !== 'speak') return null;

  const onMic = async () => {
    if (state === 'listening' || state === 'heard') return recording.current?.stop();
    setError(null);
    try {
      tapFeedback();
      const rec = await startRecording(() => setState('heard'));
      recording.current = rec;
      setAnalyser(rec.analyser);
      setState('listening');
      const audio = await rec.done;
      recording.current = null;
      setAnalyser(null);
      if (!audio.length) throw new Error("I didn't hear anything. Tap the mic and speak a little louder.");
      // Read the pitch first: transcribe() hands the samples over to the Whisper worker.
      const tones = lang === 'zh' ? toContour(pitchTrack(audio)) : undefined;
      setState('checking');
      const text = await transcribe(audio, lang);
      const c = compare(ex.item.text, text, lang, ex.item.alt);
      const score = c.score;
      setHeard(text);
      setState('idle');
      onSubmit({ right: score >= 0.5, free: true, close: score >= 0.5 && score < 0.85, note: `Whisper heard: “${text || '(nothing)'}” · ${Math.round(score * 100)}%`, tones, tokens: c.tokens });
    } catch (e) {
      recording.current = null;
      setAnalyser(null);
      setState('idle');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const busy = state !== 'idle';
  // Recall (speaking-first): say it from the English; the words and the audio are a tap away.
  const hidden = ex.recall && !shown && !answered;
  return (
    <>
      <p className="prompt">{ex.recall ? 'Say it in ' + LANGS.find((l) => l.id === lang)!.name : 'Say it out loud'}</p>
      {hidden ? (
        <div className="recall">
          <div className="recall-en">“{ex.item.en}”</div>
          <button className="link-btn" onClick={() => setShown(true)} data-testid="recall-show">
            Show the words
          </button>
        </div>
      ) : (
        <div className="row">
          <div className="grow">
            <Target item={ex.item} size={34} />
            <p className="english">{ex.item.en}</p>
          </div>
          <SoundButtons item={ex.item} />
        </div>
      )}
      <button
        className={state === 'checking' ? 'mic checking' : busy ? 'mic on' : 'mic'}
        onClick={onMic}
        disabled={answered || state === 'checking'}
        aria-label={busy ? 'Stop recording' : 'Start recording'}
      >
        {state === 'checking' ? <span className="spinner" /> : <Icon name={busy ? 'stop' : 'mic'} size={44} />}
      </button>
      <Waveform analyser={analyser} />
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

function ResultBanner({ ex, result, lang, onContinue }: { ex: Exercise; result: Result; lang: Lang; onContinue: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus({ preventScroll: true }), []);
  const item = ex.type === 'match' || ex.type === 'fact' ? null : ex.item;
  const line = result.reaction?.line;
  const streak = result.reaction?.streak;
  const showAnswer = item && !result.skipped && (!result.right || ex.type === 'meaning' || result.note);
  const tone = result.skipped ? 'neutral' : result.right ? (streak ? 'ok streak' : 'ok') : 'bad';
  return (
    <div className={`banner ${tone}`} role="status">
      {!result.skipped && <Bird pose={result.right ? (streak ? 'streak' : 'cheer') : 'oops'} size={58} className="banner-bird" />}
      {streak && (
        <div className="streak-chip">
          <Flame lit size={18} /> {streak} in a row!
        </div>
      )}
      <div className="banner-title">
        {result.skipped ? (
          'Skipped'
        ) : (
          <>
            <span className="banner-badge">
              <Icon name={result.right ? 'check' : 'close'} size={20} />
              {result.right && <Burst count={streak ? 14 : 10} />}
            </span>
            {line?.text}
          </>
        )}
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
      {result.tokens && result.tokens.length > 0 && <Heatmap tokens={result.tokens} lang={lang} />}
      {result.note && <div className="small">{result.note}</div>}
      {item && result.tones !== undefined && (
        <div className="banner-chart">
          <ToneChart native={item.audio} mine={result.tones} text={item.text} pinyin={item.pinyin} />
        </div>
      )}
      <button ref={button} className="btn" onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
