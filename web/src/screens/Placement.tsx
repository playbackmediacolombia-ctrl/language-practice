import { useRef, useState } from 'react';
import { unlockAudio } from '../lib/audio';
import { type Lang, LANGS } from '../lib/content';
import { getLessons, getPath, lessonStates } from '../lib/course';
import { haptic, sfx, tapFeedback } from '../lib/fx';
import { afterStage, applyPlacement, nextStage, PASS, PER_STAGE, type Search, stageQuestions, startSearch } from '../lib/placement';
import { getProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { Confetti, Icon } from '../ui';
import { autoPlay, ExerciseView, LessonFrame } from './Lesson';
import { showCurrentLesson } from './Path';

type Round = { stage: number; questions: ReturnType<typeof stageQuestions>; index: number; right: number; wrong: number };

const MAX_ROUNDS = 4; // log2 of 8 stages, rounded up

/** Learn tab › placement test: finds your level and unlocks the path below it. */
export default function Placement({ lang }: { lang: Lang }) {
  const name = LANGS.find((l) => l.id === lang)!.name;
  const stages = getPath(lang);
  const [phase, setPhase] = useState<'intro' | 'test' | 'done'>('intro');
  const [search, setSearch] = useState<Search>(() => startSearch(lang));
  const [round, setRound] = useState<Round | null>(null);
  const [rounds, setRounds] = useState(0);
  const [result, setResult] = useState<{ known: number; unlocked: number; hadPath: boolean } | null>(null);
  const asked = useRef(0);

  const startRound = (s: Search) => {
    const stage = nextStage(s);
    if (stage === null) return finish(s);
    const questions = stageQuestions(lang, stage);
    setRound({ stage, questions, index: 0, right: 0, wrong: 0 });
    setRounds((n) => n + 1);
    autoPlay(questions[0]);
  };

  const finish = (s: Search) => {
    const p = getProgress();
    const hadPath = !!p.placement[lang] || getLessons(lang).some((l) => p.lessons[`${lang}:${l.id}`]);
    const unlocked = applyPlacement(lang, s.lo);
    setResult({ known: s.lo, unlocked, hadPath });
    setPhase('done');
    sfx('complete');
    haptic('success');
  };

  const answer = (right: boolean) => {
    if (!round) return;
    asked.current++;
    tapFeedback();
    const next = { ...round, right: round.right + (right ? 1 : 0), wrong: round.wrong + (right ? 0 : 1) };
    // Stop the round as soon as its outcome can't change.
    const passed = next.right >= PASS;
    const failed = next.wrong > PER_STAGE - PASS;
    if (passed || failed) {
      const s = afterStage(search, round.stage, passed);
      setSearch(s);
      return startRound(s);
    }
    next.index++;
    setRound(next);
    autoPlay(next.questions[next.index]);
  };

  const quit = () => {
    if (phase !== 'test' || confirm('Stop the placement test? Nothing will be unlocked.')) navigate(`/${lang}`, { direction: 'back' });
  };

  if (phase === 'intro') {
    return (
      <LessonFrame onQuit={quit} value={0} hearts={null}>
        <div className="card" style={{ gap: 14, marginTop: 24 }}>
          <p className="muted">Placement test</p>
          <div style={{ fontSize: 26, fontWeight: 700 }}>Find your {name} level</div>
          <p className="muted">
            About a dozen quick questions that get harder when you're right and easier when you're not. Every lesson
            below your level is unlocked, so you can start where it's interesting.
          </p>
          <p className="muted">Tap "I don't know" instead of guessing: it gives a truer result. Nothing you've already unlocked gets locked again.</p>
          <button
            className="btn"
            onClick={() => {
              tapFeedback();
              unlockAudio([]);
              setPhase('test');
              startRound(search);
            }}
          >
            Start
          </button>
        </div>
      </LessonFrame>
    );
  }

  if (phase === 'done' && result) {
    const placedAt = stages[result.known + 1]; // the first stage not known; undefined if all passed
    const states = lessonStates(getProgress(), lang);
    const next = getLessons(lang).find((l) => states.get(l.id) === 'current') ?? getLessons(lang).find((l) => states.get(l.id) === 'open');
    return (
      <main className="page fill celebrate" data-testid="placement-result">
        {result.known >= 0 && <Confetti pieces={60} />}
        <div className="trophy done">
          <Icon name="target" size={72} />
        </div>
        <h2 className="heading">{placedAt ? `${placedAt.level}` : 'Fluent!'}</h2>
        <div className="card" style={{ textAlign: 'left', gap: 8 }}>
          {placedAt ? (
            <p style={{ margin: 0 }}>
              Your level is <b>{placedAt.level}</b>: start at stage {result.known + 2}, <b>{placedAt.title}</b>.
            </p>
          ) : (
            <p style={{ margin: 0 }}>You know every stage of the path. All of it is unlocked: dip in anywhere.</p>
          )}
          <p className="muted small" style={{ margin: 0 }}>
            {result.unlocked > 0
              ? `${result.unlocked} lesson${result.unlocked === 1 ? '' : 's'} unlocked. They stay open to practice whenever you like.`
              : result.hadPath
                ? 'Your path already goes this far or further, so nothing changed.'
                : 'Start from the beginning: the first stages will come quickly.'}
          </p>
        </div>
        {next && (
          <button
            className="btn"
            onClick={() => {
              tapFeedback();
              navigate(`/${lang}/learn/${next.id}`);
            }}
          >
            Start “{next.title}”
          </button>
        )}
        <button
          className="btn secondary"
          onClick={() => {
            showCurrentLesson();
            navigate(`/${lang}`, { direction: 'back' });
          }}
        >
          Back to the path
        </button>
      </main>
    );
  }

  if (!round) return null;
  const ex = round.questions[round.index];
  // Progress: rounds done out of the most there can be, plus this round's share.
  const value = Math.min(1, (rounds - 1 + (round.right + round.wrong) / PER_STAGE) / MAX_ROUNDS);
  if (location.search.includes('test')) Object.assign(window, { __exercise: ex, __stage: round.stage });
  return (
    <LessonFrame onQuit={quit} value={value} hearts={null}>
      <p className="muted small" style={{ margin: 0 }} data-testid="placement-stage">
        Question {asked.current + 1} · {stages[round.stage].level}
      </p>
      <ExerciseView
        key={asked.current}
        ex={ex}
        lang={lang}
        answered={false}
        onSubmit={(r) => answer(r.right)}
        onSkip={() => answer(false)}
      />
    </LessonFrame>
  );
}
