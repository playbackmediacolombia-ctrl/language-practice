import { type CSSProperties, Fragment, useEffect, useRef, useState } from 'react';
import { Flag, Sticker, UnitArt } from '../art';
import { Bird, BIRD_POSES } from '../Bird';
import { playPhrase } from '../lib/audio';
import { ensureAudio } from '../lib/audioPacks';
import { type Lang, LANGS } from '../lib/content';
import { currentLevel, getLessons, getLevels, getPath, hasStarted, type Lesson, lessonStates, weakItems } from '../lib/course';
import { haptic, reducedMotion, sfx, tapFeedback } from '../lib/fx';
import { newHomeIsLive, onOldAddress } from '../lib/move';
import { CHEST_XP, heartsNow, LESSON_XP, PERFECT_BONUS, lessonDone, openChest, type Progress, streak, todayXp, useProgress, weakness } from '../lib/progress';
import { navigate } from '../lib/router';
import { isModelReady } from '../lib/whisper';
import { wordOfDay } from '../lib/wordOfDay';
import { CountUp, Flame, Icon, ProgressBar } from '../ui';
import { InstallCard } from '../InstallCard';
import { AdultGate } from './AdultGate';
import { LevelTiles } from './Level';

/** The Learn tab's top bar: your language (tap to switch), streak, XP and hearts. */
function TopBar({ lang, progress, onFlag }: { lang: Lang; progress: Progress; onFlag: () => void }) {
  const days = streak(progress);
  const name = LANGS.find((l) => l.id === lang)!.name;
  return (
    <header className="header topbar">
      <div className="header-bar">
        <button className="flag-btn" onClick={onFlag} aria-label={`${name}. Change language`} data-testid="flag-btn">
          <Flag lang={lang} size={34} />
        </button>
        <span className="stat-pill streak" title="Day streak" aria-label={`${days}-day streak`}>
          <Flame lit={days > 0} size={26} /> <CountUp value={days} from={days} />
        </span>
        <span className="stat-pill xp" title="Total XP" aria-label={`${progress.xp} XP`}>
          <Icon name="bolt" className="bolt" size={26} /> <CountUp value={progress.xp} from={progress.xp} />
        </span>
        <span className="stat-pill hearts" title="Hearts" aria-label={`${heartsNow(progress).hearts} hearts`}>
          <Icon name="heart" className="heart" size={26} /> {heartsNow(progress).hearts}
        </span>
      </div>
    </header>
  );
}

/** Today's goal: a chunky bar that fills, and a cheer once it's full. */
function DailyGoal({ progress }: { progress: Progress }) {
  const today = todayXp(progress);
  const done = today >= progress.goal;
  return (
    <div className={done ? 'card goal-card done' : 'card goal-card'} data-testid="daily-goal">
      <div className="row">
        <span className="goal-icon" aria-hidden="true">
          <Icon name={done ? 'check' : 'target'} size={22} />
        </span>
        <span className="grow goal-text">{done ? 'Daily goal reached!' : 'Daily goal'}</span>
        <span className="goal-count">
          {Math.min(today, progress.goal)}/{progress.goal} XP
        </span>
        {done && <Bird pose="wave" size={46} className="goal-bird" />}
      </div>
      <ProgressBar value={today / progress.goal} tone="flame" />
    </div>
  );
}

/** Word of the day: a word from your level, its meaning and a sentence that uses it, with audio. */
function WordOfTheDay({ lang, progress }: { lang: Lang; progress: Progress }) {
  const today = wordOfDay(progress, lang);
  if (!today) return null;
  const { word, example } = today;
  return (
    <section className="card word-day" data-testid="word-of-day" aria-label="Word of the day">
      <div className="word-day-kicker">Word of the day</div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="word-day-word" lang={lang}>
            {word.text}
          </div>
          {word.pinyin && <div className="pinyin">{word.pinyin}</div>}
          <div className="word-day-en">{word.en}</div>
        </div>
        <button className="btn secondary sound-sm" onClick={() => playPhrase(word.audio)} aria-label={`Hear “${word.text}”`} data-testid="word-day-play">
          <Icon name="speaker" size={22} />
        </button>
      </div>
      {example && (
        <button className="word-day-example" onClick={() => playPhrase(example.audio)} aria-label={`Hear the example: ${example.text}`}>
          <Icon name="speaker" size={18} />
          <span className="grow">
            <span className="word-day-sentence" lang={lang}>
              {example.text}
            </span>
            {example.pinyin && <span className="pinyin small">{example.pinyin}</span>}
            <span className="muted small">{example.en}</span>
          </span>
        </button>
      )}
    </section>
  );
}

