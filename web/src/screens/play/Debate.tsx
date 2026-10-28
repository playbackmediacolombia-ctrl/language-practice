import { useState } from 'react';
import type { Lang } from '../../lib/content';
import { currentLevel, hasStarted } from '../../lib/course';
import { tapFeedback } from '../../lib/fx';
import { clip, type PlayData } from '../../lib/play';
import { useProgress } from '../../lib/progress';
import { navigate } from '../../lib/router';
import { Icon, Screen } from '../../ui';
import { LiveTalk, type LiveSession } from '../Talk';
import { LangSwitcher } from '../Path';
import { HearButton, LineText } from './common';

// Debate mode (Fluent level): pick a fun motion and your side, and argue it out loud with the
// AI partner, who takes the other side, pushes back and gives a verdict at the end. It needs
// the internet; the phrases for arguing well are here to practise any time, offline too.

const DEBATE_XP = 20;

const isFluent = (progress: ReturnType<typeof useProgress>, lang: Lang) => hasStarted(progress, lang) && currentLevel(progress, lang) === 'Fluent';

function Phrases({ lang, data }: { lang: Lang; data: PlayData }) {
  return (
    <section>
      <div className="section-title">Phrases for a good argument</div>
      <div className="list" data-testid="debate-phrases">
        {data.debate.phrases.map((p) => (
          <div key={p.text} className="list-row">
            <span className="grow">
              <LineText lang={lang} text={p.text} en={p.en} showEn />
            </span>
            <HearButton url={clip(lang, p.text)} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function DebateList({ lang, data }: { lang: Lang; data: PlayData }) {
  const progress = useProgress();
  const open = isFluent(progress, lang);
  return (
    <Screen title="Debate" back={`/${lang}/play`}>
      <LangSwitcher lang={lang} to={(l) => `/${l}/play/debate`} />
      {open ? (
        <p className="muted small" style={{ margin: '0 4px' }}>
          Pick a motion and a side. The AI argues the other side, pushes back, and says who won. Needs the internet.
        </p>
      ) : (
        <div className="card lock-card" data-testid="debate-locked">
          <Icon name="lock" size={28} />
          <div className="card-title">Opens at the Fluent level</div>
          <p className="muted small" style={{ margin: 0 }}>
            Debating takes the most language of all. Reach the Fluent level on the path (or test into it) to debate the AI. Until then, practise the phrases below.
          </p>
          <button className="btn secondary" onClick={() => navigate(`/${lang}/level`)}>
            Pick your level
          </button>
        </div>
      )}
      <section>
        <div className="section-title">Motions</div>
        <div className="list">
          {data.debate.topics.map((t) => {
            const best = progress.play?.[`${lang}:debate:${t.id}`];
            return (
              <button
                key={t.id}
                className="list-row link"
                disabled={!open}
                data-testid={`debate-${t.id}`}
                onClick={() => {
                  tapFeedback();
                  navigate(`/${lang}/play/debate/${t.id}`);
                }}
              >
                <span className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="row-title">{t.en}</span>
                  <span className="row-hint" lang={lang}>
                    {t.title}
                  </span>
                </span>
                {best !== undefined && (
                  <span className="story-score full" aria-label="Debated">
                    <Icon name="check" size={16} />
                  </span>
                )}
                {open ? <Icon name="chevron" /> : <Icon name="lock" size={18} />}
              </button>
            );
          })}
        </div>
      </section>
      <Phrases lang={lang} data={data} />
    </Screen>
  );
}

export function DebateScreen({ lang, data, id }: { lang: Lang; data: PlayData; id: string }) {
  const progress = useProgress();
  const topic = data.debate.topics.find((t) => t.id === id);
  const [side, setSide] = useState<'for' | 'against' | null>(null);
  if (!topic || !isFluent(progress, lang)) {
    navigate(`/${lang}/play/debate`, { replace: true });
    return null;
  }
  if (side) {
    const session: LiveSession = {
      mode: 'debate',
      title: topic.title,
      kicker: `Debate · you argue ${side === 'for' ? 'for' : 'against'} it`,
      about: `“${topic.en}” You argue ${side === 'for' ? 'FOR' : 'AGAINST'} it; the AI argues the other side, pushes back on each point and gives a verdict after about six turns.`,
      them: 'Debate partner',
      topic: 'debate',
      setting: `A friendly debate about: ${topic.en}`,
      en: topic.en,
      back: `/${lang}/play/debate`,
      motion: topic.en,
      side: side === 'for' ? 'against' : 'for',
      xp: DEBATE_XP,
      play: { kind: 'debate', id: topic.id },
    };
    return <LiveTalk lang={lang} session={session} />;
  }
  return (
    <Screen title="Debate" back={`/${lang}/play/debate`}>
      <div className="card start-card" data-testid="debate-intro">
        <p className="muted start-kicker">The motion</p>
        <div className="start-title" lang={lang}>
          {topic.title}
        </div>
        <p className="muted">{topic.en}</p>
        <p style={{ margin: 0 }}>Which side are you on? The AI takes the other one.</p>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn grow" onClick={() => setSide('for')} data-testid="debate-for" disabled={!navigator.onLine}>
            I agree
          </button>
          <button className="btn secondary grow" onClick={() => setSide('against')} data-testid="debate-against" disabled={!navigator.onLine}>
            I disagree
          </button>
        </div>
        {!navigator.onLine && <p className="muted small">Debates need the internet. Practise the phrases below meanwhile.</p>}
      </div>
      <Phrases lang={lang} data={data} />
    </Screen>
  );
}
