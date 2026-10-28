import { useEffect, useRef, useState } from 'react';
import { compare } from '../../../../shared/compare';
import { Character, roleFor } from '../../characters/Character';
import { useMouth } from '../../characters/lipsync';
import { primePlayer, stopPhrase, unlockAudio } from '../../lib/audio';
import type { Lang } from '../../lib/content';
import { currentLevel, hasStarted } from '../../lib/course';
import { haptic, sfx, tapFeedback } from '../../lib/fx';
import { bandOf, clip, type PlayData } from '../../lib/play';
import { recordPlay, useProgress } from '../../lib/progress';
import { navigate } from '../../lib/router';
import { Icon, Screen } from '../../ui';
import { CallBar, LiveTalk, type LiveSession } from '../Talk';
import { AnswerBar, DoneCard, HearButton, LineText, say } from './common';

// Fake phone calls: the phone rings (or you dial), you pick up, and you handle the call: book a
// table, call a taxi, move an appointment, guide a lost delivery driver. Offline it follows a
// script and Whisper checks your lines; online the AI can be the caller instead, live.

const testHook = location.search.includes('test');
const CALL_XP = 10;
/** At or above this, your line counts as said. */
const PASS = 0.5;

type Phase = 'ready' | 'ringing' | 'on' | 'ended';