/** The languages as big, bright tiles with their flags. */
export function LangTiles({ current, onPick }: { current?: Lang; onPick: (l: Lang) => void }) {
  return (
    <div className="lang-tiles">
      {LANGS.map((l) => (
        <button
          key={l.id}
          className={`lang-tile lang-tile-${l.id}${l.id === current ? ' active' : ''}`}
          aria-current={l.id === current ? 'true' : undefined}
          onClick={() => {
            tapFeedback();
            onPick(l.id);
          }}
        >
          <Flag lang={l.id} size={56} />
          <span className="lang-tile-text">
            <span className="lang-tile-name">{l.name}</span>
            <span className="lang-tile-native" lang={l.id}>
              {l.native}
            </span>
          </span>
          {l.id === current ? <Icon name="check" size={24} /> : <Icon name="chevron" size={22} />}
        </button>
      ))}
    </div>
  );
}

/** Switch the language shown on the Learn and Practice tabs. */
export function LangSwitcher({ lang, to }: { lang: Lang; to: (l: Lang) => string }) {
  return (
    <div className="lang-switch" role="tablist" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.id}
          role="tab"
          aria-selected={l.id === lang}
          className={l.id === lang ? 'lang-chip active' : 'lang-chip'}
          onClick={() => {
            if (l.id === lang) return;
            tapFeedback();
            navigate(to(l.id), { direction: 'tab' });
          }}
        >
          <Flag lang={l.id} size={26} />
          {l.name}
        </button>
      ))}
    </div>
  );
}

/** How far each lesson node sits from the middle, so the path winds back and forth. */
const WIND = [0, 46, 74, 46, 0, -46, -74, -46];

/** Unit colors, from the logo, in turn. */
const UNIT_TONES = ['blue', 'orange', 'sky', 'sun', 'navy', 'red'];

type CoinKind = 'star' | 'character' | 'speak' | 'story' | 'review' | 'locked';

/** The kind of lesson a coin shows: sounds are speaking, Mandarin's early units are characters, story and news units are stories. */
function lessonKind(lang: Lang, stageId: string, unitId: string, title: string): CoinKind {
  if (stageId === 'sounds') return 'speak';
  if (unitId === 'u10' || unitId === 'u15' || /stor|news|read/i.test(title)) return 'story';
  if (lang === 'zh' && (stageId === 'words' || stageId === 'sentences')) return 'character';
  return 'star';
}

function CoinIcon({ kind }: { kind: CoinKind }) {
  if (kind === 'character')
    return (
      <span className="coin-glyph" aria-hidden="true">
        字
      </span>
    );
  const icon = { star: 'star', speak: 'mic', story: 'book', review: 'review', locked: 'lock' } as const;
  return <Icon name={icon[kind]} size={kind === 'locked' ? 26 : 32} />;
}

