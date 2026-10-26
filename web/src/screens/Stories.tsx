import { useEffect, useMemo, useRef, useState } from 'react';
import { glossKey, tokenize } from '../../../shared/tokens';
import { playPhrase, playSequence } from '../lib/audio';
import { type Lang, shuffle } from '../lib/content';
import { haptic, sfx, tapFeedback } from '../lib/fx';
import { recordStory, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { getStories, getStory, type Gloss, LEVELS, type Line, optionEn, optionText, type Story } from '../lib/stories';
import { Icon, Screen } from '../ui';
import { LangSwitcher } from './Path';

const STORY_XP = 10;

/** Practice tab › Stories & dialogues: three levels, a story and a dialogue each. */
export function StoryList({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const stories = getStories(lang);
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
                return (
                  <button
                    key={s.id}
                    className="list-row link"
                    data-testid={`story-${s.id}`}
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
                        {s.en} · {s.kind === 'dialogue' ? 'Dialogue' : 'Story'} · {s.lines.length} lines
                      </span>
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
    </Screen>
  );
}

const glossText = (g: Gloss) => (typeof g === 'string' ? g : g.en);
const glossPinyin = (g: Gloss) => (typeof g === 'string' ? undefined : g.py);

export function StoryScreen({ lang, id }: { lang: Lang; id: string }) {
  const story = getStory(lang, id);
  const [playing, setPlaying] = useState(-1); // line being read, -1 when stopped
  const [slow, setSlow] = useState(false);
  const [english, setEnglish] = useState(false);
  const [word, setWord] = useState<{ text: string; gloss?: Gloss; line: number } | null>(null);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => () => stop.current?.(), []);
  useEffect(() => {
    if (playing >= 0) document.querySelector(`[data-line="${playing}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [playing]);

  if (!story) {
    navigate(`/${lang}/stories`, { replace: true });
    return null;
  }

  const playAll = () => {
    tapFeedback();
    if (playing >= 0) {
      stop.current?.();
      return;
    }
    setWord(null);
    stop.current = playSequence(
      story.lines.map((l) => l.audio),
      0,
      slow,
      setPlaying,
    );
  };
  const playLine = (i: number) => {
    stop.current?.();
    setPlaying(-1);
    playPhrase(story.lines[i].audio, slow);
  };
  const speakers = Object.keys(story.speakers ?? {});

  return (
    <Screen title={story.kind === 'dialogue' ? 'Dialogue' : 'Story'} back={`/${lang}/stories`}>
      <div className="card story-head">
        <div>
          <div className="story-title" lang={lang}>
            {story.title}
          </div>
          <div className="muted">{story.en}</div>
        </div>
        <button className="btn" onClick={playAll} data-testid="play-all">
          <Icon name={playing >= 0 ? 'stop' : 'play'} size={18} /> {playing >= 0 ? 'Stop' : 'Play all'}
        </button>
        <div className="row story-toggles">
          <label className="chip-toggle">
            <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> Slow
          </label>
          <label className="chip-toggle">
            <input type="checkbox" checked={english} onChange={(e) => setEnglish(e.target.checked)} /> English
          </label>
        </div>
      </div>

      <div className={story.kind === 'dialogue' ? 'story-lines dialogue' : 'story-lines'}>
        {story.lines.map((line, i) => (
          <StoryLine
            key={i}
            index={i}
            line={line}
            lang={lang}
            story={story}
            side={line.speaker ? speakers.indexOf(line.speaker) % 2 : 0}
            active={playing === i}
            english={english}
            picked={word?.line === i ? word.text : null}
            onPlay={() => playLine(i)}
            onWord={(text, gloss) => {
              tapFeedback();
              setWord(word?.line === i && word.text === text ? null : { text, gloss, line: i });
            }}
          />
        ))}
      </div>

      <Questions key={story.id} lang={lang} story={story} />

      {word && <div style={{ height: 96 }} aria-hidden="true" /> /* room to scroll past the word card */}
      {word && (
        <div className="word-sheet" role="dialog" aria-label={`${word.text}: meaning`} data-testid="word-sheet">
          <div className="grow">
            <div className="word-sheet-word" lang={lang}>
              {word.text}
              {word.gloss && glossPinyin(word.gloss) && <span className="pinyin"> {glossPinyin(word.gloss)}</span>}
            </div>
            <div className="word-sheet-en">{word.gloss ? glossText(word.gloss) : 'No translation for this word.'}</div>
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
  english: boolean;
  picked: string | null;
  onPlay: () => void;
  onWord: (text: string, gloss?: Gloss) => void;
}) {
  const { index, line, lang, story, side, active, english, picked, onPlay, onWord } = props;
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
        <button className="line-play" aria-label={`Play line ${index + 1}`} onClick={onPlay}>
          <Icon name="speaker" size={18} />
        </button>
      </div>
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
          <p style={{ margin: 0 }}>+{STORY_XP} XP. {right < story.questions.length ? 'Listen again with English on, then come back.' : ''}</p>
          <button className="btn secondary" onClick={() => navigate(`/${lang}/stories`, { direction: 'back' })}>
            More stories
          </button>
        </div>
      )}
    </section>
  );
}
