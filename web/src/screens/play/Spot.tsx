import { useEffect, useMemo, useRef, useState } from 'react';
import { primePlayer, stopPhrase, unlockAudio } from '../../lib/audio';
import type { Lang } from '../../lib/content';
import { haptic, sfx, tapFeedback } from '../../lib/fx';
import { type Band, BANDS, clip, type PlayData, shuffled } from '../../lib/play';
import { recordPlay } from '../../lib/progress';
import { navigate } from '../../lib/router';
import { Icon, Screen } from '../../ui';
import { BirdSays, DoneCard, pinyinOf, say } from './common';

// Spot the mistake: the bird says something with one small mistake in it. Tap the word that's
// wrong, then pick the fix; the bird says it again, right, and you see why.

const testHook = location.search.includes('test');
const PER_SENTENCE_XP = 2;

export function SpotScreen({ lang, data, band }: { lang: Lang; data: PlayData; band: Band }) {
  const items = data.spot.filter((s) => s.band === band);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [found, setFound] = useState(false);
  const [missed, setMissed] = useState<number | null>(null); // a word tapped that was fine
  const [fixed, setFixed] = useState<string | null>(null);
  const [wrongFix, setWrongFix] = useState<string | null>(null);
  const [clean, setClean] = useState(0); // sentences done without a slip
  const [slipped, setSlipped] = useState(false);
  const [talking, setTalking] = useState(false);
  const [xp, setXp] = useState<number | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopPhrase();
    };
  }, []);
  const item = items[i];
  const sentence = item ? item.words.join(data.join) : '';
  const right = item ? item.words.map((w, k) => (k === item.bad ? item.fix : w)).join(data.join) : '';
  const options = useMemo(() => (item ? shuffled(item.options) : []), [i]);
  const speak = (text: string) => void say(clip(lang, text), (u) => alive.current && setTalking(!!u));

  useEffect(() => {
    if (!started) return;
    if (item) {
      if (testHook) Object.assign(window, { __spot: { bad: item.bad, fix: item.fix } });
      speak(sentence);
    } else if (xp === null) {
      setXp(recordPlay(lang, 'spot', String(band), clean / items.length, clean * PER_SENTENCE_XP + (items.length - clean)));
      sfx('complete');
    }
  }, [started, i]);

  if (!items.length) {
    navigate(`/${lang}/play/spot`, { replace: true });
    return null;
  }

  const tapWord = (k: number) => {
    if (found) return;
    tapFeedback();
    if (k === item.bad) {
      setFound(true);
      setMissed(null);
      sfx('correct');
    } else {
      setMissed(k);
      setSlipped(true);
      sfx('wrong');
      haptic('error');
    }
  };
  const pickFix = (o: string) => {
    tapFeedback();
    if (o !== item.fix) {
      setWrongFix(o);
      setSlipped(true);
      sfx('wrong');
      haptic('error');
      return;
    }
    setFixed(o);
    sfx('correct');
    haptic('success');
    if (!slipped) setClean((n) => n + 1);
    speak(right);
  };
  const next = () => {
    tapFeedback();
    setFound(false);
    setMissed(null);
    setFixed(null);
    setWrongFix(null);
    setSlipped(false);
    setI((n) => n + 1);
  };

  return (
    <Screen title="Spot the mistake" back={`/${lang}/play/spot`}>
      {!started ? (
        <div className="card start-card" data-testid="spot-intro">
          <BirdSays pose="read" lang={lang} />
          <p className="muted start-kicker">{BANDS[band]}</p>
          <div className="start-title">The bird makes {items.length} mistakes</div>
          <p className="muted">Each sentence has one small mistake. Tap the wrong word, then choose the fix.</p>
          <button
            className="btn"
            data-testid="spot-start"
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
      ) : item ? (
        <>
          <div className="muted small" style={{ margin: '0 4px' }}>
            Sentence {i + 1} of {items.length}
          </div>
          <BirdSays pose={fixed ? 'cheer' : found ? 'oops' : 'wave'} lang={lang} talking={talking} url={clip(lang, fixed ? right : sentence)} text={fixed ? right : undefined} en={fixed ? item.en : undefined}>
            <p className="muted small" style={{ margin: 0 }}>
              {fixed ? 'Oops, you caught me! I meant:' : found ? 'Oh! What should I have said?' : 'Did I say that right? Tap the wrong word.'}
            </p>
          </BirdSays>
          <div className="card spot-card" data-testid="spot-sentence">
            <div className="spot-words" lang={lang}>
              {item.words.map((w, k) => (
                <button
                  key={k}
                  className={`spot-word ${k === item.bad && found ? (fixed ? 'fixed' : 'found') : ''} ${missed === k ? 'shake' : ''}`}
                  onClick={() => tapWord(k)}
                  data-testid={`spot-word-${k}`}
                >
                  {k === item.bad && fixed ? fixed : w}
                  {lang === 'zh' && <span className="spot-pinyin">{pinyinOf(lang, k === item.bad && fixed ? fixed : w)}</span>}
                </button>
              ))}
            </div>
            {missed !== null && !found && (
              <p className="small wrong-text" role="status">
                That one's fine. Look again!
              </p>
            )}
            {(found || fixed) && <p className="muted small">{item.en}</p>}
          </div>
          {found && !fixed && (
            <div className="choice-list" data-testid="spot-fixes">
              {options.map((o) => (
                <button key={o} className={`choice-main choice-card ${wrongFix === o ? 'shake' : ''}`} onClick={() => pickFix(o)} data-testid="spot-fix" lang={lang}>
                  {o}
                </button>
              ))}
            </div>
          )}
          {fixed && (
            <>
              <p className="small ok-text" role="status" data-testid="spot-why">
                {item.why}
              </p>
              <button className="btn" onClick={next} data-testid="spot-next">
                {i + 1 < items.length ? 'Next sentence' : 'Finish'}
              </button>
            </>
          )}
        </>
      ) : (
        xp !== null && (
          <DoneCard title="Nice catch!" detail={`${clean} of ${items.length} fixed without a slip.`} xp={xp}>
            <button className="btn" onClick={() => navigate(`/${lang}/play/spot`)}>
              Done
            </button>
          </DoneCard>
        )
      )}
    </Screen>
  );
}
