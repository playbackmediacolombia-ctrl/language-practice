import { pinyin } from 'pinyin-pro';
import { useEffect, useRef, useState } from 'react';
import { compare, type TokenResult } from '../../../shared/compare';
import { Sticker } from '../art';
import { Heatmap } from '../Heatmap';
import { nowPlaying, playAndWait, primePlayer, type Recording, startRecording, stopAllVoices, unlockAudio } from '../lib/audio';
import { type Chant, type ChantLine, getChant, getChants, karaokePieces } from '../lib/chants';
import type { Lang } from '../lib/content';
import { tapFeedback } from '../lib/fx';
import { recordRoleplay, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { LEVELS } from '../lib/scenarios';
import { isModelReady, loadModel, transcribe } from '../lib/whisper';
import { Icon, Screen, Waveform } from '../ui';
import { LangSwitcher } from './Path';

// Practice › Music & chants: original chants and song-style verses per level, sung by the app's
// voices over a soft beat, with the words lighting up karaoke-style. Sing along: after each line
// it's your turn on the beat, and Whisper grades it (with the heatmap; wrong tones in Mandarin).

const SING_XP = 5;
const testHook = location.search.includes('test');

export function MusicList({ lang }: { lang: Lang }) {
  const chants = getChants(lang);
  const progress = useProgress();
  return (
    <Screen title="Music & chants" back="/practice">
      <LangSwitcher lang={lang} to={(l) => `/${l}/music`} />
      <p className="muted small" style={{ margin: '0 4px' }}>
        Short original chants and songs for each level. Listen with the words lighting up, then sing along on the beat.
        {lang === 'zh' && ' The tone chants train the four tones.'}
      </p>
      {LEVELS.map((name, i) => {
        const list = chants.filter((c) => c.level === i + 1);
        if (!list.length) return null;
        return (
          <section key={name}>
            <div className="section-title">{name}</div>
            <div className="list">
              {list.map((c) => {
                const best = progress.roleplays[`${lang}:${c.id}`];
                return (
                  <button
                    key={c.id}
                    className="list-row link"
                    data-testid={`chant-${c.id}`}
                    onClick={() => {
                      tapFeedback();
                      navigate(`/${lang}/music/${c.id}`);
                    }}
                  >
                    <span className="row-icon" aria-hidden="true">
                      <Icon name={c.kind === 'tones' ? 'target' : 'speaker'} />
                    </span>
                    <span className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="row-title" lang={lang}>
                        {c.title}
                      </span>
                      <span className="row-hint">
                        {c.en} · {c.kind === 'tones' ? 'Tone chant' : c.kind === 'song' ? 'Song' : 'Chant'} · {c.lines.length} lines
                      </span>
                    </span>
                    {best !== undefined && <span className={`story-score ${best >= 0.85 ? 'full' : ''}`}>{Math.round(best * 100)}%</span>}
                    <Icon name="chevron" />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </Screen>
  );
}

/** A soft beat made in the browser (no audio files): a tick on every beat, a fuller one on the first. */
class Beat {
  private ctx: AudioContext;
  private gain: GainNode;
  private timer = 0;
  private start = 0;
  constructor(private bpm: number) {
    this.ctx = new AudioContext();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.16;
    this.gain.connect(this.ctx.destination);
  }
  get ms() {
    return 60000 / this.bpm;
  }
  play() {
    void this.ctx.resume();
    this.start = performance.now();
    let n = 0;
    const tick = () => {
      const t = this.ctx.currentTime + 0.02;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = n % 4 === 0 ? 520 : 780;
      g.gain.setValueAtTime(n % 4 === 0 ? 1 : 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g).connect(this.gain);
      o.start(t);
      o.stop(t + 0.13);
      n++;
    };
    tick();
    this.timer = window.setInterval(tick, this.ms);
  }
  /** Waits for the next first beat of a bar (4 beats). */
  nextBar(): Promise<void> {
    const bar = this.ms * 4;
    const since = (performance.now() - this.start) % bar;
    return new Promise((r) => setTimeout(r, bar - since));
  }
  stop() {
    clearInterval(this.timer);
    void this.ctx.close().catch(() => {});
  }
}

const TONE_CLASS = ['tone5', 'tone1', 'tone2', 'tone3', 'tone4', 'tone5'];

export function MusicPlayer({ lang, id }: { lang: Lang; id: string }) {
  const chant = getChant(lang, id);
  if (!chant) {
    navigate(`/${lang}/music`, { replace: true });
    return null;
  }
  return <Player lang={lang} chant={chant} />;
}

type Turn = { score: number | null; tokens?: TokenResult[]; heard?: string };

function Player({ lang, chant }: { lang: Lang; chant: Chant }) {
  const [mode, setMode] = useState<'idle' | 'listen' | 'sing'>('idle');
  const [line, setLine] = useState(-1);
  const [word, setWord] = useState(-1);
  const [yourTurn, setYourTurn] = useState(false);
  const [beatOn, setBeatOn] = useState(true);
  const [english, setEnglish] = useState(false);
  const [turns, setTurns] = useState<Record<number, Turn>>({});
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const run = useRef(0);
  const beat = useRef<Beat | null>(null);
  const rec = useRef<Recording | null>(null);
  const graded = isModelReady();

  useEffect(() => {
    if (graded) loadModel().catch(() => {});
    return () => stop();
  }, []);

  function stop() {
    run.current++;
    beat.current?.stop();
    beat.current = null;
    rec.current?.stop();
    stopAllVoices();
    setLine(-1);
    setWord(-1);
    setYourTurn(false);
  }

  /** Lights up the words of `l` in time: following the clip, or a clock when it's your turn. */
  function follow(l: ChantLine, clock: () => number, my: number) {
    const tick = () => {
      if (run.current !== my) return;
      const t = clock();
      let w = -1;
      l.words.forEach((x, i) => {
        if (t >= x.start - 40) w = i;
      });
      setWord(w);
      if (t <= (l.words.at(-1)?.end ?? 0) + 300) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async function go(next: 'listen' | 'sing') {
    tapFeedback();
    stop();
    primePlayer();
    unlockAudio([]); // the mic opens later, after each line: iPhone only allows starting audio in a tap
    const my = run.current;
    setMode(next);
    setTurns({});
    setDone(null);
    const b = beatOn ? new Beat(chant.bpm) : null;
    beat.current = b;
    b?.play();
    const scores: number[] = [];
    for (let i = 0; i < chant.lines.length; i++) {
      if (run.current !== my) return;
      const l = chant.lines[i];
      await b?.nextBar();
      if (run.current !== my) return;
      setLine(i);
      setYourTurn(false);
      const clip = new URL(l.audio, location.href).href;
      follow(l, () => (nowPlaying().src === clip ? nowPlaying().time * 1000 : -1), my);
      await playAndWait(l.audio);
      if (run.current !== my) return;
      if (next === 'sing') {
        await b?.nextBar();
        if (run.current !== my) return;
        setYourTurn(true);
        const t0 = performance.now();
        follow(l, () => performance.now() - t0, my);
        if (graded) {
          try {
            const r = await startRecording(() => {}, { silence: 1.2 });
            rec.current = r;
            setAnalyser(r.analyser);
            const audio = await r.done;
            rec.current = null;
            setAnalyser(null);
            if (run.current !== my) return;
            if (audio.length) {
              const heard = await transcribe(audio, lang);
              const c = compare(l.text, heard, lang);
              scores.push(c.score);
              setTurns((t) => ({ ...t, [i]: { score: c.score, tokens: c.tokens, heard } }));
            } else setTurns((t) => ({ ...t, [i]: { score: null, heard: '' } }));
          } catch {
            setTurns((t) => ({ ...t, [i]: { score: null } }));
          }
        } else {
          // No speech model: sing along anyway, in time with the words.
          await new Promise((r) => setTimeout(r, (l.words.at(-1)?.end ?? 2000) + 600));
        }
      }
    }
    if (run.current !== my) return;
    b?.stop();
    beat.current = null;
    setLine(-1);
    setYourTurn(false);
    setMode('idle');
    if (next === 'sing') {
      const avg = scores.length ? scores.reduce((a, s) => a + s, 0) / scores.length : null;
      setDone(avg ?? -1);
      recordRoleplay(lang, chant.id, avg, SING_XP); // keeps your best average, like role-plays
    }
  }

  const toneMarks = chant.kind === 'tones' && lang === 'zh';
  return (
    <Screen title={chant.kind === 'tones' ? 'Tone chant' : chant.kind === 'song' ? 'Song' : 'Chant'} back={`/${lang}/music`}>
      <div className="card story-head">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Sticker name={chant.kind === 'tones' ? 'sounds' : 'trophy'} size={48} />
          <div className="grow">
            <div className="story-title" lang={lang}>
              {chant.title}
            </div>
            <div className="muted">{chant.en}</div>
          </div>
        </div>
        <div className="row">
          <button className="btn flex" onClick={() => (mode === 'listen' ? stop() : void go('listen'))} data-testid="chant-listen">
            <Icon name={mode === 'listen' ? 'stop' : 'play'} size={18} /> {mode === 'listen' ? 'Stop' : 'Listen'}
          </button>
          <button className="btn secondary flex" onClick={() => (mode === 'sing' ? stop() : void go('sing'))} data-testid="chant-sing">
            <Icon name={mode === 'sing' ? 'stop' : 'mic'} size={18} /> {mode === 'sing' ? 'Stop' : 'Sing along'}
          </button>
        </div>
        <div className="row story-toggles">
          <label className="chip-toggle">
            <input type="checkbox" checked={beatOn} onChange={(e) => setBeatOn(e.target.checked)} /> Beat
          </label>
          <label className="chip-toggle">
            <input type="checkbox" checked={english} onChange={(e) => setEnglish(e.target.checked)} /> English
          </label>
        </div>
        {!graded && <p className="muted small" style={{ margin: 0 }}>Download the speech model in Settings to get your singing graded.</p>}
      </div>

      <div className="karaoke" data-testid="karaoke">
        {chant.lines.map((l, i) => {
          const active = i === line;
          return (
            <div key={i} className={['karaoke-line', active && 'active', active && yourTurn && 'you'].filter(Boolean).join(' ')} data-testid="karaoke-line">
              {active && yourTurn && <div className="karaoke-turn">Your turn: sing it!</div>}
              <p className="karaoke-text" lang={lang}>
                {karaokePieces(l).map((p, k) =>
                  p.word === null ? (
                    <span key={k}>{p.text}</span>
                  ) : (
                    <span key={k} className={active && p.word === word ? 'kw now' : active && p.word < word ? 'kw sung' : 'kw'} data-word={p.word}>
                      {toneMarks
                        ? [...p.text].map((ch, c) => {
                            const py = /\p{Script=Han}/u.test(ch) ? pinyin(ch, { toneType: 'num' }) : '';
                            const tone = Number(py.slice(-1)) || 5;
                            return (
                              <ruby key={c} className={TONE_CLASS[tone]}>
                                {ch}
                                <rt>{py ? pinyin(ch) : ''}</rt>
                              </ruby>
                            );
                          })
                        : p.text}
                    </span>
                  ),
                )}
              </p>
              {l.pinyin && !toneMarks && <p className="line-pinyin">{l.pinyin}</p>}
              {english && <p className="line-en">{l.en}</p>}
              {turns[i]?.tokens && <Heatmap tokens={turns[i].tokens!} lang={lang} small />}
              {turns[i] && turns[i].score === null && <p className="muted small">Didn't catch that one.</p>}
            </div>
          );
        })}
      </div>
      {yourTurn && graded && <Waveform analyser={analyser} />}
      {toneMarks && (
        <p className="muted small tone-legend" style={{ margin: '0 4px' }}>
          <span className="tone1">1st ˉ high</span> · <span className="tone2">2nd ˊ rising</span> · <span className="tone3">3rd ˇ dip</span> ·{' '}
          <span className="tone4">4th ˋ falling</span>
        </p>
      )}
      {done !== null && (
        <div className="card grade ok" data-testid="chant-done">
          <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{done >= 0 ? `Sung! ${Math.round(done * 100)}% on average` : 'Sung!'}</div>
          <p style={{ margin: 0 }}>+{SING_XP} XP. Sing it again any time; it gets easier with the beat.</p>
        </div>
      )}
      {testHook && <span hidden data-testid="chant-state" data-line={line} data-word={word} data-you={yourTurn ? '1' : '0'} />}
    </Screen>
  );
}
