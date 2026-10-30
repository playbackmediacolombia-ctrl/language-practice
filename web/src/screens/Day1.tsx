import { useEffect, useMemo, useRef, useState } from 'react';
import { Bird } from '../Bird';
import { clipUrl, type Day1Step, isDay1, letters } from '../lib/classes';
import { getItem, getPath, type Item, saveSpoken } from '../lib/course';
import { type Lang, shuffle } from '../lib/content';
import { DAY1_LESSONS, DAY1_XP, type Day1Key, day1Greeting, day1GreetingIntro, day1Opening, day1Pictures, day1Sounds, day1Speak, day1Title, day1Welcome, day1Words } from '../lib/day1';
import { playAndWait, playPhrase, stopAllVoices, unlockAudio } from '../lib/audio';
import { ensureAudio } from '../lib/audioPacks';
import { haptic, sfx, tapFeedback } from '../lib/fx';
import { finishDay1Lesson, markWelcomed, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { pictureFor } from '../Hints';
import { Picture } from '../Picture';
import { SpeakCoach } from '../SpeakCoach';
import { Icon } from '../ui';
import { TonePitch } from './Class';
import { LessonFrame } from './Lesson';

type Step =
  | { kind: 'opening'; text: string }
  | { kind: 'talk'; step: Day1Step }
  | { kind: 'word'; item: Item }
  | { kind: 'match'; items: Item[] }
  | { kind: 'speak'; item: Item }
  | { kind: 'done' };

function buildSteps(lang: Lang, key: Day1Key, welcome: boolean): Step[] {
  const steps: Step[] = [];
  const hello = welcome ? day1Welcome(lang) : undefined;
  if (hello) steps.push({ kind: 'talk', step: hello });
  steps.push({ kind: 'opening', text: day1Opening[key] });
  if (key === 'sounds') day1Sounds(lang).forEach((step) => steps.push({ kind: 'talk', step }));
  if (key === 'words') day1Words(lang).forEach((item) => steps.push({ kind: 'word', item }));
  if (key === 'pictures') steps.push({ kind: 'match', items: day1Pictures(lang) });
  if (key === 'speak') day1Speak(lang).forEach((item) => steps.push({ kind: 'speak', item }));
  if (key === 'greeting') {
    const intro = day1GreetingIntro(lang);
    if (intro) steps.push({ kind: 'talk', step: intro });
    day1Greeting(lang).forEach((item) => steps.push({ kind: 'speak', item }));
  }
  steps.push({ kind: 'done' });
  return steps;
}

/** What Play plays on a card. */
function clipsOf(step: Step, lang: Lang): string[] {
  if (step.kind === 'talk') return [clipUrl(step.step.say.audio), step.step.item ? getItem(lang, step.step.item)?.audio : undefined].filter((x): x is string => !!x);
  if (step.kind === 'word' || step.kind === 'speak') return [step.item.audio];
  return [];
}

export function Day1Lesson({ lang, lesson }: { lang: Lang; lesson: string }) {
  const key = DAY1_LESSONS.find((k) => k === lesson);
  const progress = useProgress();
  useEffect(() => ensureAudio(lang), [lang]);
  // Decided once, when the lesson opens: the welcome is only ever shown the one time.
  const [steps] = useState(() => (key ? buildSteps(lang, key, !progress.welcomed) : []));
  const [at, setAt] = useState(0);
  const [cleared, setCleared] = useState<Set<number>>(new Set());
  const run = useRef(0);
  const unit = useMemo(() => getPath(lang).flatMap((s) => s.units).find((u) => isDay1(u.id)), [lang]);
  useEffect(() => {
    if (key && !progress.welcomed) markWelcomed();
  }, []);
  useEffect(() => () => stopAllVoices(), []);
  const step = steps[at];
  useEffect(() => {
    if (step?.kind === 'done' && key && unit) {
      finishDay1Lesson(lang, key, DAY1_XP, [...DAY1_LESSONS], unit.id, unit.lessons.map((l) => l.id));
      sfx('complete');
      haptic('success');
    }
  }, [step?.kind]);
  if (!key || !step) {
    navigate(`/${lang}`, { replace: true });
    return null;
  }
  const back = () => navigate(`/${lang}`, { direction: 'back' });
  const go = (d: number) => {
    tapFeedback();
    run.current++;
    stopAllVoices();
    setAt((a) => Math.max(0, Math.min(steps.length - 1, a + d)));
  };
  const play = (urls: string[]) => {
    tapFeedback();
    unlockAudio([]);
    const id = ++run.current;
    stopAllVoices();
    void (async () => {
      for (const url of urls) {
        if (run.current !== id) return;
        await playAndWait(url);
        await new Promise((r) => setTimeout(r, 300));
      }
    })();
  };
  const clear = () => setCleared((c) => new Set(c).add(at));
  const clips = clipsOf(step, lang);
  const speaks = (step.kind === 'talk' && step.step.repeat && !!step.step.item) || step.kind === 'speak';
  const gated = (step.kind === 'match' || (speaks && progress.speaking)) && !cleared.has(at);
  const nextKey = DAY1_LESSONS.find((k) => k !== key && !progress.day1?.[`${lang}:${k}`]);

  return (
    <LessonFrame onQuit={back} value={(at + 1) / steps.length} hearts={null}>
      <div className="day1-page" data-testid="day1-lesson" data-lesson-key={key} data-kind={step.kind} data-at={at} data-of={steps.length}>
        <span className="class-kicker" data-testid="day1-kicker">
          Day 1: {day1Title(lang, key)}
        </span>
        <section className="card class-board" key={at}>
          {step.kind === 'opening' && (
            <div className="class-intro">
              <Bird pose="wave" size={72} />
              <h2 className="class-title">{day1Title(lang, key)}</h2>
              <p className="muted" data-testid="day1-opening">
                {step.text}
              </p>
            </div>
          )}
          {step.kind === 'talk' && <TalkCard step={step.step} lang={lang} onRight={clear} onSkip={(saved, item) => {
            if (saved) saveSpoken(lang, { id: item.id, text: item.text, en: item.en, pinyin: item.pinyin });
            clear();
          }} speaking={progress.speaking} />}
          {step.kind === 'word' && <WordCard item={step.item} lang={lang} />}
          {step.kind === 'speak' && (
            <>
              <WordCard item={step.item} lang={lang} />
              {progress.speaking ? (
                <SpeakCoach
                  lang={lang}
                  said={step.item}
                  start="tap"
                  advance={false}
                  onRight={clear}
                  onSkip={(saved) => {
                    if (saved) saveSpoken(lang, { id: step.item.id, text: step.item.text, en: step.item.en, pinyin: step.item.pinyin });
                    clear();
                  }}
                />
              ) : (
                <p className="muted small">Speaking exercises are off in Settings.</p>
              )}
            </>
          )}
          {step.kind === 'match' && <PictureMatch lang={lang} items={step.items} onDone={clear} />}
          {step.kind === 'done' && (
            <div className="class-intro" data-testid="day1-done">
              <span className="day1-num" style={{ background: '#0a7d43' }}>
                <Icon name="check" size={24} />
              </span>
              <h2 className="class-title">{day1Title(lang, key)} done!</h2>
              <p className="muted">It has its checkmark on the path, and you can redo it any time.</p>
            </div>
          )}
        </section>
        {step.kind === 'done' ? (
          <div className="day1-foot" style={{ flexDirection: 'column' }}>
            {nextKey && (
              <button className="btn" onClick={() => navigate(`/${lang}/day1/${nextKey}`, { replace: true })} data-testid="day1-next-lesson">
                Next: {day1Title(lang, nextKey)}
              </button>
            )}
            <button className={nextKey ? 'btn secondary' : 'btn'} onClick={back} data-testid="day1-to-path">
              Back to the path
            </button>
          </div>
        ) : (
          <div className="day1-foot">
            <button className="btn secondary" onClick={() => go(-1)} disabled={at === 0} aria-label="Back" data-testid="day1-back">
              <Icon name="back" size={20} />
            </button>
            {clips.length > 0 && !speaks && (
              <button className="btn secondary" onClick={() => play(clips)} data-testid="day1-play">
                <Icon name="speaker" size={20} /> Play
              </button>
            )}
            {step.kind === 'talk' && speaks && (
              <button className="btn secondary" onClick={() => play(clips.slice(0, 1))} aria-label="Hear the explanation" data-testid="day1-play">
                <Icon name="review" size={20} />
              </button>
            )}
            <button className="btn grow" disabled={gated} onClick={() => go(1)} data-testid="day1-next">
              Next
            </button>
          </div>
        )}
      </div>
    </LessonFrame>
  );
}

function TalkCard({ step, lang, speaking, onRight, onSkip }: { step: Day1Step; lang: Lang; speaking: boolean; onRight: () => void; onSkip: (saved: boolean, item: Item) => void }) {
  const item = step.item ? getItem(lang, step.item) : undefined;
  return (
    <div className="class-talk" data-testid="class-talk">
      <h2 className="class-title">{step.title}</h2>
      <p className="day1-say" data-testid="day1-say">
        {step.say.text}
      </p>
      {step.show?.map((line) => (
        <p key={line} className="class-show" lang={lang}>
          {line}
        </p>
      ))}
      {step.tone && <TonePitch tone={step.tone} />}
      {step.letters && (
        <div className="class-letters" data-testid="class-letters">
          {letters(lang).map(([letter, name, audio]) => (
            <button key={letter} className="class-letter" onClick={() => playPhrase(clipUrl(audio) ?? '')} aria-label={`${letter}: ${name}`}>
              <b>{letter}</b>
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}
      {item && (
        <div className="day1-word">
          <p className="target" lang={lang} style={{ fontSize: 34 }}>
            {item.text}
          </p>
          {item.pinyin && <p className="pinyin">{item.pinyin}</p>}
          <p className="muted small">{item.en}</p>
        </div>
      )}
      {item && step.repeat && speaking && <SpeakCoach lang={lang} said={item} start="tap" advance={false} drill={item.kind === 'sound'} onRight={onRight} onSkip={(saved) => onSkip(saved, item)} />}
    </div>
  );
}

function WordCard({ item, lang }: { item: Item; lang: Lang }) {
  const picture = pictureFor(item.en);
  return (
    <div className="day1-word" data-testid="day1-word" data-item={item.id}>
      {picture && <Picture name={picture} size={72} />}
      <p className="target" lang={lang} style={{ fontSize: 36 }}>
        {item.text}
      </p>
      {item.pinyin && <p className="pinyin">{item.pinyin}</p>}
      <p className="muted">{item.en}</p>
    </div>
  );
}

function PictureMatch({ lang, items, onDone }: { lang: Lang; items: Item[]; onDone: () => void }) {
  const [pics] = useState(() => shuffle(items));
  const [words] = useState(() => shuffle(items));
  const [picked, setPicked] = useState<string | null>(null);
  const [word, setWord] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState(false);
  const check = (pic: string | null, said: string | null) => {
    setPicked(pic);
    setWord(said);
    if (!pic || !said) return;
    setPicked(null);
    setWord(null);
    if (pic === said) {
      sfx('correct');
      const done = [...matched, pic];
      setMatched(done);
      if (done.length === items.length) onDone();
    } else {
      sfx('wrong');
      haptic('error');
      setWrong(true);
      setTimeout(() => setWrong(false), 500);
    }
  };
  const cls = (id: string, sel: string | null) => ['btn secondary pair', matched.includes(id) && 'picked-right faded', sel === id && 'selected', wrong && 'shake'].filter(Boolean).join(' ');
  return (
    <div className="day1-match" data-testid="picture-match">
      <div className="day1-match-col">
        {pics.map((i) => {
          const name = pictureFor(i.en);
          return (
            <button key={i.id} className={cls(i.id, picked)} disabled={matched.includes(i.id)} onClick={() => check(i.id, word)} data-pic={i.id} aria-label={`Picture: ${i.en}`}>
              {name ? <Picture name={name} size={52} /> : i.en}
            </button>
          );
        })}
      </div>
      <div className="day1-match-col">
        {words.map((i) => (
          <button
            key={i.id}
            className={cls(i.id, word)}
            disabled={matched.includes(i.id)}
            onClick={() => {
              playPhrase(i.audio);
              check(picked, i.id);
            }}
            data-word={i.id}
            lang={lang}
          >
            {i.pinyin ? `${i.text}\n${i.pinyin}` : i.text}
          </button>
        ))}
      </div>
    </div>
  );
}

