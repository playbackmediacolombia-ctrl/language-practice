import { type Lang, langInfo } from '../lib/content';
import { getLessons, getPath, weakItems } from '../lib/course';
import { heartsNow, lessonDone, type Progress, streak, todayXp, useProgress, weakness } from '../lib/progress';
import { navigate } from '../lib/router';
import { isModelReady } from '../lib/whisper';
import { ProgressBar, Screen } from '../ui';

/** Streak, XP, hearts and today's goal. Shared by the home screen and the path. */
export function StatsBar({ progress }: { progress: Progress }) {
  const today = todayXp(progress);
  return (
    <div className="card" style={{ gap: 8 }}>
      <div className="row stats-row">
        <span title="Day streak">🔥 {streak(progress)}</span>
        <span title="Total XP">⭐ {progress.xp} XP</span>
        <span title="Hearts">❤️ {heartsNow(progress).hearts}</span>
      </div>
      <div className="row">
        <span className="grow muted small">🎯 Daily goal</span>
        <span className="muted small">
          {Math.min(today, progress.goal)}/{progress.goal} XP
        </span>
      </div>
      <ProgressBar value={today / progress.goal} />
    </div>
  );
}

export function Path({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const info = langInfo(lang);
  const lessons = getLessons(lang);
  // The first lesson not yet finished; everything after it is locked.
  const current = lessons.findIndex((l) => !lessonDone(progress, lang, l.id));
  const learned = lessons.filter((l) => lessonDone(progress, lang, l.id)).flatMap((l) => l.items);
  const weak = weakItems(progress, lang, learned.length).filter((i) => weakness(progress, lang, i.id) < 3);
  let lessonNumber = 0;

  return (
    <Screen title={`${info.flag} ${info.name}`} back="/">
      <StatsBar progress={progress} />

      {learned.length >= 4 && (
        <button className="card review-card" onClick={() => navigate(`/${lang}/learn/review`)}>
          <div style={{ fontWeight: 650, fontSize: 17 }}>🔁 Review weak words</div>
          <p className="muted">
            {weak.length ? `${weak.length} word${weak.length === 1 ? '' : 's'} to brush up` : 'Keep what you know fresh'} · no
            hearts lost · earn a ❤️
          </p>
        </button>
      )}

      {progress.speaking && !isModelReady() && (
        <button className="card" onClick={() => navigate('/settings')}>
          <div style={{ fontWeight: 650 }}>🎙️ Turn on speaking exercises</div>
          <p className="muted">Download the free Whisper model once to be graded when you speak.</p>
        </button>
      )}

      {getPath(lang).map((stage, s) => (
        <section key={stage.id} className="stage">
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
                  <span>🔒 {unit.title}</span>
                  <span className="muted small">Coming soon</span>
                </div>
              );
            }
            const done = unit.lessons.filter((l) => lessonDone(progress, lang, l.id)).length;
            return (
              <div key={unit.id} className="card unit">
                <div className="row">
                  <div className="grow" style={{ fontWeight: 650, fontSize: 18 }}>
                    {unit.title}
                  </div>
                  <span className="muted small">
                    {done}/{unit.lessons.length}
                  </span>
                </div>
                <ProgressBar value={done / unit.lessons.length} />
                <ol className="lessons">
                  {unit.lessons.map((lesson) => {
                    const n = lessonNumber++;
                    const state = current === -1 || n < current ? 'done' : n === current ? 'current' : 'locked';
                    return (
                      <li key={lesson.id}>
                        <button
                          className={`lesson-node ${state}`}
                          disabled={state === 'locked'}
                          onClick={() => navigate(`/${lang}/learn/${lesson.id}`)}
                        >
                          <span className="node-dot">{state === 'done' ? '✓' : state === 'current' ? '▶' : '🔒'}</span>
                          <span className="grow">{lesson.title}</span>
                          {state === 'current' && <span className="node-cta">Start</span>}
                          {state === 'done' && <span className="muted small">Practice</span>}
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

      <button className="btn secondary" style={{ marginTop: 12 }} onClick={() => navigate(`/${lang}/phrasebook`)}>
        📖 Phrasebook (travel phrases, flashcards, quiz)
      </button>
    </Screen>
  );
}
