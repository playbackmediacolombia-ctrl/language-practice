import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Bird } from './Bird';
import { playAndWait, playPhrase, stopAllVoices, unlockAudio } from './lib/audio';
import { activityGate, clipUrl, wordsYoullNeed } from './lib/classes';
import type { Lang } from './lib/content';
import { tapFeedback } from './lib/fx';
import { useProgress } from './lib/progress';
import { navigate } from './lib/router';
import { Icon, Screen } from './ui';

// Before a role-play, story or article: "Words you'll need", the key lines and words with their
// recordings, so you've heard them before it's your turn. They were taught in the Class of the
// unit the activity opens with; until that Class is taken, the activity waits.

export type NeedLine = { text: string; en?: string; pinyin?: string; audio?: string };
type Kind = 'roleplay' | 'story' | 'article';
const NAMES: Record<Kind, string> = { roleplay: 'role-play', story: 'story', article: 'article' };

/** Locked until its unit's Class, then the preview, then the activity itself. */
export function TaughtFirst({ lang, kind, id, title, lines, back, children }: { lang: Lang; kind: Kind; id: string; title: string; lines: NeedLine[]; back: string; children: ReactNode }) {
  const progress = useProgress();
  const gate = activityGate(progress, lang, kind, id);
  const [ready, setReady] = useState(false);
  if (!gate.open && gate.unit)
    return (
      <Screen title={title} back={back}>
        <div className="card start-card" data-testid="taught-first-locked" style={{ gap: 12, marginTop: 24 }}>
          <Icon name="lock" size={40} style={{ color: 'var(--faint)' }} />
          <div className="start-title">Opens with {gate.label}'s Class</div>
          <p className="muted">
            This {NAMES[kind]} uses words from {gate.unit.title}. The Class teaches them first, so you've heard every one before it's your turn.
          </p>
          <button className="btn" onClick={() => navigate(`/${lang}`)}>
            Go to the path
          </button>
        </div>
      </Screen>
    );
  if (ready) return <>{children}</>;
  const taught = wordsYoullNeed(lang, kind, id);
  const all: NeedLine[] = [...lines, ...(taught?.lines ?? []).map((l) => ({ ...l, audio: clipUrl(l.audio) })), ...(taught?.words ?? []).map((w) => ({ text: w.text, en: w.en, audio: clipUrl(w.audio) }))];
  const seen = new Set<string>();
  const list = all.filter((l) => !seen.has(l.text) && seen.add(l.text));
  if (!list.length) return <>{children}</>; // nothing new in it: straight in
  return <Preview lang={lang} kind={kind} title={title} list={list} back={back} onReady={() => setReady(true)} />;
}

function Preview({ lang, kind, title, list, back, onReady }: { lang: Lang; kind: Kind; title: string; list: NeedLine[]; back: string; onReady: () => void }) {
  const [playing, setPlaying] = useState<number | null>(null);
  const run = useRef(0);
  useEffect(() => () => {
    run.current++;
    stopAllVoices();
  }, []);
  const playAll = async () => {
    const id = ++run.current;
    unlockAudio([]);
    for (let i = 0; i < list.length; i++) {
      if (run.current !== id) return;
      const url = list[i].audio;
      if (!url) continue;
      setPlaying(i);
      await playAndWait(url);
      await new Promise((r) => setTimeout(r, 500));
    }
    if (run.current === id) setPlaying(null);
  };
  return (
    <Screen title="Words you'll need" back={back}>
      <div className="card need-card" data-testid="words-youll-need">
        <div className="row">
          <Bird pose="read" size={56} />
          <div className="grow">
            <div className="card-title">{title}</div>
            <p className="muted small">Hear the key {kind === 'roleplay' ? 'lines' : 'words'} first, so you know them before it's your turn.</p>
          </div>
        </div>
        <button className="btn secondary" onClick={playAll} data-testid="need-play-all">
          <Icon name="play" size={18} /> Hear them all
        </button>
        <ul className="need-list">
          {list.map((l, i) => (
            <li key={l.text}>
              <button className={`notebook-word${playing === i ? ' active' : ''}`} onClick={() => l.audio && playPhrase(l.audio)} data-testid="need-line">
                <Icon name="speaker" size={16} />
                <span lang={lang} className="nb-text">
                  {l.text}
                </span>
                {l.pinyin && <span className="pinyin small">{l.pinyin}</span>}
                {l.en && <span className="muted small">{l.en}</span>}
              </button>
            </li>
          ))}
        </ul>
        <button
          className="btn"
          data-testid="need-ready"
          onClick={() => {
            tapFeedback();
            run.current++;
            stopAllVoices();
            onReady();
          }}
        >
          I'm ready
        </button>
      </div>
    </Screen>
  );
}
