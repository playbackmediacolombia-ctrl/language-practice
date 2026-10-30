import { useEffect, useRef, useState } from 'react';
import { Sticker } from '../art';
import { CharacterStage } from '../characters/Stage';
import { type Feedback, playAndWait, primePlayer, type Recording, sayFeedback, speakDevice, startRecording, stopAllVoices, unlockAudio } from '../lib/audio';
import { type Lang, LANGS } from '../lib/content';
import { currentLevel, saveSpoken } from '../lib/course';
import { haptic, sfx, tapFeedback } from '../lib/fx';
import { pitchTrack, toContour } from '../lib/pitch';
import { completeLesson, saveCorrection, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { gradeSpeech } from '../lib/speechGrade';
import { audioUrl, nextReply, PROBLEM_TEXT, type TalkError, type TalkMessage, type TalkProblem, type TalkReply } from '../lib/talk';
import { checkTones } from '../lib/tones';
import { isModelReady, loadModel, transcribe } from '../lib/whisper';
import { DownloadModel } from '../SpeakCoach';
import { Icon, Screen, Waveform } from '../ui';
import { AdultGateScreen } from './AdultGate';

// The Advanced and Fluent conversation: tap once and it's back-and-forth by voice. It listens,
// stops when you pause, answers out loud and listens again. A real mistake is corrected right
// there, out loud: you say it again, it checks, and the conversation carries on. A small slip gets
// a passing recast, and if you're right it just keeps talking. Every correction goes on a card and
// into Mistakes and the Notebook.

const TOPICS = [
  { id: 'daily', title: 'Daily life' },
  { id: 'travel', title: 'Travel' },
  { id: 'work', title: 'Work' },
  { id: 'debate', title: 'Debate' },
  { id: 'flirting', title: 'Flirting', adult: true },
] as const;

const XP = 15;
const QUIET_TRIES = 3; // listens this many times for an answer before asking you to tap
const REPEAT_TRIES = 2; // tries at saying a correction before carrying on anyway

type Card = { said: string; better: string; why: string; pinyin?: string; severity: 'slip' | 'mistake' };
type Line = { role: 'model'; text: string; pinyin?: string; en: string } | { role: 'user'; text: string };
type Phase = 'pick' | 'thinking' | 'speaking' | 'listening' | 'heard' | 'checking' | 'paused' | 'ended';

const testHook = location.search.includes('test');

export function LiveTutor({ lang }: { lang: Lang }) {
  const progress = useProgress();
  const name = LANGS.find((l) => l.id === lang)!.name;
  const level = currentLevel(progress, lang);
  const [phase, setPhase] = useState<Phase>('pick');
  const [lines, setLines] = useState<Line[]>([]);
  const [card, setCard] = useState<Card | null>(null);
  const [cards, setCards] = useState(0);
  const [repeating, setRepeating] = useState<string | null>(null); // the corrected line you're saying again
  const [problem, setProblem] = useState<TalkProblem | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [shownEn, setShownEn] = useState<Set<number>>(new Set());
  const [needModel, setNeedModel] = useState(false);
  const [askAge, setAskAge] = useState(false);
  const topic = useRef('daily');
  const history = useRef<TalkMessage[]>([]);
  const recording = useRef<Recording | null>(null);
  const run = useRef(0); // ending or leaving stops whatever is in flight
  const voiceOn = useRef(progress.voice);
  voiceOn.current = progress.voice;
  const end = useRef<HTMLDivElement>(null);
  const retry = useRef<() => void>(() => {});

  useEffect(
    () => () => {
      run.current++;
      recording.current?.stop();
      stopAllVoices();
    },
    [],
  );
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [lines.length, phase, card]);
  if (testHook) Object.assign(window, { __tutor: { phase, repeating, topic: topic.current, history: history.current } });

  const live = (me: number) => run.current === me;
  const say = async (name: Feedback) => {
    if (voiceOn.current) await sayFeedback(name);
  };

  /** Your turn on the mic. Resolves with the samples, or null if it heard nothing. */
  async function hear(me: number, silence: number): Promise<Float32Array | null> {
    setNote(null);
    const rec = await startRecording(() => live(me) && setPhase('heard'), { silence });
    recording.current = rec;
    setAnalyser(rec.analyser);
    setPhase('listening');
    try {
      const audio = await rec.done;
      return audio.length ? audio : null;
    } finally {
      recording.current = null;
      setAnalyser(null);
    }
  }

  /** The partner's next line, said out loud, and what comes after it. */
  async function ask(me: number, extra: { resume?: boolean; toneNote?: string } = {}) {
    setPhase('thinking');
    setProblem(null);
    retry.current = () => void ask(me, extra);
    let reply: TalkReply;
    try {
      reply = await nextReply({ lang, level, mode: 'tutor', topic: topic.current, history: history.current.slice(-40), voice: true, ...extra });
    } catch (e) {
      if (!live(me)) return;
      setProblem((e as TalkError).problem ?? 'unavailable');
      setPhase('paused');
      return;
    }
    if (!live(me)) return;
    history.current = [...history.current, { role: 'model', text: reply.reply }];
    setLines((l) => [...l, { role: 'model', text: reply.reply, pinyin: reply.pinyin, en: reply.translation }]);
    const lastSaid = history.current.at(-2);
    const fix = !extra.resume && lastSaid?.role === 'user' ? reply.correction : null;
    if (fix) {
      const severity = fix.severity === 'mistake' ? 'mistake' : 'slip';
      setCard({ said: lastSaid!.text, better: fix.corrected, why: fix.explanation, pinyin: fix.pinyin, severity });
      setCards((n) => n + 1);
      saveCorrection({ lang, said: lastSaid!.text, better: fix.corrected, why: fix.explanation, pinyin: fix.pinyin || undefined });
      saveSpoken(lang, { text: fix.corrected, en: fix.en || fix.explanation, pinyin: fix.pinyin || undefined });
      sfx('wrong');
      haptic('error');
    }
    setPhase('speaking');
    if (reply.audio) {
      const url = audioUrl(reply.audio);
      setSpeaking(url);
      await playAndWait(url);
      URL.revokeObjectURL(url);
    } else {
      setSpeaking('device');
      await speakDevice(reply.reply, lang);
    }
    setSpeaking(null);
    if (!live(me)) return;
    if (fix?.severity === 'mistake') void repeat(me, fix.corrected, fix.pinyin || undefined);
    else void answer(me);
  }

  /** Listens for what you say next and sends it. Silence isn't an answer, but it's never ignored for long. */
  async function answer(me: number) {
    setRepeating(null);
    retry.current = () => void answer(me);
    for (let quiet = 0; quiet < QUIET_TRIES; quiet++) {
      let audio: Float32Array | null;
      try {
        audio = await hear(me, 1.8);
      } catch (e) {
        if (live(me)) stuck(e);
        return;
      }
      if (!live(me)) return;
      if (!audio) continue;
      // Read the pitch first: transcribe() takes the samples on its way to the Whisper worker.
      const pitch = lang === 'zh' ? toContour(pitchTrack(audio)) : null;
      setPhase('checking');
      let text: string;
      try {
        text = (await transcribe(audio, lang)).trim();
      } catch (e) {
        if (live(me)) stuck(e);
        return;
      }
      if (!live(me)) return;
      if (!text) continue;
      setCard(null);
      history.current = [...history.current, { role: 'user', text }];
      setLines((l) => [...l, { role: 'user', text }]);
      const tone = pitch ? checkTones(text, undefined, pitch, null) : null;
      void ask(me, tone && !tone.ok ? { toneNote: `"${tone.syllable}" should be tone ${tone.tone}` } : {});
      return;
    }
    setPhase('paused');
    setNote("I didn't hear you, tap the mic to try again.");
    await say('nohear');
  }

  /** Say the corrected line again: it checks, then the conversation carries on. */
  async function repeat(me: number, corrected: string, pinyin?: string) {
    setRepeating(corrected);
    retry.current = () => void repeat(me, corrected, pinyin);
    let said = '';
    for (let n = 0; n < REPEAT_TRIES; n++) {
      let audio: Float32Array | null;
      try {
        audio = await hear(me, 1.8);
      } catch (e) {
        if (live(me)) stuck(e);
        return;
      }
      if (!live(me)) return;
      if (!audio) continue;
      const pitch = lang === 'zh' ? toContour(pitchTrack(audio)) : null;
      setPhase('checking');
      let text = '';
      try {
        text = (await transcribe(audio, lang)).trim();
      } catch (e) {
        if (live(me)) stuck(e);
        return;
      }
      if (!live(me)) return;
      said = text || said;
      const v = gradeSpeech({ lang, text: corrected, heard: text, tone: checkTones(corrected, pinyin, pitch, null) });
      setPhase('speaking');
      if (v.grade === 'great') {
        sfx('correct');
        haptic('success');
        await say('great');
        if (!live(me)) return;
        said = corrected;
        break;
      }
      if (n + 1 < REPEAT_TRIES) {
        await say(v.grade === 'close' ? 'close' : 'retry');
        if (!live(me)) return;
      }
    }
    setRepeating(null);
    if (said) {
      history.current = [...history.current, { role: 'user', text: said }];
      setLines((l) => [...l, { role: 'user', text: said }]);
    } else history.current = [...history.current, { role: 'user', text: '…' }]; // two silent tries: it moves on all the same
    void ask(me, { resume: true });
  }

  function stuck(e: unknown) {
    setPhase('paused');
    setNote(e instanceof Error ? e.message : String(e));
  }

  function start(id: string) {
    tapFeedback();
    primePlayer(); // so the replies can play by themselves on iPhone
    unlockAudio(); // and so the mic can open by itself after each reply
    topic.current = id === 'surprise' ? TOPICS.filter((t) => !('adult' in t))[Math.floor(Math.random() * 4)].id : id;
    if (!isModelReady()) return setNeedModel(true);
    loadModel().catch(() => {});
    void ask(++run.current);
  }

  function finish() {
    run.current++;
    recording.current?.stop();
    stopAllVoices();
    if (history.current.some((m) => m.role === 'user')) completeLesson(lang, null, XP);
    setPhase('ended');
  }

  if (askAge && !progress.adult) return <AdultGateScreen back="/practice" />;
  if (needModel) {
    return (
      <Screen title="Live tutor" back="/practice">
        <DownloadModel
          onReady={() => {
            setNeedModel(false);
            void ask(++run.current);
          }}
        />
      </Screen>
    );
  }

  if (phase === 'pick') {
    return (
      <Screen title="Live tutor" back="/practice">
        <div className="card start-card" data-testid="tutor-pick">
          <span className="start-sticker" aria-hidden="true">
            <Sticker name="chat" size={72} />
          </span>
          <div className="start-title">Talk in {name}</div>
          <p className="muted">
            Pick a topic and tap once. Then it's all by voice, at your level (<b>{level}</b>). If you make a mistake, it tells you and you say it again.
          </p>
          <div className="tutor-topics">
            {TOPICS.map((t) => {
              const locked = 'adult' in t && !progress.adult;
              return (
                <button key={t.id} className="btn secondary" onClick={() => (locked ? setAskAge(true) : start(t.id))} data-testid="tutor-topic" data-topic={t.id}>
                  {t.title}
                  {'adult' in t && <span className="unit-badge">18+</span>}
                </button>
              );
            })}
            <button className="btn" onClick={() => start('surprise')} data-testid="tutor-topic" data-topic="surprise">
              Surprise me
            </button>
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            Needs the internet. Your voice never leaves the phone: only the text of what you say goes to Google's Gemini AI, through Learnguage's own free server, and nothing is saved there.
          </p>
        </div>
      </Screen>
    );
  }

  const busy = phase === 'listening' || phase === 'heard';
  const status: Record<Phase, string> = {
    pick: '',
    thinking: 'Thinking…',
    speaking: 'Talking…',
    listening: repeating ? 'Say it again now' : 'Your turn: speak now',
    heard: 'Listening… stops when you pause',
    checking: 'Writing down what you said…',
    paused: 'Tap the mic',
    ended: '',
  };

  return (
    <Screen title="Live tutor" back="/practice">
      {phase !== 'ended' && progress.characters && <CharacterStage them="Tutor" topic="smalltalk" clips={[]} speaking={speaking} mood={phase === 'thinking' || phase === 'checking' ? 'thinking' : 'idle'} />}
      <div className="story-lines dialogue talk-lines" aria-live="polite" data-testid="tutor-lines">
        {lines.map((m, i) =>
          m.role === 'model' ? (
            <div key={i} className="story-line left" data-testid="tutor-ai">
              <div className="speaker">Tutor</div>
              <div className="bubble">
                <p className="line-text" lang={lang}>
                  {m.text}
                </p>
                {m.pinyin && <p className="line-pinyin">{m.pinyin}</p>}
                {shownEn.has(i) ? (
                  <p className="line-en">{m.en}</p>
                ) : (
                  <button className="link-btn small" onClick={() => setShownEn(new Set(shownEn).add(i))}>
                    Translate
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="story-line right" data-testid="tutor-me">
              <div className="speaker">You</div>
              <div className="bubble">
                <p className="line-text" lang={lang}>
                  {m.text}
                </p>
              </div>
            </div>
          ),
        )}
      </div>
      {card && (
        <div className={`card tutor-card ${card.severity}`} role="status" data-testid="tutor-card" data-severity={card.severity}>
          <div className="muted small" lang={lang}>
            You said: {card.said}
          </div>
          <div className="tutor-better" lang={lang} data-testid="tutor-better">
            {card.better}
          </div>
          {card.pinyin && <div className="pinyin small">{card.pinyin}</div>}
          <div className="small" data-testid="tutor-why">
            {card.why}
          </div>
        </div>
      )}
      <div ref={end} />
      {problem && (
        <div className="card talk-problem" role="alert" data-testid="tutor-problem">
          <p style={{ margin: 0, fontWeight: 600 }}>{PROBLEM_TEXT[problem]}</p>
          {problem !== 'quota' && (
            <button className="btn secondary" onClick={() => retry.current()} data-testid="tutor-retry">
              Try again
            </button>
          )}
        </div>
      )}
      {phase === 'ended' ? (
        <div className="card grade ok" data-testid="tutor-summary">
          <div className="start-title" style={{ fontSize: 'var(--text-lg)' }}>
            Good talk!
          </div>
          <p style={{ margin: 0 }}>
            {cards ? `${cards} ${cards === 1 ? 'correction' : 'corrections'} saved to your Mistakes review and Notebook.` : 'No corrections this time.'}
          </p>
          <button className="btn" onClick={() => navigate('/practice')}>
            Done
          </button>
        </div>
      ) : (
        <div className="lesson-foot turn-panel" data-testid="tutor-panel">
          <div className="shadow-status" aria-live="polite" data-testid="tutor-status">
            {status[phase]}
          </div>
          {busy && <Waveform analyser={analyser} />}
          {note && (
            <p style={{ color: 'var(--wrong)', margin: 0 }} data-testid="tutor-note">
              {note}
            </p>
          )}
          <div className="row turn-actions">
            {phase === 'paused' && !problem && (
              <button className="mic small" onClick={() => retry.current()} aria-label="Answer" data-testid="tutor-mic">
                <Icon name="mic" size={30} />
              </button>
            )}
            <button className="btn secondary sound-sm" onClick={finish} data-testid="tutor-end">
              <Icon name="check" size={20} /> End
            </button>
          </div>
        </div>
      )}
    </Screen>
  );
}
