import { useEffect, useRef, useState } from 'react';
import { type Lang, LANGS } from '../lib/content';
import { DAILY_MAX, dueItems, getLesson, getPath, isAdultLesson, type Item, lessonStates, mistakeItems, unitNumber } from '../lib/course';
import { tapFeedback } from '../lib/fx';
import { buildTrack, canPlayHandsFree, type Pause, segmentAt, type Track } from '../lib/handsfree';
import { addPracticeTime, completeLesson, type Progress, type Speed, useProgress } from '../lib/progress';
import { RATES } from '../lib/audio';
import { navigate } from '../lib/router';
import { Icon, ProgressBar, Screen, Segmented, SpeedPicker } from '../ui';
import { LangSwitcher } from './Path';

const HANDS_FREE_XP = 5;
const PAUSE_KEY = 'handsfree-pause';
const SECONDS_PER_WORD = 11; // for the length estimate before the track is built

type Source = { title: string; items: Item[] };

/** The words for a hands-free session: 'due', 'mistakes', 'unit-<id>' (its unlocked lessons) or a lesson id. */
function sourceFor(p: Progress, lang: Lang, id: string): Source | null {
  if (id === 'due') return { title: 'Words due today', items: dueItems(p, lang).slice(0, DAILY_MAX) };
  if (id === 'mistakes') return { title: 'Your mistakes', items: mistakeItems(p, lang).slice(0, DAILY_MAX) };
  if (id.startsWith('unit-')) {
    const unit = getPath(lang)
      .flatMap((s) => s.units)
      .find((u) => u.id === id.slice(5));
    if (!unit || (unit.adult && !p.adult)) return null;
    const states = lessonStates(p, lang);
    const lessons = unit.lessons.filter((l) => states.get(l.id) !== 'locked');
    return { title: `Unit ${unitNumber(lang, unit.id)}: ${unit.title}`, items: lessons.flatMap((l) => l.items) };
  }
  const lesson = getLesson(lang, id);
  return lesson && (p.adult || !isAdultLesson(lesson)) ? { title: lesson.title, items: lesson.items } : null;
}

const minutes = (words: number) => Math.max(1, Math.round((words * SECONDS_PER_WORD) / 60));

