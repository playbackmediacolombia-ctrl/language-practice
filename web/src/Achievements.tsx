import { useEffect, useRef, useState } from 'react';
import { type Achievement, earned, pending } from './lib/achievements';
import { haptic, reducedMotion, sfx } from './lib/fx';
import { markCelebrated, useProgress } from './lib/progress';
import { useRoute } from './lib/router';
import { Bird } from './Bird';
import { Confetti } from './ui';

/**
 * Watches progress for big achievements and shows the logo celebration for them.
 * It waits until you've left a lesson, so a lesson's own "Lesson complete!" screen comes
 * first, unchanged; the logo moment follows on the next screen.
 */
export function AchievementHost() {
  const progress = useProgress();
  const [, second, third] = useRoute();
  const [showing, setShowing] = useState<Achievement[] | null>(null);

  // The first time this version opens, everything already earned counts as celebrated, so
  // existing progress never sets off a pile of old celebrations.
  useEffect(() => {
    if (progress.celebrated === null) markCelebrated(earned(progress).map((a) => a.key));
  }, [progress]);

  const inLesson = second === 'learn' && !!third;
  const todo = progress.celebrated === null ? [] : pending(progress);
  useEffect(() => {
    if (!showing && !inLesson && todo.length) setShowing(todo);
  }, [showing, inLesson, todo.length]);

  if (!showing) return null;
  return <Celebration achievements={showing} onDone={() => setShowing(null)} />;
}

function Celebration({ achievements, onDone }: { achievements: Achievement[]; onDone: () => void }) {
  const [main, ...more] = achievements;
  const button = useRef<HTMLButtonElement>(null);
  const calm = reducedMotion();
  useEffect(() => {
    sfx('achievement');
    haptic('success');
    button.current?.focus({ preventScroll: true });
  }, []);
  // Saved as soon as it shows, so closing the app mid-celebration doesn't show it again.
  useEffect(() => markCelebrated(achievements.map((a) => a.key)), [achievements]);

  return (
    <div className={calm ? 'achievement calm' : 'achievement'} role="dialog" aria-modal="true" aria-labelledby="achievement-title" data-testid="achievement">
      {!calm && <Confetti pieces={110} />}
      <div className="achievement-card">
        <div className="achievement-logo">
          <span className="achievement-glow" aria-hidden="true" />
          <img src="brand/logo.webp" alt="Learnguage" width={220} height={180} />
        </div>
        <Bird pose={/streak/i.test(main.key) ? 'streak' : 'dance'} size={84} className="achievement-bird" />
        <h2 id="achievement-title" className="achievement-title">
          {main.title}
        </h2>
        <p className="achievement-detail">{main.detail}</p>
        {more.length > 0 && (
          <ul className="achievement-more">
            {more.map((a) => (
              <li key={a.key}>
                <b>{a.title}</b> {a.detail}
              </li>
            ))}
          </ul>
        )}
        <button ref={button} className="btn" onClick={onDone}>
          Continue
        </button>
      </div>
    </div>
  );
}
