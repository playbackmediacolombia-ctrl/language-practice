import { useEffect, useRef, useState } from 'react';
import { compare } from '../../../../shared/compare';
import { CharacterStage } from '../../characters/Stage';
import { primePlayer, stopPhrase, unlockAudio } from '../../lib/audio';
import type { Lang } from '../../lib/content';
import { haptic, sfx, tapFeedback } from '../../lib/fx';
import { type Choice, clip, type PlayData } from '../../lib/play';
import { recordPlay, useProgress } from '../../lib/progress';
import { navigate } from '../../lib/router';
import { judgeChoice } from '../../lib/talk';
import { Icon, Screen } from '../../ui';
import { AnswerBar, DoneCard, HearButton, LineText, say } from './common';

// Choose-your-own-adventure: a guide narrates each scene out loud, and you steer the story by
// saying what you do. What you said is matched to the closest choice; if none is close and
// you're online, the AI works out which one you meant in your own words. You can always tap.

const testHook = location.search.includes('test');
/** How close (0..1) what you said must be to a choice to pick it without asking the AI. */
const MATCH = 0.45;

export function AdventureScreen({ lang, data, id }: { lang: Lang; data: PlayData; id: string }) {
  const story = data.adventures.find((a) => a.id === id);
  const { characters } = useProgress();
  const [started, setStarted] = useState(false);
  const [sceneId, setSceneId] = useState(story?.start ?? 's1');
  const [path, setPath] = useState<string[]>([]);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showEn, setShowEn] = useState(story?.band === 1);
  const [spoken, setSpoken] = useState(0); // choices made out loud (a little more XP)
  const [result, setResult] = useState<{ xp: number } | null>(null);
  const [thinking, setThinking] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopPhrase();
    };
  }, []);
  const scene = story?.scenes[sceneId];

  // Each scene is read out when it comes up.
  useEffect(() => {
    if (!started || !scene) return;
    setNote(null);
    if (testHook) Object.assign(window, { __scene: { id: sceneId, choices: scene.choices?.map((c) => c.text) ?? [], end: scene.end ?? null } });
    void say(clip(lang, scene.text), (u) => alive.current && setSpeaking(u));
    if (scene.end && !result) {
      const xp = recordPlay(lang, 'adventure', story!.id, scene.end === 'great' ? 1 : 0.7, (scene.end === 'great' ? 15 : 10) + Math.min(5, spoken));
      setResult({ xp });
      sfx('complete');
    }
  }, [started, sceneId]);

  if (!story || !scene) {
    navigate(`/${lang}/play/adventure`, { replace: true });
    return null;
  }

  const choose = (c: Choice, out: boolean) => {
    tapFeedback();
    stopPhrase();
    if (out) setSpoken((n) => n + 1);
    sfx('correct');
    setPath((p) => [...p, sceneId]);
    setSceneId(c.to);
  };

  /** What you said: the closest choice, or (online) the AI's reading of it. */
  const heard = async (text: string) => {
    const choices = scene.choices ?? [];
    const scored = choices.map((c) => compare(c.text, text, lang).score);
    const best = scored.indexOf(Math.max(...scored));
    if (scored[best] >= MATCH) return choose(choices[best], true);
    if (navigator.onLine) {
      setThinking(true);
      try {
        const i = await judgeChoice(
          lang,
          text,
          choices.map((c) => c.text),
        );
        if (!alive.current) return;
        if (i >= 0 && i < choices.length) return choose(choices[i], true);
      } catch {
        // offline or busy: fall through to asking again
      } finally {
        if (alive.current) setThinking(false);
      }
    }
    sfx('wrong');
    haptic('error');
    setNote(`I heard “${text}”, but I couldn't tell which one you meant. Try again, or tap a choice.`);
  };

  const restart = () => {
    setSceneId(story.start);
    setPath([]);
    setResult(null);
    setSpoken(0);
  };

  const mood = scene.end ? (scene.end === 'great' ? 'celebrate' : 'happy') : thinking ? 'thinking' : note ? 'confused' : 'idle';
  return (
    <Screen title={story.kind === 'mystery' ? 'Mystery' : 'Adventure'} back={`/${lang}/play/adventure`}>
      {!started ? (
        <div className="card start-card" data-testid="adventure-intro">
          <p className="muted start-kicker">{story.kind === 'mystery' ? 'A mystery' : 'A trip'} · you choose what happens</p>
          <div className="start-title" lang={lang}>
            {story.title}
          </div>
          <p className="muted">{story.en}. Listen to each part, then say what you do. Different choices lead to different endings.</p>
          <button
            className="btn"
            data-testid="adventure-start"
            onClick={() => {
              tapFeedback();
              primePlayer();
              unlockAudio([]);
              setStarted(true);
            }}
          >
            <Icon name="play" size={18} /> Start the story
          </button>
        </div>
      ) : (
        <>
          {characters && <CharacterStage them="Narrator" topic="story" role={story.guide} speaking={speaking} mood={mood} clips={[]} />}
          <div className="card adventure-scene" data-testid="adventure-scene" data-scene={sceneId}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted small">Part {path.length + 1}</span>
              <label className="chip-toggle">
                <input type="checkbox" checked={showEn} onChange={(e) => setShowEn(e.target.checked)} /> English
              </label>
            </div>
            <p className="scene-text">
              <LineText lang={lang} text={scene.text} en={scene.en} showEn={showEn} />
            </p>
            <HearButton url={clip(lang, scene.text)} label="Hear it again" />
          </div>
          {scene.choices && (
            <>
              <div className="section-title">What do you do?</div>
              <div className="choice-list">
                {scene.choices.map((c, i) => (
                  <div key={c.text} className="choice-card">
                    <button className="choice-main" onClick={() => choose(c, false)} data-testid={`choice-${i}`}>
                      <LineText lang={lang} text={c.text} en={c.en} showEn={showEn} />
                    </button>
                    <HearButton url={clip(lang, c.text)} />
                  </div>
                ))}
              </div>
              {note && (
                <p className="muted small" role="status" data-testid="adventure-note">
                  {note}
                </p>
              )}
              {thinking && (
                <p className="muted small" role="status">
                  Working out what you meant…
                </p>
              )}
              <AnswerBar lang={lang} onText={heard} disabled={thinking} expected={scene.choices[0].text} sayLabel="Say what you do" placeholder="Write what you do…" />
            </>
          )}
          {scene.end && result && (
            <DoneCard
              title={scene.end === 'great' ? 'The best ending!' : 'The end'}
              detail={scene.end === 'great' ? 'You found one of the best endings.' : 'A good ending. Other choices lead somewhere else: try again?'}
              xp={result.xp}
            >
              <button className="btn" onClick={restart} data-testid="adventure-again">
                Try another path
              </button>
              <button className="btn secondary" onClick={() => navigate(`/${lang}/play/adventure`)}>
                More adventures
              </button>
            </DoneCard>
          )}
        </>
      )}
    </Screen>
  );
}
