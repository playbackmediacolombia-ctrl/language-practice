import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Character } from '../../characters/Character';
import type { Lang } from '../../lib/content';
import { currentLevel, hasStarted } from '../../lib/course';
import { haptic, sfx, tapFeedback } from '../../lib/fx';
import { type Chat, type ChatOption, type PlayData, shuffled } from '../../lib/play';
import { recordPlay, useProgress } from '../../lib/progress';
import { navigate } from '../../lib/router';
import { nextReply, PROBLEM_TEXT, type TalkError, type TalkMessage } from '../../lib/talk';
import { Icon, Screen } from '../../ui';
import { pinyinOf } from './common';

// Text chats: a WhatsApp-style thread with a friend, full of real slang, abbreviations and
// emojis. Their messages arrive with "typing…"; tap one for its English, and tap any underlined
// slang for what it means. On your turn, pick the reply that fits (a wrong one says why). After
// the thread, keep texting with the AI, who writes like a local (online).

const testHook = location.search.includes('test');
const CHAT_XP = 10;

type Bubble = { from: 'them' | 'you'; text: string; en?: string; fix?: string; time: string };

const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** A message with its slang underlined: tap a term to see what it means. */
function WithSlang({ text, chat, onTerm }: { text: string; chat: Chat; onTerm: (t: { term: string; means: string }) => void }) {
  const parts: ReactNode[] = [];
  const terms = [...chat.slang].sort((a, b) => b.term.length - a.term.length);
  let rest = text;
  let key = 0;
  while (rest) {
    let hit: { i: number; t: (typeof terms)[number] } | null = null;
    for (const t of terms) {
      const i = rest.toLowerCase().indexOf(t.term.toLowerCase());
      if (i >= 0 && (!hit || i < hit.i)) hit = { i, t };
    }
    if (!hit) {
      parts.push(rest);
      break;
    }
    if (hit.i > 0) parts.push(rest.slice(0, hit.i));
    const word = rest.slice(hit.i, hit.i + hit.t.term.length);
    const t = hit.t;
    parts.push(
      <button
        key={key++}
        className="slang"
        onClick={(e) => {
          e.stopPropagation();
          tapFeedback();
          onTerm(t);
        }}
        data-testid="slang"
      >
        {word}
      </button>,
    );
    rest = rest.slice(hit.i + hit.t.term.length);
  }
  return <>{parts}</>;
}

