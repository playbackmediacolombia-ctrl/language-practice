import { UnitArt } from '../art';
import type { Lang } from '../lib/content';
import { currentLevel, getLevels, getPath, hasStarted } from '../lib/course';
import { tapFeedback } from '../lib/fx';
import { lessonDone, pickLevel, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { Icon, Screen } from '../ui';
import { showCurrentLesson } from './Path';

// Pick your level: start at any level, Beginner to Fluent. Everything below it unlocks; XP,
// streak and finished lessons are never touched. The placement test stays as an option.

/** One color per level, from the logo: blue, orange, sky, sun, navy and the parrot's red. */
const LEVEL_TONES = ['blue', 'orange', 'sky', 'sun', 'navy', 'red'];

/** The six levels as big tiles; tapping one starts you there. */
export function LevelTiles({ lang, onPicked }: { lang: Lang; onPicked: () => void }) {
  const progress = useProgress();
  const stages = getPath(lang);
  const here = hasStarted(progress, lang) ? currentLevel(progress, lang) : null;
  return (
    <div className="level-tiles">
      {getLevels(lang).map((level, i) => {
        const first = level.stages[0];
        const at = stages.indexOf(first);
        const lessons = level.stages.flatMap((s) => s.units.filter((u) => !u.elective).flatMap((u) => u.lessons));
        const done = lessons.filter((l) => lessonDone(progress, lang, l.id)).length;
        return (
          <button
            key={level.name}
            className={`level-tile tone-${LEVEL_TONES[i % LEVEL_TONES.length]}${here === level.name ? ' here' : ''}`}
            data-testid={`level-pick-${first.id}`}
            aria-label={`${level.name}, ${level.cefr}: ${level.about}${here === level.name ? " You're here." : ''}`}
            onClick={() => {
              tapFeedback();
              pickLevel(lang, first.id, at > 0 ? stages[at - 1].id : null, stages.map((s) => s.id));
              onPicked();
            }}
          >
            <span className="level-cefr" aria-hidden="true">
              {level.cefr}
            </span>
            <span className="grow level-tile-text" aria-hidden="true">
              <span className="level-tile-name">{level.name}</span>
              <span className="level-tile-about">{level.about}</span>
              <span className="level-tile-meta">
                {lessons.length} lessons{done ? ` · ${done} done` : ''}
              </span>
            </span>
            {here === level.name ? (
              <span className="level-here" aria-hidden="true">
                You're here
              </span>
            ) : (
              <span className="level-art" aria-hidden="true">
                <UnitArt unitId={first.units[0].id} size={44} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Learn › Change level (also from Settings). */
export function LevelScreen({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const started = hasStarted(progress, lang);
  return (
    <Screen title="Pick your level" back={`/${lang}`}>
      <p className="muted" style={{ margin: '0 4px' }}>
        Start anywhere. Everything below the level you pick unlocks.
        {started && ' Your XP, streak and finished lessons stay exactly as they are.'}
      </p>
      <LevelTiles
        lang={lang}
        onPicked={() => {
          showCurrentLesson();
          navigate(`/${lang}`, { direction: 'back' });
        }}
      />
      <button className="btn secondary" onClick={() => navigate(`/${lang}/placement`)} data-testid="level-test">
        <Icon name="target" size={20} /> Not sure? Take a quick test
      </button>
    </Screen>
  );
}
