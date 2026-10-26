import { playPhrase } from '../lib/audio';
import { getPhrases, getTopic, type Lang } from '../lib/content';
import { useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { PhraseText, Screen } from '../ui';

export function TopicScreen({ lang, topic }: { lang: Lang; topic: string }) {
  const phrases = getPhrases(lang, topic);
  const progress = useProgress();
  const quizBest = progress.quiz[`${lang}:${topic}`];

  return (
    <Screen title={getTopic(topic)?.title ?? ''} back={`/${lang}`}>
      <button className="btn" onClick={() => navigate(`/${lang}/${topic}/practice`)}>
        🎙️ Listen &amp; repeat
      </button>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn secondary flex" onClick={() => navigate(`/${lang}/${topic}/flashcards`)}>
          🃏 Flashcards
        </button>
        <button className="btn secondary flex" onClick={() => navigate(`/${lang}/${topic}/quiz`)}>
          {quizBest !== undefined ? `❓ Quiz · ${Math.round(quizBest * 100)}%` : '❓ Quiz'}
        </button>
      </div>

      {phrases.map((p) => {
        const best = progress.speech[`${lang}:${p.id}`];
        return (
          <button key={p.id} className="card" style={{ padding: 14 }} onClick={() => playPhrase(p.audio)}>
            <div className="row">
              <div className="grow">
                <PhraseText phrase={p} size="small" />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24 }}>🔊</div>
                {best !== undefined && <div className="muted small">🎙️ {Math.round(best * 100)}%</div>}
              </div>
            </div>
          </button>
        );
      })}
    </Screen>
  );
}
