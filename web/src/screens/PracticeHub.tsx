import { getPhrases, getTopics, type Lang } from '../lib/content';
import { DAILY_MAX, dueItems, dueTomorrow, getLessons, mistakeItems, trackedCards, weakItems } from '../lib/course';
import { tapFeedback } from '../lib/fx';
import { cardBox, lessonDone, MAX_BOX, MISTAKE_RIGHTS, useProgress, weakness } from '../lib/progress';
import { navigate } from '../lib/router';
import { Icon, ProgressBar, Screen } from '../ui';
import { LangSwitcher } from './Path';
import { Sticker } from '../art';

/** Practice tab: review weak lesson words, or drill phrasebook topics. */
export function PracticeHub({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const learned = getLessons(lang)
    .filter((l) => lessonDone(progress, lang, l.id))
    .flatMap((l) => l.items);
  const weak = weakItems(progress, lang, learned.length).filter((i) => weakness(progress, lang, i.id) < 3);
  const due = dueItems(progress, lang).length;
  const tracked = Object.keys(trackedCards(progress, lang)).length;
  const tomorrow = dueTomorrow(progress, lang);
  const mistakes = mistakeItems(progress, lang).length;
  const open = (path: string) => {
    tapFeedback();
    navigate(path);
  };

  return (
    <Screen title="Practice" large>
      <LangSwitcher lang={lang} to={(l) => `/${l}/phrasebook`} />

      <button className="card review-card daily-card" data-testid="daily-review" disabled={due === 0} onClick={() => open(`/${lang}/learn/daily`)}>
        <div className="row">
          <span className="row-icon due-count" aria-hidden="true">
            {due > 0 ? Math.min(due, 99) : <Icon name="check" />}
          </span>
          <div className="grow">
            <div className="card-title">Daily review</div>
            <p className="muted small">
              {tracked === 0
                ? 'Words you learn come back here right before you would forget them.'
                : due > 0
                  ? `${due} word${due === 1 ? '' : 's'} due today${due > DAILY_MAX ? ` · ${DAILY_MAX} per session` : ''} · about ${Math.max(1, Math.round(Math.min(due, DAILY_MAX) / 4))} min`
                  : `All caught up! ${tomorrow ? `${tomorrow} due tomorrow · ` : ''}${tracked} word${tracked === 1 ? '' : 's'} in your memory`}
            </p>
          </div>
          {due > 0 && <Icon name="chevron" style={{ color: 'var(--faint)' }} />}
        </div>
      </button>

      <button className="card review-card mistakes-card" data-testid="mistakes-card" disabled={mistakes === 0} onClick={() => open(`/${lang}/learn/mistakes`)}>
        <div className="row">
          <span className="row-icon due-count" aria-hidden="true">
            {mistakes > 0 ? Math.min(mistakes, 99) : <Icon name="check" />}
          </span>
          <div className="grow">
            <div className="card-title">Mistakes</div>
            <p className="muted small">
              {mistakes > 0
                ? `${mistakes} word${mistakes === 1 ? '' : 's'} you got wrong · get each right ${MISTAKE_RIGHTS} times to clear it`
                : 'Nothing to fix. Words you get wrong collect here.'}
            </p>
          </div>
          {mistakes > 0 && <Icon name="chevron" style={{ color: 'var(--faint)' }} />}
        </div>
      </button>

      <button className="card review-card" disabled={learned.length < 4} onClick={() => open(`/${lang}/learn/review`)}>
        <div className="row">
          <span className="card-sticker tint-sun">
            <Sticker name="bulb" size={40} />
          </span>
          <div className="grow">
            <div className="card-title">Review weak words</div>
            <p className="muted small">
              {learned.length < 4
                ? 'Finish your first lesson to unlock review.'
                : `${weak.length || 'No'} weak word${weak.length === 1 ? '' : 's'} · mixed exercises · earn a heart`}
            </p>
          </div>
          {learned.length >= 4 && <Icon name="chevron" style={{ color: 'var(--faint)' }} />}
        </div>
      </button>

      <button className="card review-card" data-testid="handsfree-card" onClick={() => open(`/${lang}/handsfree`)}>
        <div className="row">
          <span className="card-sticker tint-sky">
            <Sticker name="sounds" size={40} />
          </span>
          <div className="grow">
            <div className="card-title">Hands-free audio</div>
            <p className="muted small">Like a podcast: hear the English, answer out loud, hear the answer</p>
          </div>
          <Icon name="chevron" style={{ color: 'var(--faint)' }} />
        </div>
      </button>

      <button className="card review-card" data-testid="stories-card" onClick={() => open(`/${lang}/stories`)}>
        <div className="row">
          <span className="card-sticker tint-orange">
            <Sticker name="chat" size={40} />
          </span>
          <div className="grow">
            <div className="card-title">Stories &amp; dialogues</div>
            <p className="muted small">Listen, tap any word to translate it, answer questions</p>
          </div>
          <Icon name="chevron" style={{ color: 'var(--faint)' }} />
        </div>
      </button>

      <button className="card review-card" data-testid="reading-card" onClick={() => open(`/${lang}/reading`)}>
        <div className="row">
          <span className="card-sticker tint-blue">
            <Sticker name="news" size={40} />
          </span>
          <div className="grow">
            <div className="card-title">Reading practice</div>
            <p className="muted small">Short articles for every level: tap any word to translate it, listen to each sentence</p>
          </div>
          <Icon name="chevron" style={{ color: 'var(--faint)' }} />
        </div>
      </button>

      <button className="card review-card" data-testid="roleplay-card" onClick={() => open(`/${lang}/roleplay`)}>
        <div className="row">
          <span className="card-sticker tint-sun">
            <Sticker name="debate" size={40} />
          </span>
          <div className="grow">
            <div className="card-title">Real-life role-plays</div>
            <p className="muted small">Order food, see a doctor, sort out a flight: you speak, Whisper grades you</p>
          </div>
          <Icon name="chevron" style={{ color: 'var(--faint)' }} />
        </div>
      </button>

      {lang === 'zh' && (
        <button className="card review-card" data-testid="writing-card" onClick={() => open('/zh/write')}>
          <div className="row">
            <span className="card-sticker tint-sky">
              <Sticker name="words" size={40} />
            </span>
            <div className="grow">
              <div className="card-title">Character writing</div>
              <p className="muted small">Trace characters stroke by stroke, then write them from memory</p>
            </div>
            <Icon name="chevron" style={{ color: 'var(--faint)' }} />
          </div>
        </button>
      )}

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
