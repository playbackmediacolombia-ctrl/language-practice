import { playPhrase } from '../lib/audio';
import { getPhrases, getTopic, type Lang } from '../lib/content';
import { tapFeedback } from '../lib/fx';
import { useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { Icon, PhraseText, Screen, AudioDisc } from '../ui';

export function TopicScreen({ lang, topic }: { lang: Lang; topic: string }) {
  const phrases = getPhrases(lang, topic);
  const progress = useProgress();
  const quizBest = progress.quiz[`${lang}:${topic}`];
  const open = (mode: string) => {
    tapFeedback();
    navigate(`/${lang}/${topic}/${mode}`);
  };

  return (
    <Screen title={getTopic(topic)?.title ?? ''} back="/practice">
      <button className="btn" onClick={() => open('practice')}>
        <Icon name="mic" /> Listen &amp; repeat
      </button>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn secondary flex" onClick={() => open('flashcards')}>
          <Icon name="cards" /> Flashcards
        </button>
        <button className="btn secondary flex" onClick={() => open('quiz')}>
          <Icon name="quiz" /> {quizBest !== undefined ? `Quiz · ${Math.round(quizBest * 100)}%` : 'Quiz'}
        </button>
      </div>

      <div className="list">
        {phrases.map((p) => {
          const best = progress.speech[`${lang}:${p.id}`];
          return (
            <button key={p.id} className="list-row link" onClick={() => playPhrase(p.audio)}>
              <div className="grow">
                <PhraseText phrase={p} size="small" />
              </div>
              <div style={{ textAlign: 'right', color: 'var(--accent)' }}>
                <AudioDisc />
                {best !== undefined && <div className="muted small">{Math.round(best * 100)}%</div>}
              </div>
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
