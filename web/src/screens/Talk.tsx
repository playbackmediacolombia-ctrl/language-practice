import { useEffect, useRef, useState } from 'react';
import { Sticker } from '../art';
import { CharacterStage } from '../characters/Stage';
import { playAndWait, primePlayer, type Recording, speakDevice, startRecording, stopPhrase } from '../lib/audio';
import { type Lang, LANGS } from '../lib/content';
import { courseItemFor, currentLevel, hasStarted } from '../lib/course';
import { haptic, sfx, tapFeedback } from '../lib/fx';
import { addTalkWords, completeLesson, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { getScenario } from '../lib/scenarios';
import { audioUrl, nextReply, type NewWord, PROBLEM_TEXT, type TalkError, type TalkMessage, type TalkProblem, type TalkReply } from '../lib/talk';
import { isModelReady, loadModel, transcribe } from '../lib/whisper';
import { Icon, Screen, Waveform } from '../ui';
import { AdultGateScreen } from './AdultGate';

// Practice › Talk with AI: a spoken back-and-forth with an AI partner, free talk or one of the
// role-play scenarios. You speak (Whisper on the phone turns it into text), the partner answers
// out loud, then the mic opens again by itself. Every reply has its English a tap away, and a
// gentle correction appears under anything you said that could be better. Needs the internet.

const TALK_XP = 10;
const testHook = location.search.includes('test');

type Msg = { role: 'model'; reply: TalkReply } | { role: 'user'; text: string; correction?: TalkReply['correction'] };
type Phase = 'intro' | 'thinking' | 'speaking' | 'listening' | 'heard' | 'checking' | 'paused' | 'ended';

export function Talk({ lang, scenarioId }: { lang: Lang; scenarioId?: string }) {
  const progress = useProgress();
  const scenario = scenarioId ? getScenario(lang, scenarioId) : undefined;
  if (scenarioId && !scenario) {
    navigate(`/${lang}/talk`, { replace: true });
    return null;
  }
  if (scenario?.topic === 'flirting' && !progress.adult) return <AdultGateScreen back={`/${lang}/roleplay`} />;
  return <TalkScreen key={scenarioId ?? 'free'} lang={lang} scenario={scenario} />;
}

function TalkScreen({ lang, scenario }: { lang: Lang; scenario?: ReturnType<typeof getScenario> }) {
  const progress = useProgress();
  const name = LANGS.find((l) => l.id === lang)!.name;
  const level = hasStarted(progress, lang) ? currentLevel(progress, lang) : 'Beginner';
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [problem, setProblem] = useState<TalkProblem | null>(null);
  const [voiceNote, setVoiceNote] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [shownEn, setShownEn] = useState<Set<number>>(new Set());
  const [speakingUrl, setSpeakingUrl] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [summary, setSummary] = useState<{ words: NewWord[]; mistakes: { said: string; better: string; why: string }[]; added: number } | null>(null);
  const recording = useRef<Recording | null>(null);
  const alive = useRef(true);
  const over = useRef(false); // ended: anything still in flight stops there
  const auto = useRef(true); // listen again by itself after each reply
  const msgsRef = useRef<Msg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const graded = isModelReady();

  useEffect(() => {
    alive.current = true;
    if (graded) loadModel().catch(() => {});
    return () => {
      alive.current = false;
      recording.current?.stop();
      stopPhrase();
    };
  }, [graded]);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }), [msgs.length, phase]);

  const setAll = (next: Msg[]) => {
    msgsRef.current = next;
    setMsgs(next);
    if (testHook) Object.assign(window, { __talkHistory: history(next) });
  };
  const history = (list: Msg[]): TalkMessage[] => list.map((m) => (m.role === 'model' ? { role: 'model', text: m.reply.reply } : { role: 'user', text: m.text }));

  /** Ask the partner for its next line, say it, then (usually) listen for the answer. */
  async function ask(list: Msg[]) {
    if (over.current) return;
    setPhase('thinking');
    setProblem(null);
    let reply: TalkReply;
    try {
      reply = await nextReply({
        lang,
        level,
        scenario: scenario ? { setting: scenario.setting, them: scenario.them, en: scenario.en } : undefined,
        history: history(list),
        voice: true,
      });
    } catch (e) {
      if (!alive.current || over.current) return;
      setProblem((e as TalkError).problem ?? 'unavailable');
      setPhase('paused');
      return;
    }
    if (!alive.current || over.current) return;
    // The correction is about what you just said: show it under your message.
    const last = list[list.length - 1];
    const withFix: Msg[] = last?.role === 'user' && reply.correction ? [...list.slice(0, -1), { ...last, correction: reply.correction }] : list;
    const next: Msg[] = [...withFix, { role: 'model', reply }];
    setAll(next);
    if (last?.role === 'user') {
      sfx(reply.correction ? 'wrong' : 'correct');
      haptic(reply.correction ? 'error' : 'success');
    }
    setPhase('speaking');
    if (reply.audio) {
      const url = audioUrl(reply.audio);
      setSpeakingUrl(url);
      await playAndWait(url);
      setSpeakingUrl(null);
      URL.revokeObjectURL(url);
    } else {
      // The voice service didn't answer: the phone's own voice reads it, and the text is there.
      setVoiceNote(true);
      await speakDevice(reply.reply, lang);
    }
    if (!alive.current || over.current) return;
    if (reply.done) return end(next);
    if (auto.current && graded) void listen();
    else setPhase('paused');
  }

  /** Record your answer, turn it into text on the phone, and send it. */
  async function listen() {
    if (phase === 'listening' || phase === 'heard') return recording.current?.stop();
    setNote(null);
    setProblem(null);
    stopPhrase();
    let audio: Float32Array;
    try {
      const rec = await startRecording(() => alive.current && setPhase('heard'), { silence: 1.8 });
      recording.current = rec;
      setAnalyser(rec.analyser);
      setPhase('listening');
      audio = await rec.done;
    } catch (e) {
      setPhase('paused');
      setNote(e instanceof Error ? e.message : String(e));
      return;
    } finally {
      recording.current = null;
      setAnalyser(null);
    }
    if (!alive.current || over.current) return;
    if (!audio.length) {
      setPhase('paused');
      setNote("I didn't hear anything. Tap the mic and answer, or type instead.");
      return;
    }
    setPhase('checking');
    let text = '';
    try {
      text = (await transcribe(audio, lang)).trim();
    } catch (e) {
      setPhase('paused');
      setNote(e instanceof Error ? e.message : String(e));
      return;
    }
    if (!alive.current || over.current) return;
    if (!text) {
      setPhase('paused');
      setNote("I couldn't make that out. Try again, a little closer to the mic, or type it.");
      return;
    }
    send(text);
  }

  function send(text: string) {
    const next: Msg[] = [...msgsRef.current, { role: 'user', text }];
    setAll(next);
    void ask(next);
  }

  function start() {
    tapFeedback();
    primePlayer(); // so the replies can play by themselves on iPhone
    auto.current = true;
    over.current = false;
    void ask([]);
  }

  function end(list = msgsRef.current) {
    over.current = true;
    recording.current?.stop();
    stopPhrase();
    const seen = new Set<string>();
    const words = list
      .flatMap((m) => (m.role === 'model' ? m.reply.newWords : []))
      .filter((w) => !seen.has(w.word.toLowerCase()) && seen.add(w.word.toLowerCase()));
    const mistakes = list.flatMap((m) => (m.role === 'user' && m.correction ? [{ said: m.text, better: m.correction.corrected, why: m.correction.explanation }] : []));
    const added = addTalkWords(
      words.map((w) => {
        const item = courseItemFor(lang, w.word);
        const slug = w.word.toLowerCase().replace(/\s+/g, '-').slice(0, 40);
        return item ? { key: `${lang}:${item.id}` } : { key: `${lang}:ai:${slug}`, word: { text: w.word, en: w.meaning, pinyin: w.pinyin || undefined } };
      }),
    );
    if (list.some((m) => m.role === 'user')) completeLesson(lang, null, TALK_XP);
    setSummary({ words, mistakes, added });
    setPhase('ended');
  }

  const busy = phase === 'listening' || phase === 'heard';
  const status = {
    intro: '',
    thinking: `${scenario?.them ?? 'Your partner'} is thinking…`,
    speaking: `${scenario?.them ?? 'Your partner'} is talking`,
    listening: 'Your turn: speak now',
    heard: 'Listening… stops when you pause',
    checking: 'Writing down what you said…',
    paused: graded ? 'Tap the mic to answer' : 'Type your answer',
    ended: '',
  }[phase];
  const mood = phase === 'speaking' || phase === 'thinking' ? 'idle' : msgs.at(-2)?.role === 'user' ? ((msgs.at(-2) as { correction?: unknown }).correction ? 'confused' : 'happy') : 'idle';

  return (
    <Screen title={scenario ? 'Role-play with AI' : 'Talk with AI'} back={scenario ? `/${lang}/roleplay/${scenario.id}` : '/practice'}>
      {phase === 'intro' && (
        <div className="card start-card" data-testid="talk-intro">
          <span className="start-sticker" aria-hidden="true">
            <Sticker name="chat" size={88} />
          </span>
          <p className="muted start-kicker">{scenario ? scenario.en : `Free talk · ${name}`}</p>
          <div className="start-title">{scenario ? scenario.title : `Chat in ${name} with an AI partner`}</div>
          <p className="muted">
            {scenario ? `${scenario.setting} You talk with: ${scenario.them}.` : 'A friendly partner who asks about your day and keeps the conversation going.'} It talks at your level (
            <b>{level}</b>), stays in {name}, and gently corrects you. Tap any reply for its English.
          </p>
          <button className="btn" onClick={start} data-testid="talk-start">
            <Icon name="mic" size={20} /> Start talking
          </button>
          {!graded && (
            <p className="muted small" style={{ margin: 0 }}>
              To answer by voice, download the free speech model in{' '}
              <button className="link-btn" onClick={() => navigate('/settings')}>
                Settings
              </button>
              . Until then you can type your answers.
            </p>
          )}
          <p className="muted small" style={{ margin: 0 }}>
            Needs the internet. Your voice never leaves the phone: only the text of what you say goes to Google's Gemini AI, through Learnguage's own free
            server, and nothing is saved there.
          </p>
        </div>
      )}

      {phase !== 'intro' && progress.characters && (
        <CharacterStage them={scenario?.them ?? 'Friend'} topic={scenario?.topic ?? 'smalltalk'} clips={[]} speaking={speakingUrl} mood={mood} />
      )}

      <div className="story-lines dialogue talk-lines" aria-live="polite" data-testid="talk-lines">
        {msgs.map((m, i) =>
          m.role === 'model' ? (
            <div key={i} className="story-line left" data-testid="talk-ai">
              <div className="speaker">{scenario?.them ?? 'Partner'}</div>
              <div className="bubble">
                <p className="line-text" lang={lang}>
                  {m.reply.reply}
                </p>
                {m.reply.pinyin && <p className="line-pinyin">{m.reply.pinyin}</p>}
                {shownEn.has(i) ? (
                  <p className="line-en">{m.reply.translation}</p>
                ) : (
                  <button className="link-btn small" onClick={() => setShownEn(new Set(shownEn).add(i))} data-testid="talk-translate">
                    Translate
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="story-line right" data-testid="talk-me">
              <div className="speaker">You</div>
              <div className="bubble">
                <p className="line-text" lang={lang}>
                  {m.text}
                </p>
                {m.correction && (
                  <div className="talk-fix" data-testid="talk-correction">
                    <span className="talk-fix-label">Better:</span> <span lang={lang}>{m.correction.corrected}</span>
                    <div className="muted small">{m.correction.explanation}</div>
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      {problem && (
        <div className="card talk-problem" role="alert" data-testid="talk-problem">
          <p style={{ margin: 0, fontWeight: 600 }}>{PROBLEM_TEXT[problem]}</p>
          {problem !== 'quota' && (
            <button className="btn secondary" onClick={() => void ask(msgsRef.current)} data-testid="talk-retry">
              Try again
            </button>
          )}
        </div>
      )}
      {voiceNote && phase !== 'ended' && (
        <p className="muted small talk-note" data-testid="talk-voice-note">
          The AI voice isn't available right now, so your phone's own voice reads the replies.
        </p>
      )}

      {phase === 'ended' && summary && (
        <div className="card grade ok" data-testid="talk-summary">
          <div className="start-title" style={{ fontSize: 'var(--text-lg)' }}>
            Conversation done!
          </div>
          <p style={{ margin: 0 }}>
            {msgs.filter((m) => m.role === 'user').length} things said · +{msgs.some((m) => m.role === 'user') ? TALK_XP : 0} XP
          </p>
          {summary.words.length > 0 && (
            <>
              <div className="section-title" style={{ margin: '6px 0 0' }}>
                New words
              </div>
              <ul className="talk-words">
                {summary.words.map((w) => (
                  <li key={w.word}>
                    <b lang={lang}>{w.word}</b>
                    {w.pinyin && <span className="pinyin small"> {w.pinyin}</span>} <span className="muted small">{w.meaning}</span>
                  </li>
                ))}
              </ul>
              <p className="muted small" style={{ margin: 0 }} data-testid="talk-added">
                {summary.added ? `${summary.added} added to your reviews: they come back tomorrow in Daily review.` : 'Already in your reviews.'}
              </p>
            </>
          )}
          {summary.mistakes.length > 0 && (
            <>
              <div className="section-title" style={{ margin: '6px 0 0' }}>
                To review
              </div>
              <ul className="talk-words">
                {summary.mistakes.map((x, k) => (
                  <li key={k}>
                    <span className="muted small" lang={lang}>
                      {x.said}
                    </span>
                    <br />→ <b lang={lang}>{x.better}</b>
                    <div className="muted small">{x.why}</div>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="row">
            <button
              className="btn secondary flex"
              onClick={() => {
                setAll([]);
                setSummary(null);
                setVoiceNote(false);
                setPhase('intro');
              }}
            >
              Talk again
            </button>
            <button className="btn flex" onClick={() => navigate('/practice')}>
              Done
            </button>
          </div>
        </div>
      )}

      {phase !== 'intro' && phase !== 'ended' && (
        <div className="lesson-foot turn-panel" data-testid="talk-panel">
          <div className="shadow-status" aria-live="polite" data-testid="talk-status">
            {status}
          </div>
          {busy && <Waveform analyser={analyser} />}
          {note && <p style={{ color: 'var(--wrong)', margin: 0 }}>{note}</p>}
          {typing || !graded ? (
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                if (!typed.trim() || phase === 'thinking' || phase === 'speaking') return;
                send(typed.trim());
                setTyped('');
              }}
            >
              <input className="answer-input grow" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={`Type in ${name}…`} lang={lang} aria-label="Your answer" data-testid="talk-input" />
              <button className="btn" type="submit" disabled={!typed.trim() || phase === 'thinking' || phase === 'speaking'} aria-label="Send" data-testid="talk-send">
                <Icon name="chevron" size={22} />
              </button>
            </form>
          ) : null}
          <div className="row turn-actions">
            {graded && (
              <button className="btn secondary sound-sm" onClick={() => setTyping(!typing)} aria-label={typing ? 'Speak instead' : 'Type instead'} data-testid="talk-type">
                <Icon name={typing ? 'mic' : 'book'} size={20} />
                {typing ? 'Speak' : 'Type'}
              </button>
            )}
            {graded && !typing && (
              <button
                className={phase === 'checking' ? 'mic small checking' : busy ? 'mic small on' : 'mic small'}
                onClick={() => {
                  auto.current = true;
                  void listen();
                }}
                disabled={phase === 'checking' || phase === 'thinking' || phase === 'speaking'}
                aria-label={busy ? 'Stop recording' : 'Answer'}
                data-testid="talk-mic"
              >
                {phase === 'checking' || phase === 'thinking' ? <span className="spinner" /> : <Icon name={busy ? 'stop' : 'mic'} size={30} />}
              </button>
            )}
            <button className="btn secondary sound-sm" onClick={() => end()} aria-label="End conversation" data-testid="talk-end">
              <Icon name="check" size={20} />
              End
            </button>
          </div>
        </div>
      )}
    </Screen>
  );
}
