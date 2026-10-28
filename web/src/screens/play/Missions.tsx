import { useState } from 'react';
import { compare } from '../../../../shared/compare';
import type { Lang } from '../../lib/content';
import { haptic, sfx, tapFeedback } from '../../lib/fx';
import { BANDS, clip, type PlayData } from '../../lib/play';
import { recordPlay, useProgress } from '../../lib/progress';
import { navigate } from '../../lib/router';
import { Icon, Screen } from '../../ui';
import { AnswerBar, BirdSays, DoneCard, HearButton, LineText } from './common';

// Real-life missions: a small challenge out in the world (order a coffee, ask for directions,
// switch your phone's language…). Practise the phrases here, go and do it, then check it off
// for bonus XP: once per mission, so it means you really did it.

export const MISSION_XP = 20;

export function MissionScreen({ lang, data, id }: { lang: Lang; data: PlayData; id: string }) {
  const mission = data.missions.find((m) => m.id === id);
  const progress = useProgress();
  const [practising, setPractising] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [claimed, setClaimed] = useState<number | null>(null);
  if (!mission) {
    navigate(`/${lang}/play/mission`, { replace: true });
    return null;
  }
  const doneAt = progress.play?.[`${lang}:mission:${mission.id}`];

  const check = (k: number, text: string) => {
    const score = compare(mission.phrases[k].text, text, lang).score;
    setScores((s) => ({ ...s, [k]: Math.max(score, s[k] ?? 0) }));
    sfx(score >= 0.5 ? 'correct' : 'wrong');
    haptic(score >= 0.5 ? 'success' : 'error');
  };

  const claim = () => {
    tapFeedback();
    setClaimed(recordPlay(lang, 'mission', mission.id, 1, MISSION_XP, { once: true }));
    sfx('achievement');
  };

  return (
    <Screen title="Mission" back={`/${lang}/play/mission`}>
      {claimed !== null ? (
        <DoneCard title="Mission accomplished!" detail="You used your new language in real life. That's what it's all for." xp={claimed}>
          <button className="btn" onClick={() => navigate(`/${lang}/play/mission`)}>
            More missions
          </button>
        </DoneCard>
      ) : (
        <>
          <div className="card mission-card" data-testid="mission">
            <div className="muted small">{BANDS[mission.band]}</div>
            <div className="start-title" lang={lang}>
              {mission.title}
            </div>
            <div className="muted">{mission.en}</div>
            <p style={{ margin: 0 }}>
              <b>Your mission:</b> {mission.task}
            </p>
          </div>
          <BirdSays pose="globe" lang={lang}>
            <p className="muted small" style={{ margin: 0 }}>
              Practise these first. Tap a phrase to say it and see how close you are.
            </p>
          </BirdSays>
          <div className="list">
            {mission.phrases.map((p, k) => (
              <div key={p.text} className="list-row mission-phrase" data-testid="mission-phrase">
                <button className="grow choice-main" onClick={() => setPractising(practising === k ? null : k)} style={{ textAlign: 'left' }}>
                  <LineText lang={lang} text={p.text} en={p.en} showEn />
                </button>
                {scores[k] !== undefined && <span className={`story-score ${scores[k] >= 0.85 ? 'full' : ''}`}>{Math.round(scores[k] * 100)}%</span>}
                <HearButton url={clip(lang, p.text)} />
              </div>
            ))}
          </div>
          {practising !== null && <AnswerBar lang={lang} onText={(t) => check(practising, t)} expected={mission.phrases[practising].text} sayLabel="Say this phrase" />}
          {doneAt ? (
            <p className="ok-text" data-testid="mission-done">
              <Icon name="check" size={18} /> Done on {new Date(doneAt).toLocaleDateString()}. Do it again any time, just for practice.
            </p>
          ) : (
            <button className="btn big-btn" onClick={claim} data-testid="mission-claim">
              <Icon name="check" size={20} /> I did it! (+{MISSION_XP} XP)
            </button>
          )}
        </>
      )}
    </Screen>
  );
}