/** The ring around your current lesson: how much of its unit is done. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  return (
    <svg className="coin-ring" viewBox="0 0 112 112" aria-hidden="true">
      <circle cx="56" cy="56" r={r} className="coin-ring-track" />
      <circle cx="56" cy="56" r={r} className="coin-ring-fill" strokeDasharray={`${(c * done) / Math.max(1, total)} ${c}`} transform="rotate(-90 56 56)" />
    </svg>
  );
}

/** A gold chest with a navy lock; open, its lid tips back over a glow of coins. */
function ChestArt({ open }: { open: boolean }) {
  return (
    <svg className="chest-art" width={76} height={68} viewBox="0 0 80 72" aria-hidden="true">
      {open && <ellipse className="chest-glow" cx="40" cy="32" rx="30" ry="16" />}
      {open && (
        <g className="chest-coins">
          <circle cx="30" cy="34" r="6" />
          <circle cx="42" cy="31" r="6" />
          <circle cx="52" cy="35" r="5.5" />
        </g>
      )}
      <rect x="10" y="34" width="60" height="32" rx="7" className="chest-body" />
      <rect x="10" y="34" width="60" height="7" className="chest-rim" />
      <rect x="36" y="34" width="8" height="32" className="chest-band" />
      <g className="chest-lid" transform={open ? 'rotate(-32 12 34)' : undefined}>
        <path d="M10 36 Q10 13 40 13 Q70 13 70 36 Z" className="chest-lid-top" />
        <rect x="36" y="13.5" width="8" height="22.5" className="chest-lid-band" />
        <path d="M18 22 Q26 17 36 16" className="chest-shine" />
      </g>
      {!open && <rect x="33" y="31" width="14" height="13" rx="3.5" className="chest-lock" />}
      {!open && <circle cx="40" cy="37" r="2.2" className="chest-keyhole" />}
    </svg>
  );
}

/** A reward chest halfway along a unit: locked until the lessons before it are done, then it wiggles; it gives its XP once. */
function Chest({ lang, unitId, ready, opened }: { lang: Lang; unitId: string; ready: boolean; opened: boolean }) {
  const [burst, setBurst] = useState(false);
  const state = opened ? 'opened' : ready ? 'ready' : 'locked';
  return (
    <>
      <button
        className={`path-chest ${state}`}
        disabled={state !== 'ready'}
        data-testid="reward-chest"
        data-state={state}
        aria-label={opened ? 'Reward chest, opened' : ready ? `Open the reward chest: +${CHEST_XP} XP` : 'Reward chest: finish the lessons before it to open it'}
        onClick={() => {
          if (!openChest(lang, unitId)) return;
          sfx('complete');
          haptic('success');
          setBurst(true);
          setTimeout(() => setBurst(false), 1900);
        }}
      >
        <ChestArt open={opened} />
      </button>
      {burst && (
        <span className="chest-burst" role="status" data-testid="chest-xp">
          <span className="chest-rays" aria-hidden="true" />+{CHEST_XP} XP
        </span>
      )}
    </>
  );
}

/** What a lesson covers, in a line: how many words or sounds, and the first few. */
function covers(lesson: Lesson): string {
  if (lesson.quiz?.length) return 'Culture tips, useful phrases and a short quiz';
  const sounds = lesson.items.every((i) => i.kind === 'sound');
  const first = lesson.items.slice(0, 3).map((i) => i.text);
  const more = lesson.items.length > first.length ? '\u00a0…' : '';
  return `${lesson.items.length} ${sounds ? 'sounds' : 'words and phrases'}: ${first.join(' · ')}${more}`;
}

/** Tapping a coin opens this under it: the lesson's name, what it covers and its XP, and Start. */
function LessonPop({ lesson, unitLabel, index, total, done, x, onStart }: { lesson: Lesson; unitLabel: string; index: number; total: number; done: boolean; x: number; onStart: () => void }) {
  const box = useRef<HTMLLIElement>(null);
  const start = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    start.current?.focus({ preventScroll: true });
    box.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, []);
  return (
    <li ref={box} className="lesson-pop" style={{ '--x': `${x}px` } as CSSProperties} data-testid="lesson-pop" role="group" aria-label={lesson.title}>
      <div className="lesson-pop-kicker">
        {unitLabel} · Lesson {index + 1} of {total}
      </div>
      <div className="lesson-pop-title">{lesson.title}</div>
      <p className="lesson-pop-covers">{covers(lesson)}</p>
      <button ref={start} className="btn lesson-pop-start" data-testid="lesson-start" onClick={onStart}>
        {done ? 'Practice again' : 'Start'} <span className="lesson-pop-xp">+{LESSON_XP} XP</span>
      </button>
      <p className="lesson-pop-bonus">+{PERFECT_BONUS} more if you make no mistakes</p>
    </li>
  );
}