export function ChatScreen({ lang, data, id }: { lang: Lang; data: PlayData; id: string }) {
  const chat = data.chats.find((c) => c.id === id);
  const progress = useProgress();
  const level = hasStarted(progress, lang) ? currentLevel(progress, lang) : 'Beginner';
  const [at, setAt] = useState(0); // the next message in the script
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const [wrong, setWrong] = useState<{ text: string; why: string } | null>(null);
  const [misses, setMisses] = useState(0);
  const [term, setTerm] = useState<{ term: string; means: string } | null>(null);
  const [shownEn, setShownEn] = useState<Set<number>>(new Set());
  const [xp, setXp] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const alive = useRef(true);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }), [bubbles.length, typing, at]);

  const script = chat?.messages ?? [];
  const msg = script[at];
  const options = useMemo(() => (msg?.from === 'you' ? shuffled(msg.options) : []), [at]);

  // Their messages arrive one by one, after a moment of "typing…".
  useEffect(() => {
    if (!chat) return;
    if (!msg) {
      if (xp === null) {
        const turns = script.filter((m) => m.from === 'you').length;
        setXp(recordPlay(lang, 'chat', chat.id, Math.max(0, (turns - misses) / turns), CHAT_XP));
        sfx('complete');
      }
      return;
    }
    if (testHook) Object.assign(window, { __chatTurn: msg.from === 'you' ? { right: msg.options.find((o) => o.why === null)!.text } : null });
    if (msg.from !== 'them') return;
    setTyping(true);
    const t = setTimeout(
      () => {
        if (!alive.current) return;
        setTyping(false);
        setBubbles((b) => [...b, { from: 'them', text: msg.text, en: msg.en, time: clock() }]);
        sfx('message');
        haptic('light');
        setAt((n) => n + 1);
      },
      testHook ? 300 : 700 + Math.min(1600, msg.text.length * 28),
    );
    return () => clearTimeout(t);
  }, [at]);

  if (!chat) {
    navigate(`/${lang}/play/chat`, { replace: true });
    return null;
  }

  const pick = (o: ChatOption) => {
    tapFeedback();
    if (o.why) {
      sfx('wrong');
      haptic('error');
      setMisses((m) => m + 1);
      setWrong({ text: o.text, why: o.why });
      return;
    }
    setWrong(null);
    sfx('correct');
    setBubbles((b) => [...b, { from: 'you', text: o.text, en: o.en, time: clock() }]);
    setAt((n) => n + 1);
  };

  // After the thread: keep texting with the AI, in the same style.
  const sendFree = async () => {
    const text = typed.trim();
    if (!text) return;
    setTyped('');
    setProblem(null);
    const mine: Bubble = { from: 'you', text, time: clock() };
    const list = [...bubbles, mine];
    setBubbles(list);
    setTyping(true);
    try {
      const history: TalkMessage[] = list.map((b) => ({ role: b.from === 'them' ? 'model' : 'user', text: b.text }));
      const reply = await nextReply({ lang, level, history, voice: false, mode: 'text', name: chat.them });
      if (!alive.current) return;
      setBubbles((b) => {
        const fixed = reply.correction?.corrected ? b.map((x) => (x === mine ? { ...x, fix: reply.correction!.corrected } : x)) : b;
        return [...fixed, { from: 'them', text: reply.reply, en: reply.translation, time: clock() }];
      });
      sfx('message');
    } catch (e) {
      setProblem(PROBLEM_TEXT[(e as TalkError).problem ?? 'unavailable']);
    } finally {
      if (alive.current) setTyping(false);
    }
  };

  const done = !msg;
  return (
    <Screen title="Text chat" back={`/${lang}/play/chat`}>
      <div className="chat-phone" data-testid="chat">
        <div className="chat-head">
          <span className="chat-avatar">
            <Character role={chat.avatar} mood={done ? 'happy' : 'idle'} mouth={0} label={chat.them} size={40} crop="face" />
          </span>
          <span className="grow">
            <span className="chat-name">{chat.them}</span>
            <span className="chat-status">{typing ? 'typing…' : 'online'}</span>
          </span>
        </div>
        <div className="chat-thread" aria-live="polite">
          <div className="chat-day">Today</div>
          {bubbles.map((b, i) => (
            <div
              key={i}
              className={`chat-bubble ${b.from}`}
              onClick={() => b.en && setShownEn(new Set(shownEn).add(i))}
              data-testid={b.from === 'them' ? 'chat-them' : 'chat-you'}
            >
              <span lang={lang}>{b.from === 'them' ? <WithSlang text={b.text} chat={chat} onTerm={setTerm} /> : b.text}</span>
              {lang === 'zh' && <span className="chat-pinyin">{pinyinOf(lang, b.text)}</span>}
              {shownEn.has(i) && b.en && <span className="chat-en">{b.en}</span>}
              {b.fix && (
                <span className="chat-fix" data-testid="chat-fix">
                  Better: <span lang={lang}>{b.fix}</span>
                </span>
              )}
              <span className="chat-time">
                {b.time}
                {b.from === 'you' && <span className="ticks" aria-label="Read"> ✓✓</span>}
              </span>
            </div>
          ))}
          {typing && (
            <div className="chat-bubble them typing" aria-label={`${chat.them} is typing`}>
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {term && (
          <div className="chat-term" role="status" data-testid="slang-meaning">
            <span>
              <b lang={lang}>{term.term}</b>: {term.means}
            </span>
            <button className="icon-btn" aria-label="Close" onClick={() => setTerm(null)}>
              <Icon name="close" size={18} />
            </button>
          </div>
        )}

        {msg?.from === 'you' && !typing && (
          <div className="chat-replies" data-testid="chat-replies">
            <div className="muted small">Pick the reply that fits:</div>
            {options.map((o) => (
              <button key={o.text} className={`chat-option ${wrong?.text === o.text ? 'shake' : ''}`} onClick={() => pick(o)} data-testid="chat-option" lang={lang}>
                {o.text}
                {lang === 'zh' && <span className="chat-pinyin">{pinyinOf(lang, o.text)}</span>}
              </button>
            ))}
            {wrong && (
              <p className="small wrong-text" role="status" data-testid="chat-why">
                Hmm, not quite: {wrong.why}
              </p>
            )}
          </div>
        )}

        {done && (
          <div className="chat-free">
            {xp !== null && (
              <p className="small ok-text" data-testid="chat-done">
                Nice chat! +{xp} XP. Tap any message for its English.
              </p>
            )}
            {problem && <p className="small wrong-text">{problem}</p>}
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                void sendFree();
              }}
            >
              <input
                className="answer-input grow"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={navigator.onLine ? `Keep texting ${chat.them} (AI)…` : 'Keep texting when you are back online'}
                disabled={!navigator.onLine || typing}
                lang={lang}
                aria-label="Your message"
                data-testid="chat-input"
              />
              <button className="btn" type="submit" disabled={!typed.trim() || typing} aria-label="Send" data-testid="chat-send">
                <Icon name="send" size={20} />
              </button>
            </form>
          </div>
        )}
      </div>
    </Screen>
  );
}