export function CallScreen({ lang, data, id }: { lang: Lang; data: PlayData; id: string }) {
  const call = data.calls.find((c) => c.id === id);
  const progress = useProgress();
  const level = hasStarted(progress, lang) ? currentLevel(progress, lang) : 'Beginner';
  const [phase, setPhase] = useState<Phase>('ready');
  const [live, setLive] = useState(false);
  const [step, setStep] = useState(0);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ score: number; heard: string } | null>(null);
  const [reveal, setReveal] = useState(false);
  const [xp, setXp] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const started = useRef(0);
  const alive = useRef(true);
  const mouth = useMouth(speaking);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopPhrase();
    };
  }, []);

  // Ringing: the ringtone (or the ring on the other end) every couple of seconds, and a buzz.
  useEffect(() => {
    if (phase !== 'ringing' || !call) return;
    const ring = () => {
      sfx(call.incoming ? 'ring' : 'ringback');
      haptic('success');
    };
    ring();
    const timer = setInterval(ring, call.incoming ? 2200 : 3000);
    // When you call, they pick up after two rings.
    const pickUp = call.incoming ? null : setTimeout(() => connect(), 5200);
    return () => {
      clearInterval(timer);
      if (pickUp) clearTimeout(pickUp);
    };
  }, [phase]);

  const lines = call?.lines ?? [];
  const line = lines[step];

  // Their lines play by themselves; then it's your turn.
  useEffect(() => {
    if (phase !== 'on' || live) return;
    if (!line) return finish();
    setFeedback(null);
    setReveal(false);
    if (testHook) Object.assign(window, { __callLine: { who: line.who, text: line.text, step } });
    if (line.who !== 'them') return;
    let current = true;
    void say(clip(lang, line.text, 't'), (u) => alive.current && setSpeaking(u)).then(() => current && alive.current && setStep((s) => s + 1));
    return () => {
      current = false;
    };
  }, [phase, step]);

  if (!call) {
    navigate(`/${lang}/play/call`, { replace: true });
    return null;
  }

  const band = bandOf(level);
  const role = roleFor(call.them, 'call');

  function ringNow(withAi: boolean) {
    tapFeedback();
    primePlayer();
    unlockAudio([]);
    setLive(withAi);
    setPhase('ringing');
  }
  function connect() {
    tapFeedback();
    started.current = Date.now();
    setPhase('on');
    setStep(0);
    setScores([]);
  }
  function finish() {
    stopPhrase();
    sfx('hangup');
    setSeconds(Math.round((Date.now() - started.current) / 1000));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    setXp(recordPlay(lang, 'call', call!.id, avg, CALL_XP));
    setPhase('ended');
  }

  /** Your line, said: check it against the script. */
  const heard = (text: string, how: 'voice' | 'typed') => {
    const score = compare(line.text, text, lang).score;
    setFeedback({ score, heard: text });
    const ok = score >= PASS;
    sfx(ok ? 'correct' : 'wrong');
    haptic(ok ? 'success' : 'error');
    if (!ok) return setReveal(true);
    setScores((s) => [...s, how === 'typed' ? score * 0.8 : score]);
    const here = step;
    setTimeout(() => alive.current && setStep((s) => (s === here ? s + 1 : s)), 1100);
  };

  // Live: the AI is the caller, with the same phone screen around it.
  if (live && phase === 'on') {
    const session: LiveSession = {
      mode: 'call',
      title: call.title,
      kicker: `${call.incoming ? 'Incoming call' : 'Your call'} · ${call.number}`,
      about: `${call.setting} The AI plays ${call.them.toLowerCase()}, live.`,
      them: call.them,
      topic: 'call',
      setting: call.setting,
      en: call.en,
      back: `/${lang}/play/call/${call.id}`,
      xp: CALL_XP,
      autoStart: true,
      play: { kind: 'call', id: call.id },
    };
    return <LiveTalk lang={lang} session={session} />;
  }

  return (
    <Screen title="Phone call" back={`/${lang}/play/call`}>
      {phase === 'ready' && (
        <div className="card start-card" data-testid="call-intro">
          <span className="start-sticker phone-sticker" aria-hidden="true">
            <Icon name="phone" size={56} />
          </span>
          <p className="muted start-kicker">{call.incoming ? 'Someone will call you' : 'You make the call'}</p>
          <div className="start-title" lang={lang}>
            {call.title}
          </div>
          <p className="muted">
            {call.en}. {call.setting}
          </p>
          <button className="btn" onClick={() => ringNow(false)} data-testid="call-start">
            <Icon name="phone" size={18} /> {call.incoming ? 'Wait for the call' : `Call ${call.number}`}
          </button>
          <button className="btn secondary" onClick={() => ringNow(true)} disabled={!navigator.onLine} data-testid="call-live">
            <Icon name="mic" size={18} /> Live call with the AI {navigator.onLine ? '' : '(needs the internet)'}
          </button>
        </div>
      )}

      {phase === 'ringing' && (
        <div className={`phone-screen ringing ${call.incoming ? 'incoming' : 'outgoing'}`} data-testid="call-ringing">
          <div className="phone-caller">
            <div className="phone-avatar">
              <Character role={role} mood="idle" mouth={0} label={call.them} size={120} crop="face" />
            </div>
            <div className="phone-name">{call.number}</div>
            <div className="phone-sub">{call.incoming ? 'Incoming call…' : 'Calling…'}</div>
          </div>
          {call.incoming ? (
            <div className="phone-actions">
              <button className="phone-btn decline" aria-label="Decline" onClick={() => setPhase('ready')}>
                <Icon name="phone" size={30} />
              </button>
              <button className="phone-btn accept" aria-label="Answer" onClick={connect} data-testid="call-answer">
                <Icon name="phone" size={30} />
              </button>
            </div>
          ) : (
            <div className="phone-actions">
              <button className="phone-btn decline" aria-label="Hang up" onClick={() => setPhase('ready')}>
                <Icon name="phone" size={30} />
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'on' && (
        <>
          <div className="phone-screen on" data-testid="call-on">
            <div className="phone-caller">
              <div className="phone-avatar">
                <Character
                  role={role}
                  mood={feedback && feedback.score >= PASS ? 'happy' : feedback ? 'confused' : 'idle'}
                  mouth={mouth.open}
                  round={mouth.round}
                  speaking={!!speaking}
                  label={`${call.them}${speaking ? ', talking' : ''}`}
                  size={150}
                  crop="face"
                />
              </div>
              <div className="phone-name">{call.number}</div>
            </div>
            <CallBar onHangUp={finish} />
          </div>
          {line?.who === 'them' && (
            <div className="card call-line" data-testid="call-them">
              <div className="speaker">{call.them}</div>
              <p>
                <LineText lang={lang} text={line.text} en={line.en} showEn={band === 1} />
              </p>
            </div>
          )}
          {line?.who === 'you' && (
            <div className="card call-line mine" data-testid="call-you">
              <div className="speaker">Your turn</div>
              {band < 3 || reveal ? (
                <p className="row" style={{ alignItems: 'center' }}>
                  <span className="grow">
                    <LineText lang={lang} text={line.text} en={line.en} showEn />
                  </span>
                  <HearButton url={clip(lang, line.text)} />
                </p>
              ) : (
                <p>
                  Say: <b>{line.en}</b>{' '}
                  <button className="link-btn small" onClick={() => setReveal(true)}>
                    Show the words
                  </button>
                </p>
              )}
              {feedback && (
                <p className={`small ${feedback.score >= PASS ? 'ok-text' : 'wrong-text'}`} role="status" data-testid="call-feedback">
                  {Math.round(feedback.score * 100)}% · {feedback.score >= PASS ? 'They understood you!' : `They heard “${feedback.heard}”. Try again.`}
                </p>
              )}
              <AnswerBar lang={lang} onText={heard} expected={line.text} sayLabel="Say it" />
              <button className="link-btn small" onClick={() => setStep((s) => s + 1)} data-testid="call-skip">
                Skip this line
              </button>
            </div>
          )}
        </>
      )}

      {phase === 'ended' && (
        <DoneCard title="Call ended" detail={`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} on the phone in your new language.`} xp={xp}>
          <button className="btn" onClick={() => setPhase('ready')}>
            Call again
          </button>
          <button className="btn secondary" onClick={() => navigate(`/${lang}/play/call`)}>
            More calls
          </button>
        </DoneCard>
      )}
    </Screen>
  );
}
