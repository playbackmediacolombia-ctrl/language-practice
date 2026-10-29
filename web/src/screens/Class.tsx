import { useEffect, useMemo, useRef, useState } from 'react';
import { UnitArt } from '../art';
import { Bird, type BirdPose } from '../Bird';
import { CharacterStage } from '../characters/Stage';
import type { Mood } from '../characters/Character';
import { pictureFor } from '../Hints';
import { playAndWait, playPhrase, stopAllVoices, unlockAudio } from '../lib/audio';
import { ensureAudio } from '../lib/audioPacks';
import { classTaken, clipUrl, day1Steps, type Day1Step, type Extra, getClass, isDay1, letters, type Rule, toneNames, unitSteps, type Word } from '../lib/classes';
import type { Lang } from '../lib/content';
import { getItem, getPath, type Item } from '../lib/course';
import { tapFeedback } from '../lib/fx';
import { englishAudio } from '../lib/handsfree';
import { finishClass, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { Picture } from '../Picture';
import { Icon } from '../ui';
import { LessonFrame } from './Lesson';

// Step 1 of every unit: the Class. The teacher (an Open Peeps character) introduces each word and
// phrase one at a time, with its recording, meaning, a picture, pronunciation help and an example,
// then the unit's rules, each with a "why it works this way" note. Nothing is graded. Next goes
// at your own pace; tap anything to hear it again. Unit 1's Class is Day 1.

type Step =
  | { kind: 'talk'; step: Day1Step }
  | { kind: 'intro'; text: string; audio: string; title: string }
  | { kind: 'word'; item: Item; word: Word; n: number; of: number }
  | { kind: 'rule'; rule: Rule }
  | { kind: 'extra'; extra: Extra }
  | { kind: 'line'; extra: Extra; line: Extra['lines'][number] }
  | { kind: 'xword'; extra: Extra; word: Extra['words'][number] }
  | { kind: 'done'; text: string; audio: string };

const testHook = location.search.includes('test');

function buildSteps(lang: Lang, unitId: string, title: string): Step[] {
  const data = getClass(lang, unitId);
  if (!data) return [];
  const steps: Step[] = [];
  if (isDay1(unitId)) for (const step of day1Steps(lang)) steps.push({ kind: 'talk', step });
  else steps.push({ kind: 'intro', title, ...data.intro });
  const words = data.words.map((w) => ({ w, item: getItem(lang, w.id) })).filter((x): x is { w: Word; item: Item } => !!x.item);
  words.forEach(({ w, item }, i) => steps.push({ kind: 'word', item, word: w, n: i + 1, of: words.length }));
  for (const rule of data.rules) steps.push({ kind: 'rule', rule });
  for (const extra of data.extras) {
    steps.push({ kind: 'extra', extra });
    for (const line of extra.lines) steps.push({ kind: 'line', extra, line });
    for (const word of extra.words) steps.push({ kind: 'xword', extra, word });
  }
  steps.push({ kind: 'done', ...data.done });
  return steps;
}

/** What a step plays when it opens: the teacher's words, then the recordings. */
function stepClips(s: Step, lang: Lang): string[] {
  const u = (p?: string) => clipUrl(p);
  switch (s.kind) {
    case 'talk':
      return [u(s.step.say.audio), s.step.item ? getItem(lang, s.step.item)?.audio : undefined].filter((x): x is string => !!x);
    case 'intro':
    case 'done':
      return [u(s.audio)].filter((x): x is string => !!x);
    case 'word':
      return [s.item.audio, englishAudio(s.item.en), s.item.audio].filter((x): x is string => !!x);
    case 'rule':
      return [...s.rule.body.map((b) => u(b.audio)), u(s.rule.why.audio)].filter((x): x is string => !!x);
    case 'extra':
      return [u(s.extra.intro.audio)].filter((x): x is string => !!x);
    case 'line':
    case 'xword':
      return [u(s.kind === 'line' ? s.line.audio : s.word.audio)].filter((x): x is string => !!x);
  }
}

const POSES: Record<Step['kind'], BirdPose> = { talk: 'wave', intro: 'wave', word: 'read', rule: 'think', extra: 'globe', line: 'read', xword: 'read', done: 'dance' };
const MOODS: Record<Step['kind'], Mood> = { talk: 'happy', intro: 'wave', word: 'happy', rule: 'thinking', extra: 'happy', line: 'happy', xword: 'happy', done: 'celebrate' };

export function ClassScreen({ lang, unitId }: { lang: Lang; unitId: string }) {
  const progress = useProgress();
  useEffect(() => ensureAudio(lang), [lang]);
  const unit = getPath(lang)
    .flatMap((s) => s.units)
    .find((u) => u.id === unitId);
  const steps = useMemo(() => (unit ? buildSteps(lang, unitId, unit.title) : []), [lang, unitId, unit]);
  const [at, setAt] = useState(0);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const run = useRef(0);
  const state = unit ? unitSteps(progress, lang, unit) : null;
  const firstLesson = unit?.lessons[0];

  const play = (urls: string[]) => {
    const id = ++run.current;
    stopAllVoices();
    void (async () => {
      for (const url of urls) {
        if (run.current !== id) return;
        setSpeaking(url);
        await playAndWait(url);
        if (run.current !== id) return;
        setSpeaking(null);
        await new Promise((r) => setTimeout(r, 350));
      }
    })();
  };
  const step = steps[at];
  useEffect(() => {
    if (!step) return;
    if (testHook) (window as { __classStep?: unknown }).__classStep = { at, kind: step.kind, of: steps.length };
    play(stepClips(step, lang));
    if (step.kind === 'done' && unit) finishClass(lang, unit.id, { lessons: unit.lessons.map((l) => l.id) });
    return () => {
      run.current++;
      setSpeaking(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, step]);
  useEffect(() => () => stopAllVoices(), []);
  if (!unit || !step) {
    navigate(`/${lang}`, { replace: true });
    return null;
  }
  const go = (d: number) => {
    tapFeedback();
    unlockAudio([]);
    setAt((a) => Math.max(0, Math.min(steps.length - 1, a + d)));
  };
  const day1 = isDay1(unitId);
  const label = day1 ? 'Day 1' : unit.elective ? unit.title : 'Class';
  const said = step.kind === 'talk' ? step.step.say.text : step.kind === 'intro' || step.kind === 'done' ? step.text : step.kind === 'extra' ? step.extra.intro.text : step.kind === 'word' ? `“${step.item.en}”. Listen, and say it after me.` : step.kind === 'rule' ? (step.rule.culture ? 'A note about the culture.' : 'Here is a rule that helps.') : 'Listen, and say it after me.';

  return (
    <LessonFrame onQuit={() => navigate(`/${lang}`, { direction: 'back' })} value={(at + 1) / steps.length} hearts={null}>
      <div className="class-page" data-testid="class" data-step={step.kind} data-unit={unitId}>
        <div className="class-head">
          <span className="class-kicker" data-testid="class-kicker">
            Step 1 · {label}: {unit.title}
          </span>
          {state?.skippable && (
            <button
              className="btn ghost class-skip"
              data-testid="class-skip"
              onClick={() => {
                finishClass(lang, unit.id, { skipped: true, lessons: unit.lessons.map((l) => l.id) });
                navigate(firstLesson ? `/${lang}/learn/${firstLesson.id}` : `/${lang}`);
              }}
            >
              I know this, skip to practice
            </button>
          )}
        </div>
        <div className="class-teacher">
          <CharacterStage them="Your teacher" topic="class" role="teacher" speaking={speaking} mood={MOODS[step.kind]} clips={[]} />
          <div className="class-bubble" aria-live="polite" data-testid="teacher-says">
            {said}
          </div>
        </div>
        <section className="card class-board" key={at} data-testid="class-board">
          <Bird pose={POSES[step.kind]} size={56} className="class-bird" />
          <Board step={step} lang={lang} unitId={unitId} play={play} />
        </section>
        <div className="class-foot">
          <button className="btn secondary" onClick={() => go(-1)} disabled={at === 0} aria-label="Back">
            <Icon name="back" size={20} />
          </button>
          <button className="btn secondary" onClick={() => play(stepClips(step, lang))} aria-label="Hear it again" data-testid="class-replay">
            <Icon name="speaker" size={20} /> Again
          </button>
          {step.kind === 'done' ? (
            <button
              className="btn grow"
              data-testid="class-start-practice"
              onClick={() => navigate(firstLesson ? `/${lang}/learn/${firstLesson.id}` : `/${lang}`)}
            >
              Start practice
            </button>
          ) : (
            <button className="btn grow" onClick={() => go(1)} data-testid="class-next">
              Next
            </button>
          )}
        </div>
        {step.kind === 'done' && (
          <button className="btn ghost" onClick={() => navigate(`/${lang}`, { direction: 'back' })} data-testid="class-to-path">
            Back to the path
          </button>
        )}
        {step.kind !== 'done' && classTaken(progress, lang, unit) && (
          <p className="muted small center">You've taken this Class. It's always here to look back at, and in your Notebook.</p>
        )}
      </div>
    </LessonFrame>
  );
}

function Hear({ url, children, className = '', slow = false }: { url?: string; children: React.ReactNode; className?: string; slow?: boolean }) {
  return (
    <button className={`hear ${className}`} onClick={() => url && playPhrase(url, slow)} disabled={!url}>
      <Icon name="speaker" size={18} /> {children}
    </button>
  );
}

function Board({ step, lang, unitId, play }: { step: Step; lang: Lang; unitId: string; play: (urls: string[]) => void }) {
  switch (step.kind) {
    case 'talk':
      return <TalkBoard step={step.step} lang={lang} play={play} />;
    case 'intro':
      return (
        <div className="class-intro">
          <UnitArt unitId={unitId} size={88} />
          <h2 className="class-title">{step.title}</h2>
          <p className="muted">First the words, one at a time. Then the rules. Nothing here is graded.</p>
        </div>
      );
    case 'word':
      return <WordBoard step={step} lang={lang} unitId={unitId} />;
    case 'rule':
      return <RuleBoard rule={step.rule} lang={lang} />;
    case 'extra':
      return (
        <div className="class-intro">
          <span className="chip-new">{step.extra.kind === 'roleplay' ? 'For the role-play' : step.extra.kind === 'story' ? 'For the story' : 'For the article'}</span>
          <h2 className="class-title">{step.extra.title}</h2>
          <p className="muted">
            {step.extra.lines.length ? `${step.extra.lines.length} line${step.extra.lines.length > 1 ? 's' : ''} ` : ''}
            {step.extra.lines.length && step.extra.words.length ? 'and ' : ''}
            {step.extra.words.length ? `${step.extra.words.length} word${step.extra.words.length > 1 ? 's' : ''} ` : ''}
            you'll need for it.
          </p>
        </div>
      );
    case 'line':
      return (
        <div className="class-word">
          <span className="chip-new">For “{step.extra.title}”</span>
          <Hear url={clipUrl(step.line.audio)} className="class-target big">
            <span lang={lang}>{step.line.text}</span>
          </Hear>
          {step.line.pinyin && <p className="pinyin">{step.line.pinyin}</p>}
          <p className="class-en">{step.line.en}</p>
          <SayIt />
        </div>
      );
    case 'xword':
      return (
        <div className="class-word">
          <span className="chip-new">For “{step.extra.title}”</span>
          <Hear url={clipUrl(step.word.audio)} className="class-target big">
            <span lang={lang}>{step.word.text}</span>
          </Hear>
          <p className="class-en">{step.word.en}</p>
          <SayIt />
        </div>
      );
    case 'done':
      return (
        <div className="class-intro">
          <h2 className="class-title">Class done!</h2>
          <p className="muted">Everything from this Class is saved in your Notebook. Next: Practice, with hints and no hearts lost.</p>
        </div>
      );
  }
}

/** A gentle nudge to say it: listening and repeating is never graded here. */
function SayIt() {
  return (
    <p className="class-say" data-testid="say-it">
      <Icon name="mic" size={18} /> Now say it out loud
    </p>
  );
}

function WordBoard({ step, lang, unitId }: { step: Extract<Step, { kind: 'word' }>; lang: Lang; unitId: string }) {
  const { item, word } = step;
  const picture = item.kind === 'sound' ? undefined : pictureFor(item.en);
  const ex = word.ex ? getItem(lang, word.ex) : undefined;
  return (
    <div className="class-word" data-testid="class-word" data-item={item.id}>
      <span className="chip-new">
        New {item.kind === 'sound' ? 'sound' : item.kind === 'phrase' ? 'phrase' : 'word'} · {step.n} of {step.of}
      </span>
      <div className="class-pic">{picture ? <Picture name={picture} size={64} /> : <UnitArt unitId={unitId} size={56} />}</div>
      <Hear url={item.audio} className="class-target big">
        <span lang={lang}>{item.text}</span>
      </Hear>
      {item.pinyin && (
        <p className="pinyin" data-testid="class-pinyin">
          {item.pinyin}
        </p>
      )}
      <p className="class-en">{item.en}</p>
      <div className="class-tools">
        <Hear url={item.audio} slow>
          Slowly
        </Hear>
      </div>
      {(item.pinyin || word.tips?.length) && (
        <div className="class-tips" data-testid="class-tips">
          <div className="class-tips-head">How to say it</div>
          {item.pinyin && lang === 'zh' && <p className="small">{[...new Set(toneNames(item.pinyin))].join(' · ')}</p>}
          {word.tips?.map((t) => (
            <p key={t} className="small">
              {t}
            </p>
          ))}
        </div>
      )}
      {ex && (
        <div className="class-example" data-testid="class-example">
          <div className="class-tips-head">Example</div>
          <Hear url={ex.audio}>
            <span lang={lang}>{ex.text}</span>
          </Hear>
          {ex.pinyin && <p className="pinyin small">{ex.pinyin}</p>}
          <p className="small muted">{ex.en}</p>
        </div>
      )}
      <SayIt />
    </div>
  );
}

function RuleBoard({ rule, lang }: { rule: Rule; lang: Lang }) {
  const examples = rule.examples.map((id) => getItem(lang, id)).filter((i): i is Item => !!i);
  return (
    <div className="class-rule" data-testid="class-rule">
      <span className="chip-new">{rule.culture ? 'Culture note' : 'Rule'}</span>
      <h2 className="class-title">{rule.title}</h2>
      {rule.body.map((b) => (
        <p key={b.text}>{b.text}</p>
      ))}
      {rule.table.length > 0 && (
        <table className="tip-table">
          <tbody>
            {rule.table.map(([a, b]) => (
              <tr key={a}>
                <td lang={lang}>{a}</td>
                <td>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {examples.length > 0 && (
        <div className="class-examples">
          {examples.map((e) => (
            <Hear key={e.id} url={e.audio}>
              <span lang={lang}>{e.text}</span> <span className="muted small">{e.en}</span>
            </Hear>
          ))}
        </div>
      )}
      <div className="class-why" data-testid="class-why">
        <div className="class-tips-head">Why it works this way</div>
        <Hear url={clipUrl(rule.why.audio)}>
          <span>{rule.why.text}</span>
        </Hear>
      </div>
    </div>
  );
}

function TalkBoard({ step, lang, play }: { step: Day1Step; lang: Lang; play: (urls: string[]) => void }) {
  const item = step.item ? getItem(lang, step.item) : undefined;
  return (
    <div className="class-talk" data-testid="class-talk">
      <h2 className="class-title">{step.title}</h2>
      {step.show?.map((line) => (
        <p key={line} className="class-show" lang={lang}>
          {line}
        </p>
      ))}
      {step.tone && <TonePitch tone={step.tone} />}
      {step.letters && <Letters lang={lang} />}
      {item && (
        <Hear url={item.audio} className="class-target">
          <span lang={lang}>{item.text}</span>
          {item.pinyin && <span className="pinyin"> {item.pinyin}</span>}
          <span className="muted small"> {item.en}</span>
        </Hear>
      )}
      {item && step.repeat && (
        <div className="class-tools">
          <Hear url={item.audio} slow>
            Slowly
          </Hear>
          <button className="hear" onClick={() => play([item.audio, item.audio])}>
            <Icon name="review" size={18} /> Twice
          </button>
        </div>
      )}
      {step.repeat && <SayIt />}
    </div>
  );
}

function Letters({ lang }: { lang: Lang }) {
  return (
    <div className="class-letters" data-testid="class-letters">
      {letters(lang).map(([letter, name, audio]) => (
        <button key={letter} className="class-letter" onClick={() => playPhrase(clipUrl(audio) ?? '')} aria-label={`${letter}: ${name}`}>
          <b>{letter}</b>
          <span>{name}</span>
        </button>
      ))}
    </div>
  );
}

/** The pitch chart for Mandarin's tones: five pitch levels, each tone's shape, this one drawn bold. */
export function TonePitch({ tone }: { tone: number }) {
  const y = (level: number) => 92 - (level - 1) * 20; // level 1 (low) … 5 (high)
  const curves: Record<number, string> = {
    1: `M20 ${y(5)} L120 ${y(5)}`,
    2: `M20 ${y(3)} C60 ${y(3)} 95 ${y(3.6)} 120 ${y(5)}`,
    3: `M20 ${y(2)} C40 ${y(1)} 60 ${y(1)} 78 ${y(1.1)} C98 ${y(1.2)} 110 ${y(2.6)} 120 ${y(4)}`,
    4: `M20 ${y(5)} C60 ${y(5)} 95 ${y(3)} 120 ${y(1)}`,
  };
  const names = ['', 'high and flat', 'rising', 'dips low', 'falling', 'light and short'];
  return (
    <figure className="tone-pitch" data-testid="tone-pitch" data-tone={tone}>
      <svg viewBox="0 0 140 104" role="img" aria-label={`Pitch chart: tone ${tone === 5 ? 'neutral' : tone}, ${names[tone]}`}>
        {[1, 2, 3, 4, 5].map((l) => (
          <g key={l}>
            <line x1="14" x2="130" y1={y(l)} y2={y(l)} className="tone-grid" />
            <text x="6" y={y(l) + 3} className="tone-level">
              {l}
            </text>
          </g>
        ))}
        {[1, 2, 3, 4].map((t) => (
          <path key={t} d={curves[t]} className={t === tone ? 'tone-curve on' : 'tone-curve'} />
        ))}
        {tone === 5 && <circle cx="70" cy={y(2.5)} r="7" className="tone-dot" />}
      </svg>
      <figcaption>{tone === 5 ? 'Neutral tone: light and short' : `Tone ${tone}: ${names[tone]}`}</figcaption>
    </figure>
  );
}
