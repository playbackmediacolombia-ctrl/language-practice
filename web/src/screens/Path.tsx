import { useEffect } from 'react';
import { type Lang, LANGS } from '../lib/content';
import { getLessons, getPath, lessonStates, weakItems } from '../lib/course';
import { tapFeedback } from '../lib/fx';
import { heartsNow, lessonDone, type Progress, streak, todayXp, useProgress, weakness } from '../lib/progress';
import { navigate } from '../lib/router';
import { isModelReady } from '../lib/whisper';
import { Flame, Icon, LangIcon, ProgressBar, Screen } from '../ui';

/** Streak, XP, hearts and today's goal. */
export function StatsBar({ progress }: { progress: Progress }) {
  const today = todayXp(progress);
  const days = streak(progress);
  return (
    <div className="card" style={{ gap: 10 }}>
      <div className="row stats-row">
        <span className="stat-pill" title="Day streak">
          <Flame lit={days > 0} /> {days}
        </span>
        <span className="stat-pill" title="Total XP">
          <Icon name="bolt" className="bolt" /> {progress.xp} XP
        </span>
        <span className="stat-pill" title="Hearts">
          <Icon name="heart" className="heart" /> {heartsNow(progress).hearts}
        </span>
      </div>
      <div className="row">
        <Icon name="target" size={18} style={{ color: 'var(--muted)' }} />
        <span className="grow muted small">Daily goal</span>
        <span className="muted small">
          {Math.min(today, progress.goal)}/{progress.goal} XP
        </span>
      </div>
      <ProgressBar value={today / progress.goal} tone="flame" />
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
          <LangIcon lang={l.id} size={28} />
          {l.name}
        </button>
      ))}
    </div>
  );
}

let scrollToCurrent = false;
/** The next time the path opens, scroll to the current lesson (after a placement test moved it far down). */
export const showCurrentLesson = () => (scrollToCurrent = true);

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
  const name = LANGS.find((l) => l.id === lang)!.name;
  // Offer the placement test until it's been taken or the path is well under way.
  const offerPlacement = !progress.placement[lang] && lessons.filter((l) => lessonDone(progress, lang, l.id)).length < 12;

  const open = (path: string) => {
    tapFeedback();
    navigate(path);
  };

  return (
    <Screen title="Learn" large>
      <LangSwitcher lang={lang} to={(l) => `/${l}`} />
      <StatsBar progress={progress} />

      {offerPlacement && (
        <button className="card review-card" data-testid="placement-card" onClick={() => open(`/${lang}/placement`)}>
          <div className="row">
            <span className="row-icon">
              <Icon name="target" />
            </span>
            <div className="grow">
              <div style={{ fontWeight: 700, fontSize: 17 }}>Already know some {name}?</div>
              <p className="muted small">Take a 5-minute placement test to skip ahead to your level.</p>
            </div>
            <Icon name="chevron" style={{ color: 'var(--faint)' }} />
          </div>
        </button>
      )}

      {learned.length >= 4 && (
        <button className="card review-card" onClick={() => open(`/${lang}/learn/review`)}>
          <div className="row">
            <span className="row-icon">
              <Icon name="review" />
            </span>
            <div className="grow">
              <div style={{ fontWeight: 700, fontSize: 17 }}>Review weak words</div>
              <p className="muted small">
                {weak.length ? `${weak.length} word${weak.length === 1 ? '' : 's'} to brush up` : 'Keep what you know fresh'} · no hearts
                lost · earn one back
              </p>
            </div>
            <Icon name="chevron" style={{ color: 'var(--faint)' }} />
          </div>
        </button>
      )}

      {progress.speaking && !isModelReady() && (
        <button className="card" onClick={() => open('/settings')}>
          <div className="row">
            <span className="row-icon">
              <Icon name="mic" />
            </span>
            <div className="grow">
              <div style={{ fontWeight: 650 }}>Turn on speaking exercises</div>
              <p className="muted small">Download the free Whisper model once to be graded when you speak.</p>
            </div>
          </div>
        </button>
      )}

      {getPath(lang).map((stage, s) => (
        <section key={stage.id} className="stage">
          {stage.level !== getPath(lang)[s - 1]?.level && (
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
            return (
              <div key={unit.id} className="card unit">
                <div className="row">
                  <div className="grow" style={{ fontWeight: 750, fontSize: 18, fontFamily: 'var(--font-round)' }}>
                    {unit.title}
                  </div>
                  <span className="muted small">
                    {done}/{unit.lessons.length}
                  </span>
                </div>
                <ProgressBar value={done / unit.lessons.length} />
                <ol className="lessons">
                  {unit.lessons.map((lesson) => {
                    const state = states.get(lesson.id)!;
                    return (
                      <li key={lesson.id}>
                        <button
                          className={`lesson-node ${state}`}
                          disabled={state === 'locked'}
                          onClick={() => open(`/${lang}/learn/${lesson.id}`)}
                        >
                          <span className="node-dot">
                            <Icon name={state === 'done' ? 'check' : state === 'locked' ? 'lock' : 'play'} size={state === 'done' || state === 'locked' ? 20 : 18} />
                          </span>
                          <span className="grow">{lesson.title}</span>
                          {state === 'current' && <span className="node-cta">Start</span>}
                          {state === 'done' && <span className="muted small">Practice</span>}
                          {state === 'open' && <span className="muted small">Tested out</span>}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </section>
      ))}

      {progress.placement[lang] && (
        <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => open(`/${lang}/placement`)}>
          <Icon name="target" size={18} /> Retake the placement test
        </button>
      )}
    </Screen>
  );
}