/** Practice tab › Hands-free audio: pick what to listen to. */
export function HandsFreeList({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const states = lessonStates(progress, lang);
  const units = getPath(lang)
    .flatMap((s) => s.units)
    .filter((u) => (progress.adult || !u.adult) && u.lessons.some((l) => states.get(l.id) !== 'locked'));
  const due = dueItems(progress, lang).filter(canPlayHandsFree).length;
  const mistakes = mistakeItems(progress, lang).filter(canPlayHandsFree).length;
  const open = (id: string) => {
    tapFeedback();
    navigate(`/${lang}/handsfree/${id}`);
  };
  const row = (id: string, icon: Parameters<typeof Icon>[0]['name'], title: string, words: number) => (
    <button key={id} className="list-row link" data-testid={`hf-${id}`} onClick={() => open(id)}>
      <span className="row-icon">
        <Icon name={icon} />
      </span>
      <span className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="row-title">{title}</span>
        <span className="row-hint">
          {words} phrase{words === 1 ? '' : 's'} · about {minutes(words)} min
        </span>
      </span>
      <Icon name="chevron" />
    </button>
  );

  return (
    <Screen title="Hands-free" back="/practice">
      <LangSwitcher lang={lang} to={(l) => `/${l}/handsfree`} />
      <p className="muted small" style={{ margin: '0 4px' }}>
        Like a podcast: you hear the English, answer out loud in the pause, then hear the right answer and say it again. Good for
        walks, the car or chores.
      </p>
      {(due > 0 || mistakes > 0) && (
        <div className="list">
          {due > 0 && row('due', 'review', 'Words due today', Math.min(due, DAILY_MAX))}
          {mistakes > 0 && row('mistakes', 'target', 'Your mistakes', Math.min(mistakes, DAILY_MAX))}
        </div>
      )}
      <div className="section-title">Units</div>
      <div className="list">
        {units.map((u) =>
          row(
            `unit-${u.id}`,
            'book',
            `${unitNumber(lang, u.id)}. ${u.title}`,
            u.lessons.filter((l) => states.get(l.id) !== 'locked').flatMap((l) => l.items).filter(canPlayHandsFree).length,
          ),
        )}
      </div>
    </Screen>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** The player: builds the session's track, then plays it with lock-screen controls. */
export function HandsFreePlayer({ lang, id }: { lang: Lang; id: string }) {
  const progress = useProgress();
  const [source] = useState(() => sourceFor(progress, lang, id));
  const items = source?.items.filter(canPlayHandsFree) ?? [];
  const [pause, setPause] = useState<Pause>(() => {
    try {
      return (localStorage.getItem(PAUSE_KEY) as Pause) || 'medium';
    } catch {
      return 'medium';
    }
  });
  const [track, setTrack] = useState<Track | null>(null);
  const [built, setBuilt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const langName = LANGS.find((l) => l.id === lang)!.name;
  // The whole track plays faster or slower, pauses included (pitch stays the same).
  const [speed, setSpeed] = useState<Speed>(progress.speed);

  // Build (or rebuild, when the pause length changes) the track.
  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    let url: string | null = null;
    setTrack(null);
    setBuilt(0);
    setError(null);
    buildTrack(items, pause, (d) => !cancelled && setBuilt(d))
      .then((t) => {
        url = t.url;
        if (cancelled) return URL.revokeObjectURL(t.url);
        setTrack(t);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items are fixed for the screen
  }, [pause]);

  // One <audio> element for the screen, with lock-screen controls.
  useEffect(() => {
    if (!track) return;
    const el = new Audio(track.url);
    el.preload = 'auto';
    audio.current = el;
    if (location.search.includes('test')) Object.assign(window, { __hfAudio: el, __hfTrack: track });
    const onTime = () => setTime(el.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setFinished(true);
      completeLesson(lang, null, HANDS_FREE_XP);
      addPracticeTime(lang, Math.round(track.duration));
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);

    const session = navigator.mediaSession;
    if (session) {
      session.metadata = new MediaMetadata({
        title: source!.title,
        artist: `Learnguage · ${langName}`,
        album: 'Hands-free',
        artwork: [{ src: new URL('icons/icon-512.png', document.baseURI).href, sizes: '512x512', type: 'image/png' }],
      });
      const jump = (delta: number) => {
        const { index } = segmentAt(track, el.currentTime);
        const target = track.segments[Math.max(0, Math.min(track.segments.length - 1, index + delta))];
        el.currentTime = target.start;
      };
      session.setActionHandler('play', () => void el.play());
      session.setActionHandler('pause', () => el.pause());
      session.setActionHandler('previoustrack', () => jump(-1));
      session.setActionHandler('nexttrack', () => jump(1));
    }
    return () => {
      el.pause();
      el.removeAttribute('src');
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      if (session) {
        session.metadata = null;
        for (const a of ['play', 'pause', 'previoustrack', 'nexttrack'] as const) session.setActionHandler(a, null);
      }
      audio.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set up once per track
  }, [track]);

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = RATES[speed];
  }, [speed, track]);

  if (!source || !items.length) {
    navigate(`/${lang}/handsfree`, { replace: true });
    return null;
  }

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    tapFeedback();
    if (el.paused) {
      if (el.ended || finished) {
        el.currentTime = 0;
        setFinished(false);
      }
      el.playbackRate = RATES[speed];
      void el.play();
    } else el.pause();
  };
  const jump = (delta: number) => {
    const el = audio.current;
    if (!el || !track) return;
    tapFeedback();
    const { index } = segmentAt(track, el.currentTime);
    el.currentTime = track.segments[Math.max(0, Math.min(track.segments.length - 1, index + delta))].start;
    setTime(el.currentTime);
  };
  const choosePause = (p: Pause) => {
    audio.current?.pause();
    try {
      localStorage.setItem(PAUSE_KEY, p);
    } catch {
      // Just not remembered next time.
    }
    setPause(p);
  };

  const now = track ? segmentAt(track, time) : null;
  const item = now ? track!.segments[now.index].item : null;

  return (
    <Screen title="Hands-free" back={`/${lang}/handsfree`}>
      <div className="card" style={{ gap: 6 }}>
        <div style={{ fontWeight: 750, fontSize: 20 }}>{source.title}</div>
        <p className="muted small" style={{ margin: 0 }}>
          {items.length} phrases · {track ? `${Math.round(track.duration / 60) || 1} min` : `about ${minutes(items.length)} min`} · {langName}
        </p>
      </div>

      <div className="card hf-now" data-testid="hf-now" aria-live="polite">
        {!track ? (
          error ? (
            <p style={{ color: 'var(--wrong)', margin: 0 }}>Couldn't prepare the audio: {error}</p>
          ) : (
            <>
              <p className="muted" style={{ margin: 0 }}>
                Preparing the audio… {Math.round(built * 100)}%
              </p>
              <ProgressBar value={built} />
            </>
          )
        ) : finished ? (
          <div data-testid="hf-done">
            <div style={{ fontSize: 22, fontWeight: 750 }}>All done! +{HANDS_FREE_XP} XP</div>
            <p className="muted" style={{ margin: 0 }}>
              Play it again, or pick another unit.
            </p>
          </div>
        ) : (
          <>
            <p className="muted small" style={{ margin: 0 }}>
              {now!.index + 1} of {track.segments.length}
            </p>
            <div className="hf-english">{item!.en}</div>
            {now!.revealed ? (
              <div data-testid="hf-answer">
                <div className="hf-target" lang={lang}>
                  {item!.text}
                </div>
                {item!.pinyin && <div className="pinyin">{item!.pinyin}</div>}
              </div>
            ) : (
              <div className="muted hf-prompt">{time > 0 || playing ? `Say it in ${langName}…` : 'Press play'}</div>
            )}
          </>
        )}
      </div>

      <div className="hf-controls">
        <button className="icon-btn hf-skip" aria-label="Previous phrase" disabled={!track} onClick={() => jump(-1)}>
          <Icon name="back" size={30} />
        </button>
        <button className="btn hf-play" aria-label={playing ? 'Pause' : 'Play'} data-testid="hf-play" disabled={!track} onClick={toggle}>
          <Icon name={playing ? 'pause' : 'play'} size={34} />
        </button>
        <button className="icon-btn hf-skip" aria-label="Next phrase" disabled={!track} onClick={() => jump(1)}>
          <Icon name="chevron" size={30} />
        </button>
      </div>
      {track && (
        <div className="row hf-time">
          <span className="muted small">{fmt(time)}</span>
          <div className="grow">
            <ProgressBar value={time / track.duration} />
          </div>
          <span className="muted small">{fmt(track.duration)}</span>
        </div>
      )}

      <div className="card" style={{ gap: 10 }}>
        <div style={{ fontWeight: 650 }}>Time to answer</div>
        <Segmented
          label="Time to answer"
          value={pause}
          onChange={choosePause}
          options={[
            { value: 'short', label: 'Short' },
            { value: 'medium', label: 'Medium' },
            { value: 'long', label: 'Long' },
          ]}
        />
        <div className="row">
          <span className="grow" style={{ fontWeight: 650 }}>
            Speed
          </span>
          <SpeedPicker value={speed} onChange={setSpeed} />
        </div>
      </div>

      <p className="muted small" style={{ margin: '0 4px' }} data-testid="hf-lock-note">
        <b>Screen locked?</b> Each session is one audio track, made so it keeps playing with the phone locked, with play, pause and
        skip on the lock screen. If it stops when you lock the phone, iOS is pausing the Home Screen app: open the app's page in
        Safari itself and play it from there. Answers aren't graded here, because the mic can't run with the screen off.
      </p>
    </Screen>
  );
}
