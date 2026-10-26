import { getPhrases, getTopics, type Lang, langInfo } from '../lib/content';
import { cardBox, MAX_BOX, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { ProgressBar, Screen } from '../ui';

export function Topics({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const info = langInfo(lang);

  return (
    <Screen title={`${info.flag} ${info.name}`} back={`/${lang}`}>
      {getTopics().map((topic) => {
        const phrases = getPhrases(lang, topic.id);
        const learned = phrases.reduce((sum, p) => sum + cardBox(progress, lang, p.id) / MAX_BOX, 0) / phrases.length;
        return (
          <button key={topic.id} className="card" onClick={() => navigate(`/${lang}/${topic.id}`)}>
            <div className="row">
              <span style={{ fontSize: 30 }}>{topic.emoji}</span>
              <div className="grow">
                <div style={{ fontSize: 19, fontWeight: 600 }}>{topic.title}</div>
                <p className="muted">{phrases.length} phrases</p>
              </div>
              <span className="muted">{Math.round(learned * 100)}%</span>
            </div>
            <ProgressBar value={learned} />
          </button>
        );
      })}
    </Screen>
  );
}
