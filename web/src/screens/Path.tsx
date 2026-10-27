import { type CSSProperties, useEffect, useState } from 'react';
import { Flag, Sticker, TONES, UnitArt } from '../art';
import { playPhrase } from '../lib/audio';
import { type Lang, LANGS } from '../lib/content';
import { currentLevel, getLessons, getLevels, getPath, hasStarted, lessonStates, weakItems } from '../lib/course';
import { tapFeedback } from '../lib/fx';
import { newHomeIsLive, onOldAddress } from '../lib/move';
import { heartsNow, lessonDone, type Progress, streak, todayXp, useProgress, weakness } from '../lib/progress';
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

/** The three languages as big, bright tiles with their flags. */
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
  let unitNo = 0;
  let nodeNo = 0; // position along the whole path, for the winding

  return (
    <>
      <TopBar lang={lang} progress={progress} onFlag={() => setPicking(true)} />
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
        <InstallCard />
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
              const tone = unit.culture ? 'sky' : unit.elective ? 'cream' : TONES[s % TONES.length];
              const label = unit.culture ? 'Culture' : unit.elective ? 'Extra topic' : `Unit ${++unitNo}`;
              return (
                <section key={unit.id} className={`card unit tone-${tone}`}>
                  <div className="unit-banner">
                    <div className="grow">
                      <div className="unit-kicker">
                        {label}
                        {unit.elective && <span className="unit-badge">Optional</span>}
                      </div>
                      <div className="unit-title">{unit.title}</div>
                      <div className="unit-count">
                        {done === unit.lessons.length ? 'Complete!' : `${done} of ${unit.lessons.length} lessons`}
                      </div>
                    </div>
                    <span className="unit-sticker">
                      <UnitArt unitId={unit.id} size={56} />
                    </span>
                  </div>
                  {unit.elective && <p className="muted small unit-note">{unit.culture ? 'A short culture lesson: tips, useful phrases and a quiz. It never holds up your path.' : 'An extra topic for when you want it. It never holds up your path.'}</p>}
                  {unit.adult && !progress.adult ? (
                    <AdultGate count={`${unit.lessons.length} lessons`} />
                  ) : (
                  <ol className="lessons path">
                    {unit.lessons.map((lesson) => {
                      const state = states.get(lesson.id)!;
                      const x = WIND[nodeNo++ % WIND.length];
                      return (
                        <li key={lesson.id} className={`path-step ${state}`} style={{ '--x': `${x}px` } as CSSProperties}>
                          {state === 'current' && <span className="node-cta">Start</span>}
                          <button
                            className={`lesson-node ${state}`}
                            data-lesson={lesson.id}
                            disabled={state === 'locked'}
                            onClick={() => open(`/${lang}/learn/${lesson.id}`)}
                          >
                            <span className="node-dot">
                              <Icon name={state === 'done' ? 'check' : state === 'locked' ? 'lock' : 'star'} size={state === 'locked' ? 26 : 32} />
                            </span>
                            <span className="sr-only">
                              {lesson.title}
                              {state === 'done' ? ', done: practice again' : state === 'open' ? ', unlocked' : state === 'locked' ? ', locked' : ''}
                            </span>
                          </button>
                          <span className="node-label" aria-hidden="true">
                            {lesson.title}
                          </span>
                          {state === 'current' && <img className="path-buddy" src="brand/mark.png" alt="" width={54} height={41} style={{ '--side': x > 0 ? -1 : 1 } as CSSProperties} />}
                        </li>
                      );
                    })}
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
      </main>

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
