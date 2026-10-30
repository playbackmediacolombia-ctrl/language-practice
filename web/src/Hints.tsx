import { useEffect, useRef, useState } from 'react';
import { Bird } from './Bird';
import { playPhrase } from './lib/audio';
import { tapFeedback } from './lib/fx';
import { getProgress } from './lib/progress';
import { Icon, AudioDisc } from './ui';
import { Picture, type PictureName } from './Picture';

// Timed step-by-step hints (lessons, role-plays and the AI partner). If you haven't answered after
// the wait (Settings › Hint wait, 10 s to start with), the logo bird thinks of a hint: first a
// picture or the first letter, then how it starts (tap to hear it), then the whole answer, faint,
// so you can still say it yourself. Typing, tapping or speaking starts the wait over; nothing
// shows up while you're talking. The Hint button gives the next one straight away.

export type HintLevel = 0 | 1 | 2 | 3;

export type HintSet = {
  /** Hint 1: a picture of it, or how it begins. */
  first: { picture?: PictureName; letter: string };
  /** Hint 2: the start of it, heard with a tap (a recording, or "tts:<lang>:<text>"). */
  start: { text: string; audio: string };
  /** Hint 3: all of it. */
  full: { text: string; sub?: string };
  /** The answer's language, for `lang` on the text. */
  lang: string;
};

/**
 * The hint level for one question. It goes up a level after every `wait` seconds of quiet, never
 * while `paused` (you're speaking, it's being checked, or it's answered). `poke()` (you typed or
 * tapped) starts the wait over; `next()` is the Hint button. A new `key` starts again at 0.
 */
export function useHintTimer(key: unknown, { paused = false, wait = getProgress().hintWait }: { paused?: boolean; wait?: number } = {}) {
  const [level, setLevel] = useState<HintLevel>(0);
  const [pokes, setPokes] = useState(0);
  const at = useRef(key);
  if (at.current !== key) {
    at.current = key;
    if (level !== 0) setLevel(0);
  }
  useEffect(() => {
    if (paused || !wait || level >= 3) return;
    const t = setTimeout(() => {
      if (document.visibilityState === 'visible') setLevel((l) => Math.min(3, l + 1) as HintLevel);
      else setPokes((p) => p + 1); // the app is in the background: wait again when it's back
    }, wait * 1000);
    return () => clearTimeout(t);
  }, [key, level, paused, wait, pokes]);
  return {
    level,
    poke: () => setPokes((p) => p + 1),
    next: () => setLevel((l) => Math.min(3, l + 1) as HintLevel),
    reset: () => setLevel(0),
  };
}