type Stuck = { id: string; label: string; title: string; tone: string; count: string };

/** Which unit you're scrolling through, once its own banner has gone under the top bar. */
function useStuckUnit(): Stuck | null {
  const [stuck, setStuck] = useState<Stuck | null>(null);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const top = (document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0) + 4;
      let found: HTMLElement | null = null;
      for (const el of document.querySelectorAll<HTMLElement>('.card.unit[data-unit]')) {
        const box = el.getBoundingClientRect();
        if (box.top > top) break;
        if (box.bottom > top + 60) found = el;
      }
      const banner = found?.querySelector('.unit-banner');
      const d = found?.dataset;
      setStuck((cur) => {
        if (!found || !d || !banner || banner.getBoundingClientRect().bottom > top) return null;
        if (cur && cur.id === d.unit && cur.count === d.count) return cur;
        return { id: d.unit!, label: d.label!, title: d.title!, tone: d.tone!, count: d.count! };
      });
    };
    const onScroll = () => (frame ||= requestAnimationFrame(check));
    addEventListener('scroll', onScroll, { passive: true });
    check();
    return () => {
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return stuck;
}

/** Whether your current lesson is off screen, and which way it is. */
function useCurrentAway(id: string | undefined): 'up' | 'down' | null {
  const [away, setAway] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const box = id && document.querySelector(`.lesson-node[data-lesson="${id}"]`)?.getBoundingClientRect();
      setAway(!box ? null : box.bottom < 60 ? 'up' : box.top > innerHeight - 80 ? 'down' : null);
    };
    const onScroll = () => (frame ||= requestAnimationFrame(check));
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    check();
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [id]);
  return away;
}

let scrollToCurrent = false;
/** The next time the path opens, scroll to the current lesson (after a placement test moved it far down). */
export const showCurrentLesson = () => (scrollToCurrent = true);

