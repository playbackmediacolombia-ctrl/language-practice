import { useEffect, useRef, useState } from 'react';
import { primePlayer, stopPhrase, unlockAudio } from '../../lib/audio';
import type { Lang } from '../../lib/content';
import { currentLevel, hasStarted } from '../../lib/course';
import { haptic, sfx, tapFeedback } from '../../lib/fx';
import { type Band, BANDS, clip, type PlayData, plain } from '../../lib/play';
import { recordPlay, useProgress } from '../../lib/progress';
import { navigate } from '../../lib/router';
import { judgeTeach } from '../../lib/talk';
import { Icon, Screen } from '../../ui';
import { AnswerBar, BirdSays, DoneCard, HearButton, LineText, say } from './common';

// Teach the bird: the bird has forgotten a word, and you explain it in the language (out loud
// or typed). Online, the AI decides whether a native speaker would understand you, and fixes
// your sentence; offline, your explanation needs some of the word's key ideas (and not just
// the word itself). Two tries, then the bird shows one way to say it.

const PER_WORD_XP = 4;

type Verdict = { understood: boolean; reply?: string; replyEn?: string; correction?: string; why?: string };

/** Offline check: a few words long, uses a key idea, and isn't just the word itself. */
export function explainsIt(said: string, word: string, keywords: string[], lang: Lang): boolean {
  const s = plain(said);
  const w = plain(word).replace(/^(el|la|los|las|le|les|l|un|une|o|a|os|as|il|lo|gli|i)\s+/, '');
  const rest = s.split(w).join(' ').trim();
  const long = lang === 'zh' ? rest.replace(/\s/g, '').length >= 4 : rest.split(' ').filter(Boolean).length >= 3;
  return long && keywords.some((k) => rest.includes(plain(k)));
}

export function TeachScreen({ lang, data, band }: { lang: Lang; data: PlayData; band: Band }) {
  const words = data.teach.words.filter((w) => w.band === band);
  const lines = data.teach.lines;
  const progress = useProgress();
  const level = hasStarted(progress, lang) ? currentLevel(progress, lang) : 'Beginner';
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [tries, setTries] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [checking, setChecking] = useState(false);
  const [talking, setTalking] = useState(false);
  const [taught, setTaught] = useState(0);
  const [xp, setXp] = useState<number | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopPhrase();
    };
  }, []);
  const w = words[i];
  const intro = w ? lines.intro.text.replace('{w}', w.word) : '';

  const speak = (text: string) => void say(clip(lang, text), (u) => alive.current && setTalking(!!u));
  useEffect(() => {
    if (started && w) speak(intro);
  }, [started, i]);
  useEffect(() => {
    if (!started || w || xp !== null) return;
    setXp(recordPlay(lang, 'teach', String(band), taught / words.length, taught * PER_WORD_XP));
    sfx('complete');
  }, [started, i]);

  if (!words.length) {
    navigate(`/${lang}/play/teach`, { replace: true });
    return null;
  }

  const heard = async (said: string) => {
    setChecking(true);
    let v: Verdict;
    try {
      if (!navigator.onLine) throw new Error('offline');
      const r = await judgeTeach(lang, level, w.word, w.en, said);
      v = { understood: r.understood, reply: r.reply, replyEn: r.translation, correction: r.correction, why: r.why };
    } catch {
      v = { understood: explainsIt(said, w.word, w.keywords, lang) };
    }
    if (!alive.current) return;
    setChecking(false);
    setVerdict(v);
    setTries((t) => t + 1);
    sfx(v.understood ? 'correct' : 'wrong');
    haptic(v.understood ? 'success' : 'error');
    if (v.understood) setTaught((n) => n + 1);
    speak(v.reply ?? (v.understood ? lines.yes.text : lines.no.text));
  };

  const next = () => {
    tapFeedback();
    setVerdict(null);
    setTries(0);
    setI((n) => n + 1);
  };

  const gaveUp = !!verdict && !verdict.understood && tries >= 2;
  const pose = !started ? 'wave' : verdict ? (verdict.understood ? 'cheer' : 'oops') : checking ? 'think' : 'think';

  return (
    <Screen title="Teach the bird" back={`/${lang}/play/teach`}>
      {!started ? (
        <div className="card start-card" data-testid="teach-intro">
          <BirdSays pose="wave" lang={lang} />
          <p className="muted start-kicker">{BANDS[band]}</p>
          <div className="start-title">The bird forgot {words.length} words</div>
          <p className="muted">Explain each one in your new language, out loud or typed, so the bird remembers it. Don't just say the word: describe it!</p>
          <button
            className="btn"
            data-testid="teach-start"
            onClick={() => {
              tapFeedback();
              primePlayer();
              unlockAudio([]);
              setStarted(true);
            }}
          >
            <Icon name="play" size={18} /> Start
          </button>
        </div>
      ) : w ? (
        <>
          <div className="muted small" style={{ margin: '0 4px' }}>
            Word {i + 1} of {words.length}
          </div>
          <BirdSays
            pose={pose}
            lang={lang}
            talking={talking}
            text={verdict ? (verdict.reply ?? (verdict.understood ? lines.yes.text : lines.no.text)) : intro}
            en={verdict ? (verdict.replyEn ?? (verdict.understood ? lines.yes.en : lines.no.en)) : lines.intro.en.replace('{w}', w.word)}
            url={clip(lang, verdict ? (verdict.reply ?? (verdict.understood ? lines.yes.text : lines.no.text)) : intro)}
          />
          <div className="card teach-word" data-testid="teach-word">
            <div className="muted small">The word</div>
            <div className="teach-big" lang={lang}>
              {w.word}
            </div>
            <div className="muted">{w.en}</div>
          </div>
          {verdict?.correction && (
            <p className="small" data-testid="teach-fix">
              Even better: <span lang={lang}>{verdict.correction}</span>
              {verdict.why ? ` (${verdict.why})` : ''}
            </p>
          )}
          {gaveUp && (
            <div className="card" data-testid="teach-model">
              <div className="muted small">One way to explain it</div>
              <p className="row" style={{ alignItems: 'center' }}>
                <span className="grow">
                  <LineText lang={lang} text={w.explain} en={w.explainEn} showEn />
                </span>
                <HearButton url={clip(lang, w.explain)} />
              </p>
            </div>
          )}
          {verdict?.understood || gaveUp ? (
            <button className="btn" onClick={next} data-testid="teach-next">
              {i + 1 < words.length ? 'Next word' : 'Finish'}
            </button>
          ) : (
            <AnswerBar lang={lang} onText={heard} disabled={checking} sayLabel="Explain it" placeholder="Explain it in your new language…" expected={w.explain} />
          )}
          {checking && (
            <p className="muted small" role="status">
              The bird is thinking…
            </p>
          )}
        </>
      ) : (
        xp !== null && (
          <DoneCard title="The bird remembers!" detail={`You taught ${taught} of ${words.length} words.`} xp={xp}>
            <button className="btn" onClick={() => navigate(`/${lang}/play/teach`)}>
              Done
            </button>
          </DoneCard>
        )
      )}
    </Screen>
  );
}
