import { activityGate } from '../lib/classes';
import { TaughtFirst } from '../WordsYoullNeed';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TokenResult } from '../../../shared/compare';
import { glossKey, tokenize } from '../../../shared/tokens';
import { playPhrase, playSequence, unlockAudio } from '../lib/audio';
import { type Lang, shuffle } from '../lib/content';
import { haptic, sfx, tapFeedback } from '../lib/fx';
import { saveSpoken } from '../lib/course';
import { getProgress, recordShadowing, recordShadowLine, recordStory, recordStoryAnswer, type Speed, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { getArticles, getStories, getStory, type Gloss, LEVELS, type Line, listPath, optionEn, optionText, READING_LEVELS, type Story, STORY_TOPICS } from '../lib/stories';
import { Icon, Screen, SpeedPicker } from '../ui';
import { SpeakCoach } from '../SpeakCoach';
import { AdultGate, AdultGateScreen } from './AdultGate';
import { LangSwitcher } from './Path';
import { Heatmap } from '../Heatmap';

const STORY_XP = 10;
const SHADOW_XP = 5;

/** How a line went in shadowing: Whisper's score and the words it heard (score null: not graded). */
type LineResult = { score: number; heard?: string; tokens?: TokenResult[] };
/** Where shadowing is: hearing the line, your turn, speech heard, Whisper checking, or showing the grade. */

const testHook = location.search.includes('test');

/** Practice tab › Stories & dialogues: a story and a dialogue at each early level, then conversations. */
export function StoryList({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const hidden = progress.adult ? 0 : getStories(lang).filter((s) => s.topic === 'flirting').length;
  const stories = getStories(lang).filter((s) => progress.adult || s.topic !== 'flirting');
  return (
    <Screen title="Stories & dialogues" back="/practice">
      <LangSwitcher lang={lang} to={(l) => `/${l}/stories`} />
      <p className="muted small" style={{ margin: '0 4px' }}>
        Listen, tap any word for its meaning, then answer three questions.
      </p>
      {LEVELS.map((lv) => (
        <section key={lv.level} className="story-level">
          <div className="section-title">{lv.title}</div>
          <p className="muted small" style={{ margin: '-4px 4px 0' }}>
            {lv.about}
          </p>
          <div className="list">
            {stories
              .filter((s) => s.level === lv.level)
              .map((s) => {
                const best = progress.stories[`${lang}:${s.id}`];
                const gate = activityGate(progress, lang, 'story', s.id);
                return (
                  <button
                    key={s.id}
                    className={gate.open ? 'list-row link' : 'list-row link locked'}
                    data-testid={`story-${s.id}`}
                    data-open={gate.open}
                    onClick={() => {
                      tapFeedback();
                      navigate(`/${lang}/stories/${s.id}`);
                    }}
                  >
                    <span className="row-icon">
                      <Icon name={s.kind === 'dialogue' ? 'chat' : 'book'} />
                    </span>
                    <span className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="row-title" lang={lang}>
                        {s.title}
                      </span>
                      <span className="row-hint">
                        {s.en} · {s.topic ? STORY_TOPICS[s.topic] : s.kind === 'dialogue' ? 'Dialogue' : 'Story'} · {s.lines.length} lines
                      </span>
                      {!gate.open && <span className="row-hint lock-hint">Opens with {gate.label}'s Class</span>}
                    </span>
                    {best !== undefined && (
                      <span className={best === 1 ? 'story-score full' : 'story-score'}>
                        {Math.round(best * s.questions.length)}/{s.questions.length}
                      </span>
                    )}
                    <Icon name="chevron" />
                  </button>
                );
              })}
          </div>
        </section>
      ))}
      {hidden > 0 && <AdultGate count={`${hidden} dialogues`} />}
    </Screen>
  );
}

/** Practice › Reading: short articles at every level, with tap-to-translate. */
export function ArticleList({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const articles = getArticles(lang);
  return (
    <Screen title="Reading" back="/practice">
      <LangSwitcher lang={lang} to={(l) => `/${l}/reading`} />
      <p className="muted small" style={{ margin: '0 4px' }}>
        Short articles for every level. Tap any word for its meaning, listen sentence by sentence, then answer the questions.
        The stories are made up for practice.
      </p>
      {READING_LEVELS.map((lv) => (
        <section key={lv.level}>
          <div className="section-title">{lv.title}</div>
          <p className="muted small" style={{ margin: '-4px 4px 6px' }}>
            {lv.about}
          </p>
          <div className="list">
            {articles
              .filter((a) => a.level === lv.level)
              .map((a) => {
                const best = progress.stories[`${lang}:${a.id}`];
                const gate = activityGate(progress, lang, 'article', a.id);
                return (
                  <button
                    key={a.id}
                    className={gate.open ? 'list-row link' : 'list-row link locked'}
                    data-testid={`article-${a.id}`}
                    data-open={gate.open}
                    onClick={() => {
                      tapFeedback();
                      navigate(`/${lang}/reading/${a.id}`);
                    }}
                  >
                    <span className="row-icon">
                      <Icon name="book" />
                    </span>
                    <span className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="row-title" lang={lang}>
                        {a.title}
                      </span>
                      <span className="row-hint">
                        {a.en} · {a.lines.length} sentences
                      </span>
                      {!gate.open && <span className="row-hint lock-hint">Opens with {gate.label}'s Class</span>}
                    </span>
                    {best !== undefined && (
                      <span className={best === 1 ? 'story-score full' : 'story-score'}>
                        {Math.round(best * a.questions.length)}/{a.questions.length}
                      </span>
                    )}
                    <Icon name="chevron" />
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </Screen>
  );
}

const glossText = (g: Gloss) => (typeof g === 'string' ? g : g.en);
const glossPinyin = (g: Gloss) => (typeof g === 'string' ? undefined : g.py);

export function StoryScreen({ lang, id }: { lang: Lang; id: string }) {
  const story = getStory(lang, id);
  const [playing, setPlaying] = useState(-1); // line being read, -1 when stopped
  const [speed, setSpeed] = useState<Speed>(() => getProgress().speed);
  const [english, setEnglish] = useState(false);
  const [word, setWord] = useState<{ text: string; gloss?: Gloss; line: number } | null>(null);
  const stop = useRef<(() => void) | null>(null);
  // Shadowing: hear a line, say it back until it's right, on to the next.
  const [shadow, setShadow] = useState<{ line: number; go: number } | null>(null);
  const scores = useRef<number[]>([]);
  const from = useRef(0);
  const [results, setResults] = useState<Record<number, LineResult>>({});
  const [shadowEnd, setShadowEnd] = useState<{ average: number | null; error?: string } | null>(null);

  const stopShadow = () => setShadow(null);
  useEffect(() => () => stop.current?.(), []);
  const current = shadow?.line ?? playing;
  useEffect(() => {
    if (current >= 0) document.querySelector(`[data-line="${current}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [current]);

  if (!story) {
    navigate(`/${lang}/stories`, { replace: true });
    return null;
  }

  const nextLine = (i: number) => {
    if (i + 1 < story.lines.length) return setShadow({ line: i + 1, go: 0 });
    setShadow(null);
    const average = scores.current.length ? scores.current.reduce((a, b) => a + b, 0) / scores.current.length : null;
    if (from.current === 0) recordShadowing(lang, story.id, average, SHADOW_XP); // a whole pass counts like a short lesson
    setShadowEnd({ average });
    sfx('complete');
  };
  const lineDone = (i: number, result: LineResult) => {
    recordShadowLine(lang, result.score);
    scores.current.push(result.score);
    setResults((r) => ({ ...r, [i]: result }));
    nextLine(i);
  };

  /** Shadows from a line to the end. Call it from a tap (iOS starts audio only then). */
  const startShadow = (line: number) => {
    tapFeedback();
    unlockAudio([]);
    stop.current?.();
    from.current = line;
    scores.current = [];
    setWord(null);
    setShadowEnd(null);
    setShadow({ line, go: 0 });
    if (testHook) Object.assign(window, { __shadowAudio: new URL(story.lines[line].audio, location.href).href, __shadowLine: line });
  };

  const playAll = () => {
    tapFeedback();
    if (shadow) stopShadow();
    if (playing >= 0) {
      stop.current?.();
      return;
    }
    setWord(null);
    stop.current = playSequence(
      story.lines.map((l) => l.audio),
      0,
      speed,
      setPlaying,
    );
  };
  const playLine = (i: number) => {
    stop.current?.();
    setPlaying(-1);
    playPhrase(story.lines[i].audio, speed);
  };
  const speakers = Object.keys(story.speakers ?? {});

  return (
    <Screen title={story.kind === 'article' ? 'Reading' : story.kind === 'dialogue' ? 'Dialogue' : 'Story'} back={listPath(lang, story)}>
      <div className="card story-head">
        <div>
          {story.kind === 'article' && (
            <div className="muted small">
              Practice article (a made-up story) · <span lang={lang}>{story.place}</span>
            </div>
          )}
          <div className="story-title" lang={lang}>
            {story.title}
          </div>
          <div className="muted">{story.en}</div>
        </div>
        <div className="row">
          <button className="btn flex" onClick={playAll} data-testid="play-all">
            <Icon name={playing >= 0 ? 'stop' : 'play'} size={18} /> {playing >= 0 ? 'Stop' : 'Play all'}
          </button>
          <button className="btn secondary flex" onClick={() => (shadow ? stopShadow() : startShadow(0))} data-testid="shadow-start">
            <Icon name={shadow ? 'stop' : 'mic'} size={18} /> {shadow ? 'Stop' : 'Shadow'}
          </button>
        </div>
        <div className="row story-toggles">
          <SpeedPicker value={speed} onChange={setSpeed} />
          <label className="chip-toggle">
            <input type="checkbox" checked={english} onChange={(e) => setEnglish(e.target.checked)} /> English
          </label>
        </div>
      </div>

      <div className={`story-lines ${story.kind}`}>
        {story.lines.map((line, i) => (
          <StoryLine
            key={i}
            index={i}
            line={line}
            lang={lang}
            story={story}
            side={line.speaker ? speakers.indexOf(line.speaker) % 2 : 0}
            active={current === i}
            result={results[i]}
            english={english}
            picked={word?.line === i ? word.text : null}
            onPlay={() => (shadow ? startShadow(i) : playLine(i))}
            onWord={(text, gloss) => {
              tapFeedback();
              setWord(word?.line === i && word.text === text ? null : { text, gloss, line: i });
            }}
          />
        ))}
      </div>

      {shadowEnd && (
        <div className={`card grade ${shadowEnd.error ? 'wrong' : 'ok'}`} data-testid="shadow-done">
          {shadowEnd.error ? (
            <p style={{ margin: 0 }}>{shadowEnd.error}</p>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                Shadowing done{shadowEnd.average !== null ? `: ${Math.round(shadowEnd.average * 100)}% on average` : ''}
              </div>
              <p style={{ margin: 0 }}>
                Lines in orange or red are worth another go: tap the line, then Shadow from there.
              </p>
            </>
          )}
        </div>
      )}

      <Questions key={story.id} lang={lang} story={story} />
      {shadow && <div style={{ height: 300 }} aria-hidden="true" /> /* room to scroll past the shadowing bar */}
      {shadow && (
        <div className="lesson-foot shadow-bar" data-testid="shadow-bar">
          <div className="muted small">
            Shadowing · line {shadow.line + 1} of {story.lines.length}
          </div>
          <SpeakCoach
            key={`${shadow.line}-${shadow.go}`}
            lang={lang}
            said={{ ...story.lines[shadow.line], en: story.lines[shadow.line].en }}
            speed={speed}
            compact
            onRight={(v) => lineDone(shadow.line, { score: v.score, heard: v.heard, tokens: v.tokens })}
            onSkip={(saved) => {
              const line = story.lines[shadow.line];
              if (saved) saveSpoken(lang, { text: line.text, en: line.en, pinyin: line.pinyin });
              lineDone(shadow.line, { score: 0, heard: '' });
            }}
          />
          <div className="row">
            <button className="btn secondary flex" onClick={() => setShadow({ line: shadow.line, go: shadow.go + 1 })}>
              <Icon name="review" size={18} /> Again
            </button>
            <button className="btn secondary flex" onClick={stopShadow}>
              <Icon name="stop" size={18} /> Stop
            </button>
          </div>
        </div>
      )}

      {word && <div style={{ height: 96 }} aria-hidden="true" /> /* room to scroll past the word card */}
      {word && (
        <div className="word-sheet" role="dialog" aria-label={`${word.text}: meaning`} data-testid="word-sheet">
          <div className="grow">
            <div className="word-sheet-word" lang={lang}>
              {word.text}
              {word.gloss && glossPinyin(word.gloss) && <span className="pinyin"> {glossPinyin(word.gloss)}</span>}
            </div>
            <div className="word-sheet-en">
              {word.gloss ? glossText(word.gloss) : <>Not in the word list. The whole sentence means: “{story.lines[word.line].en}”</>}
            </div>
          </div>
          <button className="icon-btn" aria-label="Play this line" onClick={() => playLine(word.line)}>
            <Icon name="speaker" />
          </button>
          <button className="icon-btn" aria-label="Close" onClick={() => setWord(null)}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </Screen>
  );
}

function StoryLine(props: {
  index: number;
  line: Line;
  lang: Lang;
  story: Story;
  side: number;
  active: boolean;
  result?: LineResult;
  english: boolean;
  picked: string | null;
  onPlay: () => void;
  onWord: (text: string, gloss?: Gloss) => void;
}) {
  const { index, line, lang, story, side, active, result, english, picked, onPlay, onWord } = props;
  const tokens = useMemo(() => tokenize(line.text, line.seg), [line]);
  const speaker = line.speaker ? story.speakers?.[line.speaker] : undefined;
  return (
    <div className={['story-line', side ? 'right' : 'left', active && 'active'].filter(Boolean).join(' ')} data-line={index}>
      {speaker && <div className="speaker">{speaker.name}</div>}
      <div className="bubble">
        <p className="line-text" lang={lang}>
          {tokens.map((t, k) =>
            t.word ? (
              <button key={k} className={t.text === picked ? 'word picked' : 'word'} onClick={() => onWord(t.text, story.glossary[glossKey(t.text)])}>
                {t.text}
              </button>
            ) : (
              <span key={k}>{t.text}</span>
            ),
          )}
        </p>
        {line.pinyin && <p className="line-pinyin">{line.pinyin}</p>}
        {english && <p className="line-en">{line.en}</p>}
        {result && <LineGrade result={result} lang={lang} />}
        <button className="line-play" aria-label={`Play line ${index + 1}`} onClick={onPlay}>
          <Icon name="speaker" size={18} />
        </button>
      </div>
    </div>
  );
}

const gradeClass = (score: number) => (score >= 0.85 ? 'ok' : score >= 0.5 ? 'close' : 'wrong');

/** Under a shadowed line: Whisper's score and the words marked right, almost or missed. */
function LineGrade({ result, lang }: { result: LineResult; lang: Lang }) {
  return (
    <div className="line-grade" title={result.heard ? `Whisper heard: ${result.heard}` : undefined}>
      <span className={`score-chip ${gradeClass(result.score)}`}>{Math.round(result.score * 100)}%</span>
      {result.tokens?.length ? (
        <Heatmap tokens={result.tokens} lang={lang} small />
      ) : (
        <span className="muted small">{result.heard === '' ? "Didn't hear you" : ''}</span>
      )}
    </div>
  );
}

function Questions({ lang, story }: { lang: Lang; story: Story }) {
  // Options shuffled once per visit; `answer` is an index into the original order.
  const [order] = useState(() => story.questions.map((q) => shuffle(q.options.map((_, i) => i))));
  const [picked, setPicked] = useState<(number | null)[]>(() => story.questions.map(() => null));
  const [saved, setSaved] = useState(false);
  const answered = picked.filter((p) => p !== null).length;
  const right = picked.filter((p, i) => p === story.questions[i].answer).length;

  const pick = (qi: number, oi: number) => {
    if (picked[qi] !== null) return;
    const next = picked.map((p, i) => (i === qi ? oi : p));
    setPicked(next);
    const ok = oi === story.questions[qi].answer;
    recordStoryAnswer(lang, ok);
    sfx(ok ? 'correct' : 'wrong');
    haptic(ok ? 'success' : 'error');
    if (next.every((p) => p !== null) && !saved) {
      setSaved(true);
      const score = next.filter((p, i) => p === story.questions[i].answer).length / next.length;
      recordStory(lang, story.id, score, STORY_XP);
      setTimeout(() => sfx('complete'), 400);
    }
  };

  return (
    <section className="story-questions" data-testid="questions">
      <div className="section-title">Check your understanding</div>
      {story.questions.map((q, qi) => (
        <div key={qi} className="card question">
          <div className="question-q" lang={q.qEn ? lang : undefined}>
            {qi + 1}. {q.q}
          </div>
          {q.qEn && <div className="muted small">{q.qEn}</div>}
          <div className="options">
            {order[qi].map((oi) => {
              const o = q.options[oi];
              const state = picked[qi] === null ? '' : oi === q.answer ? 'picked-right' : oi === picked[qi] ? 'picked-wrong' : 'faded';
              return (
                <button key={oi} className={`btn secondary option ${state}`} disabled={picked[qi] !== null} onClick={() => pick(qi, oi)}>
                  <span lang={optionEn(o) ? lang : undefined}>{optionText(o)}</span>
                  {optionEn(o) && picked[qi] !== null && <small className="muted"> {optionEn(o)}</small>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {answered === story.questions.length && (
        <div className={`card grade ${right === story.questions.length ? 'ok' : right > 0 ? 'close' : 'wrong'}`} data-testid="story-result">
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {right}/{story.questions.length} right{right === story.questions.length ? '. You understood it all!' : ''}
          </div>
          <p style={{ margin: 0 }}>
            +{STORY_XP} XP. {right < story.questions.length ? `${story.kind === 'article' ? 'Read' : 'Listen'} again with English on, then come back.` : ''}
          </p>
          <button className="btn secondary" onClick={() => navigate(listPath(lang, story), { direction: 'back' })}>
            {story.kind === 'article' ? 'More articles' : 'More stories'}
          </button>
        </div>
      )}
    </section>
  );
}

/** A flirting dialogue opens only after the 18+ check. */
export function GatedStory(props: { lang: Lang; id: string }) {
  const { adult } = useProgress();
  const story = getStory(props.lang, props.id);
  if (!adult && story?.topic === 'flirting') return <AdultGateScreen back={`/${props.lang}/stories`} />;
  if (!story) return <StoryScreen {...props} />;
  const kind = story.kind === 'article' ? 'article' : 'story';
  return (
    <TaughtFirst lang={props.lang} kind={kind} id={story.id} title={story.en} lines={[]} back={`/${props.lang}/${kind === 'article' ? 'reading' : 'stories'}`}>
      <StoryScreen {...props} />
    </TaughtFirst>
  );
}