// Hand-drawn pictures for common meanings, so the first hint can show the thing rather than spell it.
const PICTURES: [RegExp, PictureName][] = [
  [/\bcats?\b/, 'cat'], [/\bdogs?\b/, 'dog'], [/\bhouse|home\b/, 'house'], [/\bwater\b/, 'water'], [/\bcoffee\b/, 'coffee'],
  [/\btea\b/, 'tea'], [/\bbread\b/, 'bread'], [/\bbeer\b/, 'beer'], [/\bwine\b/, 'wine'], [/\bmilk\b/, 'milk'],
  [/\bapples?\b/, 'apple'], [/\bbananas?\b/, 'banana'], [/\brice\b/, 'rice'], [/\bcheese\b/, 'cheese'], [/\beggs?\b/, 'egg'],
  [/\bfish\b/, 'fish'], [/\bchicken\b/, 'chicken'], [/\bmeat\b/, 'meat'], [/\bsoup\b/, 'soup'], [/\bcake\b/, 'cake'],
  [/\bbooks?\b/, 'book'], [/\bphones?\b/, 'phone'], [/\bcars?\b/, 'car'], [/\bbus\b/, 'bus'], [/\btrain\b/, 'train'],
  [/\bplane|airport\b/, 'plane'], [/\bhotel\b/, 'hotel'], [/\bschool\b/, 'school'], [/\bhospital|doctor\b/, 'hospital'], [/\bmoney\b/, 'money'],
  [/\bsun|sunny\b/, 'sun'], [/\brain|raining\b/, 'rain'], [/\bsnow\b/, 'snow'], [/\bcold\b/, 'cold'], [/\bhot\b/, 'hot'],
  [/\bhello|hi\b/, 'hello'], [/\bgoodbye|bye\b/, 'hello'], [/\bthank/, 'thanks'], [/\bplease\b/, 'thanks'], [/\bsorry\b/, 'sorry'],
  [/\bhappy\b/, 'happy'], [/\bsad\b/, 'sad'], [/\btired\b/, 'tired'], [/\bhungry\b/, 'hungry'], [/\blove\b/, 'love'],
  [/\bmorning\b/, 'morning'], [/\bnight\b/, 'night'], [/\btoday\b/, 'today'], [/\btime|clock|o'clock\b/, 'clock'], [/\bbirthday\b/, 'birthday'],
  [/\bmusic|song\b/, 'music'], [/\bfootball|soccer\b/, 'football'], [/\bbeach\b/, 'beach'], [/\btree\b/, 'tree'], [/\bflowers?\b/, 'flower'],
  [/\bshop|store|buy\b/, 'shop'], [/\brestaurant|eat\b/, 'restaurant'], [/\bdrink\b/, 'drink'], [/\bsleep\b/, 'sleep'], [/\bwork|job\b/, 'work'],
  [/\bone\b/, 'one'], [/\btwo\b/, 'two'], [/\bthree\b/, 'three'], [/\bfour\b/, 'four'], [/\bfive\b/, 'five'],
];
/** Emoji that some meanings carry (texting phrases), and the drawing that shows the same thing. */
const EMOJI_PICTURES: Record<string, PictureName> = { '🐶': 'dog', '😂': 'happy', '😊': 'happy', '😉': 'wink', '😘': 'love', '☀️': 'sun', '☀': 'sun', '❤️': 'love', '❤': 'love', '👍': 'thumbs', '👌': 'thumbs', '👋': 'hello', '🎂': 'birthday', '🙏': 'thanks' };
const EMOJI = /\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*/u;

/** A picture for an English meaning, if there's a clear one. */
export function pictureFor(en: string): PictureName | undefined {
  const own = en.match(EMOJI)?.[0];
  if (own) return EMOJI_PICTURES[own] ?? EMOJI_PICTURES[own.replace(/\uFE0F/g, '')];
  const words = en.toLowerCase().replace(/\(.*?\)/g, '');
  if (words.split(/\s+/).length > 4) return undefined; // a whole sentence isn't one picture
  return PICTURES.find(([re]) => re.test(words))?.[1];
}

const clean = (text: string) => text.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
const isHan = (text: string) => /\p{Script=Han}/u.test(text);

/**
 * The three hints for an answer. `picture` is shown first if it gives nothing away (it would,
 * when the question already shows the meaning). Chinese starts with the pinyin's first letter.
 */
export function hintsFor(answer: string, { lang, pinyin, en }: { lang: string; pinyin?: string; en?: string }): HintSet {
  const text = clean(answer);
  const han = isHan(text);
  const letter = han && pinyin ? pinyin.trim()[0] : [...text.replace(/^[¿¡"“«\s]+/, '')][0] ?? '';
  let start: string;
  if (han) {
    const chars = [...text.replace(/[^\p{Script=Han}]/gu, '')];
    start = chars.slice(0, Math.max(1, Math.ceil(chars.length / 2) - (chars.length > 3 ? 1 : 0))).join('');
  } else {
    const words = text.split(' ');
    start = words.length > 1 ? words.slice(0, Math.min(3, Math.max(1, Math.floor(words.length / 2)))).join(' ').replace(/[,;:.]$/, '') : [...text].slice(0, Math.max(1, Math.ceil([...text].length / 2))).join('');
  }
  const startPinyin = han && pinyin ? pinyin.split(/\s+/).slice(0, [...start].length).join(' ') : undefined;
  return {
    first: { picture: en ? pictureFor(en) : undefined, letter },
    start: { text: startPinyin ? `${start} (${startPinyin})` : start, audio: `tts:${lang}:${encodeURIComponent(start)}` },
    full: { text, sub: pinyin },
    lang,
  };
}

/** The bird and its thought bubble, with the hints so far, and the Hint button. */
export function HintBubble({ hints, level, onNext, onHear, compact = false }: { hints: HintSet; level: HintLevel; onNext: () => void; onHear?: () => void; compact?: boolean }) {
  const { first, start, full } = hints;
  return (
    <div className={`hint-coach${compact ? ' compact' : ''}`} data-testid="hint-coach" data-level={level}>
      <Bird pose="think" size={compact ? 44 : 56} className={level > 0 ? 'hint-bird thinking' : 'hint-bird'} />
      {level > 0 && (
        <div className="hint-bubble" role="status" aria-live="polite" data-testid="hint-bubble">
          <div className="hint-line hint-1" data-testid="hint-1">
            {first.picture ? (
              <Picture name={first.picture} />
            ) : (
              <>
                Starts with <b lang={hints.lang}>{first.letter}</b>
              </>
            )}
          </div>
          {level >= 2 && (
            <button
              className="hint-line hint-2"
              data-testid="hint-2"
              onClick={() => {
                tapFeedback();
                onHear?.(); // e.g. close the mic first, so it doesn't hear the hint
                playPhrase(start.audio, true);
              }}
              aria-label={`Hear how it starts: ${start.text}`}
            >
              <AudioDisc />
              <span>
                <b lang={hints.lang}>{start.text}</b>…
              </span>
            </button>
          )}
          {level >= 3 && (
            <div className="hint-line hint-3" data-testid="hint-3" lang={hints.lang}>
              {full.text}
              {full.sub && <span className="pinyin small">{full.sub}</span>}
            </div>
          )}
        </div>
      )}
      {level < 3 && (
        <button
          className="hint-btn"
          onClick={() => {
            tapFeedback();
            onNext();
          }}
          data-testid="hint-btn"
        >
          <Icon name="bulb" size={18} /> Hint
        </button>
      )}
    </div>
  );
}
