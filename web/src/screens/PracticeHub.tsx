import { getPhrases, getTopics, type Lang } from '../lib/content';
import { getLessons, weakItems } from '../lib/course';
import { tapFeedback } from '../lib/fx';
import { cardBox, lessonDone, MAX_BOX, useProgress, weakness } from '../lib/progress';
import { navigate } from '../lib/router';
import { Icon, ProgressBar, Screen } from '../ui';
import { LangSwitcher } from './Path';

/** Practice tab: review weak lesson words, or drill phrasebook topics. */
export function PracticeHub({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const learned = getLessons(lang)
    .filter((l) => lessonDone(progress, lang, l.id))
    .flatMap((l) => l.items);
  const weak = weakItems(progress, lang, learned.length).filter((i) => weakness(progress, lang, i.id) < 3);
  const open = (path: string) => {
    tapFeedback();
    navigate(path);
  };

  return (
    <Screen title="Practice" large>
      <LangSwitcher lang={lang} to={(l) => `/${l}/phrasebook`} />

      <button className="card review-card" disabled={learned.length < 4} onClick={() => open(`/${lang}/learn/review`)}>
        <div className="row">
          <span className="row-icon">
            <Icon name="review" />
          </span>
          <div className="grow">
            <div style={{ fontWeight: 700, fontSize: 17 }}>Review weak words</div>
            <p className="muted small">
              {learned.length < 4
                ? 'Finish your first lesson to unlock review.'
                : `${weak.length || 'No'} weak word${weak.length === 1 ? '' : 's'} · mixed exercises · earn a heart`}
            </p>
          </div>
          {learned.length >= 4 && <Icon name="chevron" style={{ color: 'var(--faint)' }} />}
        </div>
      </button>

      <div className="section-title">Phrasebook</div>
      <p className="muted small" style={{ margin: '-4px 4px 0' }}>
        Travel phrases with listen &amp; repeat, flashcards and a quiz.
      </p>
      <div className="list">
        {getTopics().map((topic) => {
          const phrases = getPhrases(lang, topic.id);
          const known = phrases.reduce((sum, p) => sum + cardBox(progress, lang, p.id) / MAX_BOX, 0) / phrases.length;
          return (
            <button key={topic.id} className="list-row link" onClick={() => open(`/${lang}/${topic.id}`)}>
              <span className="row-icon" style={{ fontSize: 20 }}>
                {topic.emoji}
              </span>
              <span className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="row">
                  <span className="row-title grow">{topic.title}</span>
                  <span className="muted small">{Math.round(known * 100)}%</span>
                </span>
                <ProgressBar value={known} tone="accent" />
              </span>
              <Icon name="chevron" />
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