/** Time left today, roughly: "3 h 20 min", or "under an hour". */
function untilMidnight(now = new Date()): string {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const mins = Math.floor((midnight.getTime() - now.getTime()) / 60000);
  return mins < 60 ? 'under an hour' : `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

/** A streak that hasn't been kept up today: how long is left, and a way to keep it. */
function StreakWarning({ progress, onPractice, onRemind }: { progress: Progress; onPractice: () => void; onRemind: () => void }) {
  const days = streak(progress);
  if (days === 0 || todayXp(progress) > 0) return null;
  return (
    <div className="card streak-warning" role="status" data-testid="streak-warning">
      <div className="row">
        <Flame lit size={30} />
        <div className="grow">
          <div style={{ fontWeight: 750, fontSize: 17 }}>
            Your {days}-day streak ends at midnight
          </div>
          <p className="muted small">One short lesson keeps it going. {untilMidnight()} left today.</p>
        </div>
      </div>
      <div className="row">
        <button className="btn flex" onClick={onPractice} data-testid="streak-practice">
          Practice now
        </button>
        <button className="btn secondary flex" onClick={onRemind}>
          <Icon name="bell" size={18} /> Remind me
        </button>
      </div>
    </div>
  );
}

export function Path({ lang }: { lang: Lang }) {
  const progress = useProgress();
  useEffect(() => ensureAudio(lang), [lang]); // this language's recordings, for offline
  useEffect(() => {
    if (!scrollToCurrent) return;
    scrollToCurrent = false;
    (document.querySelector('.lesson-node.current') ?? document.querySelector('.lesson-node.open'))?.scrollIntoView({ block: 'center' });
  }, []);
  const lessons = getLessons(lang);
  const states = lessonStates(progress, lang);
  const learned = lessons.filter((l) => lessonDone(progress, lang, l.id)).flatMap((l) => l.items);
  const weak = weakItems(progress, lang, learned.length).filter((i) => weakness(progress, lang, i.id) < 3);
  // A language not started yet opens with Pick your level; afterwards a bar shows the level to change it.
  const started = hasStarted(progress, lang);
  const level = getLevels(lang).find((l) => l.name === currentLevel(progress, lang))!;

  const open = (path: string) => {
    tapFeedback();
    navigate(path);
  };
  const current = lessons.find((l) => states.get(l.id) === 'current');
  const [picking, setPicking] = useState(false);
  // At the old github.io address, once the new one is up: offer to move.
  const [movedLive, setMovedLive] = useState(false);
  useEffect(() => {
    if (onOldAddress) void newHomeIsLive().then(setMovedLive);
  }, []);
  const stages = getPath(lang);
  const [pop, setPop] = useState<string | null>(null);
  useEffect(() => {
    if (!pop) return;
    // A tap anywhere else, or Escape, closes the lesson popup.
    const close = (e: Event) => {
      const t = e.target as Element;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !t.closest?.('.lesson-pop, .lesson-node')) setPop(null);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [pop]);
  const stuck = useStuckUnit();
  const target = current ?? lessons.find((l) => states.get(l.id) === 'open');
  const away = useCurrentAway(target?.id);
  let unitNo = 0;
  let birdNo = 0; // the units' birds take turns at the poses
  let nodeNo = 0; // position along the whole path, for the winding

  return (
    <>
      <TopBar lang={lang} progress={progress} onFlag={() => setPicking(true)} />
      {stuck && (
        <div className={`path-sticky tone-${stuck.tone}`} data-testid="sticky-unit" aria-hidden="true" key={stuck.id}>
          <span className="path-sticky-label">{stuck.label}</span>
          <span className="grow path-sticky-title">{stuck.title}</span>
          <span className="path-sticky-count">{stuck.count}</span>
        </div>
      )}
      <main className="page path-page">
        {movedLive && (
          <button className="card review-card move-card" onClick={() => open('/move')} data-testid="move-banner">
            <div className="row">
              <Sticker name="plane" size={48} />
              <div className="grow">
                <div className="card-title">Learnguage has moved to learnguage.net</div>
                <p className="muted small">Bring your XP and streak along: it takes a minute.</p>
              </div>
              <Icon name="chevron" style={{ color: 'var(--faint)' }} />
            </div>
          </button>
        )}
        <DailyGoal progress={progress} />
        <WordOfTheDay lang={lang} progress={progress} />
        <StreakWarning
          progress={progress}
          onPractice={() => open(current ? `/${lang}/learn/${current.id}` : learned.length >= 4 ? `/${lang}/learn/review` : `/${lang}`)}
          onRemind={() => open('/settings/reminder')}
        />

        {started ? (
          <button className="level-bar" onClick={() => open(`/${lang}/level`)} data-testid="level-change">
            <span className="level-bar-label">Level</span>
            <span className="grow level-bar-name">
              {level.name} <span className="muted">{level.cefr}</span>
            </span>
            <span className="level-bar-cta">Change</span>
          </button>
        ) : (
          <section className="card level-start" data-testid="level-start">
            <h2 className="start-title">Where do you want to start?</h2>
            <p className="muted">Pick any level. Everything below it unlocks, and you can change it any time.</p>
            <LevelTiles
              lang={lang}
              onPicked={() => requestAnimationFrame(() => document.querySelector('.lesson-node.current')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))}
            />
            <button className="btn secondary" onClick={() => open(`/${lang}/placement`)} data-testid="placement-card">
              <Icon name="target" size={20} /> Not sure? Take a quick test
            </button>
          </section>
        )}

        {(learned.length >= 4 || (progress.speaking && !isModelReady())) && (
          <div className="quick-row">
            {learned.length >= 4 && (
              <button className="quick" onClick={() => open(`/${lang}/learn/review`)} aria-label="Review weak words">
                <Sticker name="bulb" size={44} />
                <span className="quick-title">Review weak words</span>
                <span className="quick-hint">{weak.length ? `${weak.length} to brush up` : 'Keep them fresh'} · no hearts lost</span>
              </button>
            )}
            {progress.speaking && !isModelReady() && (
              <button className="quick" onClick={() => open('/settings')} aria-label="Turn on speaking exercises">
                <Sticker name="sounds" size={44} />
                <span className="quick-title">Speaking</span>
                <span className="quick-hint">Get the free speech model</span>
              </button>
            )}
          </div>
        )}

        {stages.map((stage, s) => (
          <section key={stage.id} className="stage">
            {stage.level !== stages[s - 1]?.level && (
              <h2 className="level-head" data-testid={`level-${stage.id}`}>
                {stage.level}
              </h2>
            )}
            <div className="stage-head">
              <span className="stage-num">{s + 1}</span>
              <div>
                <div className="stage-title">{stage.title}</div>
                <p className="muted small">{stage.about}</p>
              </div>
            </div>

            {stage.units.map((unit) => {
              if (!unit.lessons.length) {
                return (
                  <div key={unit.id} className="unit soon">
                    <span className="row">
                      <Icon name="lock" size={18} /> {unit.title}
                    </span>
                    <span className="muted small">Coming soon</span>
                  </div>
                );
              }
              const done = unit.lessons.filter((l) => lessonDone(progress, lang, l.id)).length;
              const label = unit.culture ? 'Culture' : unit.elective ? 'Extra topic' : `Unit ${++unitNo}`;
              // Each unit its own color from the logo, matching its banner and its lesson coins.
              const tone = unit.culture ? 'sky' : unit.elective ? 'cream' : UNIT_TONES[(unitNo - 1) % UNIT_TONES.length];
              const count = done === unit.lessons.length ? 'Complete!' : `${done} of ${unit.lessons.length} lessons`;
              const gated = unit.adult && !progress.adult;
              // Halfway along: a reward chest, ready once the lessons before it are done.
              const chestAt = unit.lessons.length >= 2 ? Math.ceil(unit.lessons.length / 2) : -1;
              const chestReady = chestAt > 0 && unit.lessons.slice(0, chestAt).every((l) => lessonDone(progress, lang, l.id));
              // A bird beside the second lesson, in this unit's pose (not where the current lesson's buddy already is).
              const birdAt = Math.min(1, unit.lessons.length - 1);
              const pose = BIRD_POSES[gated ? 0 : birdNo++ % BIRD_POSES.length];
              return (
                <section key={unit.id} className={`card unit tone-${tone}`} data-unit={unit.id} data-label={label} data-title={unit.title} data-tone={tone} data-count={count}>
                  <div className="unit-banner">
                    <div className="grow">
                      <div className="unit-kicker">
                        {label}
                        {unit.elective && <span className="unit-badge">Optional</span>}
                      </div>
                      <div className="unit-title">{unit.title}</div>
                      <div className="unit-count">
                        {count}
                      </div>
                    </div>
                    <span className="unit-sticker">
                      <UnitArt unitId={unit.id} size={56} />
                    </span>
                  </div>
                  {unit.elective && <p className="muted small unit-note">{unit.culture ? 'A short culture lesson: tips, useful phrases and a quiz. It never holds up your path.' : 'An extra topic for when you want it. It never holds up your path.'}</p>}
                  {gated ? (
                    <AdultGate count={`${unit.lessons.length} lessons`} />
                  ) : (
                  <ol className="lessons path">
                    {unit.lessons.map((lesson, i) => {
                      const state = states.get(lesson.id)!;
                      const x = WIND[nodeNo++ % WIND.length];
                      const chestX = i + 1 === chestAt ? WIND[nodeNo++ % WIND.length] : 0;
                      return (
                        <Fragment key={lesson.id}>
                        <li className={`path-step ${state}`} style={{ '--x': `${x}px` } as CSSProperties}>
                          {state === 'current' && <span className="node-cta">Start</span>}
                          {state === 'current' && <ProgressRing done={done} total={unit.lessons.length} />}
                          <button
                            className={`lesson-node ${state}`}
                            data-lesson={lesson.id}
                            data-kind={lessonKind(lang, stage.id, unit.id, lesson.title)}
                            disabled={state === 'locked'}
                            aria-expanded={pop === lesson.id}
                            onClick={() => {
                              tapFeedback();
                              setPop(pop === lesson.id ? null : lesson.id);
                            }}
                          >
                            <span className="node-dot">
                              {state === 'locked' ? <Icon name="lock" size={26} /> : <CoinIcon kind={lessonKind(lang, stage.id, unit.id, lesson.title)} />}
                            </span>
                            {state === 'done' && (
                              <span className="coin-check" aria-hidden="true">
                                <Icon name="check" size={14} />
                              </span>
                            )}
                            <span className="sr-only">
                              {lesson.title}
                              {state === 'done' ? ', done: practice again' : state === 'open' ? ', unlocked' : state === 'locked' ? ', locked' : ''}
                            </span>
                          </button>
                          <span className="node-label" aria-hidden="true">
                            {lesson.title}
                          </span>
                          {state === 'current' ? (
                            <span className="path-buddy" style={{ '--side': x > 0 ? -1 : 1 } as CSSProperties}>
                              <Bird pose="hop" size={62} />
                            </span>
                          ) : (
                            i === birdAt && (
                              <span className="path-bird" style={{ '--side': x > 0 ? -1 : x < 0 ? 1 : nodeNo % 2 ? 1 : -1 } as CSSProperties}>
                                <Bird pose={pose} size={78} />
                              </span>
                            )
                          )}
                        </li>
                        {pop === lesson.id && (
                          <LessonPop
                            lesson={lesson}
                            unitLabel={label}
                            index={i}
                            total={unit.lessons.length}
                            done={state === 'done'}
                            x={x}
                            onStart={() => {
                              setPop(null);
                              open(`/${lang}/learn/${lesson.id}`);
                            }}
                          />
                        )}
                        {i + 1 === chestAt && (
                          <li className="path-step chest-step" style={{ '--x': `${chestX}px` } as CSSProperties}>
                            <Chest lang={lang} unitId={unit.id} ready={chestReady} opened={!!progress.chests[`${lang}:${unit.id}`]} />
                          </li>
                        )}
                        </Fragment>
                      );
                    })}
                    <li className="path-step review-step" style={{ '--x': `${WIND[nodeNo++ % WIND.length]}px` } as CSSProperties}>
                      <button
                        className={`path-coin review ${done > 0 ? 'open' : 'locked'}`}
                        disabled={done === 0 || learned.length < 4}
                        onClick={() => open(`/${lang}/learn/review`)}
                        aria-label={`Review ${unit.title}`}
                        data-testid="review-coin"
                      >
                        <span className="node-dot">
                          <CoinIcon kind={done > 0 ? 'review' : 'locked'} />
                        </span>
                      </button>
                      <span className="node-label" aria-hidden="true">
                        Review
                      </span>
                    </li>
                  </ol>
                  )}
                </section>
              );
            })}
          </section>
        ))}

        {progress.placement[lang] && (
          <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => open(`/${lang}/placement`)}>
            <Icon name="target" size={18} /> Retake the placement test
          </button>
        )}
        {/* At the very bottom, below everything else. */}
        <InstallCard />
      </main>

      {away && target && (
        <button
          className={`jump-lesson ${away}`}
          data-testid="jump-to-lesson"
          aria-label={`Jump to your lesson: ${target.title}`}
          onClick={() => {
            tapFeedback();
            document.querySelector(`.lesson-node[data-lesson="${target.id}"]`)?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
          }}
        >
          <Icon name="chevron" size={22} />
          <span className="sr-only">Jump to your lesson</span>
        </button>
      )}

      {picking && (
        <div className="sheet-backdrop" onClick={() => setPicking(false)}>
          <div className="sheet" role="dialog" aria-label="Choose a language" onClick={(e) => e.stopPropagation()}>
            <h2 className="tip-title">Which language today?</h2>
            <LangTiles
              current={lang}
              onPick={(l) => {
                setPicking(false);
                if (l !== lang) navigate(`/${l}`, { direction: 'tab' });
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
