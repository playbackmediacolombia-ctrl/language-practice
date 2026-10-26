import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import type { Lang, Phrase } from './lib/content';
import { reducedMotion, tapFeedback } from './lib/fx';
import type { Speed } from './lib/progress';
import { navigate, useRoute } from './lib/router';

// ---- Icons: simple line icons drawn for this app (24×24, stroke = currentColor) ----

const STROKE: Record<string, ReactNode> = {
  learn: (
    <>
      <path d="M12 6.5C9.8 5 6.9 4.4 3.5 4.9v13.4c3.4-.5 6.3.1 8.5 1.6 2.2-1.5 5.1-2.1 8.5-1.6V4.9c-3.4-.5-6.3.1-8.5 1.6Z" />
      <path d="M12 6.5v13.4" />
    </>
  ),
  practice: <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />,
  progress: <path d="M5 20v-8M12 20V5M19 20v-5" />,
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  back: <path d="M15 5 8 12l7 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  speaker: (
    <>
      <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5Z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9.5" rx="2.5" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  review: <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1M18.5 3.5v4h-4M19.5 12a7.5 7.5 0 0 1-13 5.1M5.5 20.5v-4h4" />,
  book: (
    <>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z" />
      <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19" />
    </>
  ),
  cards: (
    <>
      <rect x="4" y="6" width="12" height="15" rx="2" />
      <path d="M8 3h10a2 2 0 0 1 2 2v12" />
    </>
  ),
  quiz: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.4M12 16.8v.2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15ZM10 20.5h4" />,
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />,
  chat: <path d="M4 5.5h16v10H9l-5 4Z" />,
  brush: <path d="M14.5 4.5 19.5 9.5 10 19H5v-5ZM12.5 6.5l5 5" />,
};

const FILLED: Record<string, ReactNode> = {
  flame: <path d="M12.3 2.5c.8 3.3 4.7 5.3 4.7 10.2a5 5 0 0 1-10 .3c0-2 .9-3.5 2-4.6.2 1.5.9 2.5 1.9 3 .1-3.4-.2-6.2 1.4-8.9Z" />,
  heart: <path d="M12 20.5s-7.3-4.4-9.1-8.9C1.6 8.3 3.6 5 6.9 5c2 0 3.4 1.1 5.1 3 1.7-1.9 3.1-3 5.1-3 3.3 0 5.3 3.3 4 6.6-1.8 4.5-9.1 8.9-9.1 8.9Z" />,
  bolt: <path d="M13.2 2.5 4.8 13.6h6.3l-1 7.9 8.4-11.1h-6.3Z" />,
  play: <path d="M8 5.2v13.6c0 .8.9 1.3 1.6.8l10-6.8a1 1 0 0 0 0-1.6l-10-6.8c-.7-.5-1.6 0-1.6.8Z" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />,
  pause: (
    <>
      <rect x="6.5" y="5.5" width="4" height="13" rx="1.5" />
      <rect x="13.5" y="5.5" width="4" height="13" rx="1.5" />
    </>
  ),
  star: <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9Z" />,
};

export type IconName = keyof typeof STROKE | keyof typeof FILLED;

export function Icon({ name, size = 22, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  const filled = name in FILLED;
  return (
    <svg
      className={['icon', className].filter(Boolean).join(' ')}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {filled ? FILLED[name] : STROKE[name]}
    </svg>
  );
}

/** A rounded badge for each language. */
export function LangIcon({ lang, size = 44 }: { lang: Lang; size?: number }) {
  const glyph = { es: 'ñ', fr: 'é', zh: '中' }[lang];
  return (
    <span className={`lang-icon lang-${lang}`} style={{ width: size, height: size, fontSize: size * 0.52, borderRadius: size * 0.3 }} aria-hidden="true">
      {glyph}
    </span>
  );
}

/** Streak flame: flickers when the streak is alive, grey when it isn't. */
export function Flame({ lit, size = 22 }: { lit: boolean; size?: number }) {
  return <Icon name="flame" size={size} className={lit ? 'flame lit' : 'flame'} />;
}

// ---- Screens ----

/** The logo, small: the parrot mark and the name in the wordmark's two colors. */
export function Brand() {
  return (
    <span className="brand" aria-label="Learnguage">
      <img src="brand/mark.png" alt="" width={42} height={32} />
      <span className="brand-name" aria-hidden="true">
        <span className="learn">learn</span>
        <span className="guage">guage</span>
      </span>
    </span>
  );
}

/** Top bar. Tab screens show the logo and a large title; pushed screens a back arrow. */
export function Header({ title, back, large, brand = true, action }: { title: string; back?: string; large?: boolean; brand?: boolean; action?: ReactNode }) {
  return (
    <header className={large ? 'header large' : 'header'}>
      <div className="header-bar">
        {large ? (
          brand ? <Brand /> : <span />
        ) : back !== undefined ? (
          <button className="icon-btn back" aria-label="Back" onClick={() => navigate(back, { direction: 'back' })}>
            <Icon name="back" size={26} />
          </button>
        ) : (
          <span className="spacer" />
        )}
        {!large && <h1>{title}</h1>}
        <span className="header-action">{action}</span>
      </div>
      {large && <h1 className="large-title">{title}</h1>}
    </header>
  );
}

export function Screen({
  title,
  back,
  fill,
  large,
  brand,
  action,
  children,
}: {
  title: string;
  back?: string;
  fill?: boolean;
  large?: boolean;
  /** Show the small logo in a large header (default yes). */
  brand?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <Header title={title} back={back} large={large} brand={brand} action={action} />
      <main className={fill ? 'page fill' : 'page'}>{children}</main>
    </>
  );
}

const TABS = [
  { id: 'learn', label: 'Learn', icon: 'learn', path: '/' },
  { id: 'practice', label: 'Practice', icon: 'practice', path: '/practice' },
  { id: 'progress', label: 'Progress', icon: 'progress', path: '/progress' },
  { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export function TabBar({ active }: { active: TabId }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={t.id === active ? 'tab active' : 'tab'}
          aria-current={t.id === active ? 'page' : undefined}
          onClick={() => {
            if (t.id !== active) tapFeedback();
            navigate(t.path, { direction: 'tab' });
          }}
        >
          <Icon name={t.icon} size={26} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/** Hook for the active tab, from the route. */
export function useActiveTab(): TabId | null {
  const [first, second, third] = useRoute();
  if (!first) return 'learn';
  if (first === 'practice' || first === 'progress' || first === 'settings') return first;
  // A language's path is Learn; its phrasebook topics belong to Practice.
  if (['es', 'fr', 'zh'].includes(first)) {
    if (!second) return 'learn';
    if (second === 'learn' || second === 'placement' || third) return null; // lessons, tests and exercises are full screen
    return 'practice';
  }
  return null;
}

/** Phrase in the target language, pinyin for Chinese, and optionally the English. */
export function PhraseText({ phrase, showEnglish = true, size = 'large' }: { phrase: Phrase; showEnglish?: boolean; size?: 'large' | 'small' }) {
  const big = size === 'large';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p className="target" style={{ fontSize: big ? (phrase.pinyin ? 40 : 30) : 20 }}>
        {phrase.text}
      </p>
      {phrase.pinyin && (
        <p className="pinyin" style={{ fontSize: big ? 22 : 15 }}>
          {phrase.pinyin}
        </p>
      )}
      {showEnglish && (
        <p className="english" style={{ fontSize: big ? 18 : 14 }}>
          {phrase.en}
        </p>
      )}
    </div>
  );
}

// ---- Motion ----

/** Fills smoothly from where it was (from 0 on first show). */
export function ProgressBar({ value, tone }: { value: number; tone?: 'accent' | 'ok' | 'flame' }) {
  const target = Math.max(0, Math.min(1, value));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return (
    <div className={`bar ${tone ?? ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(target * 100)}>
      <div style={{ transform: `scaleX(${shown})` }} />
    </div>
  );
}

/** Counts up to `value` (instantly with Reduce Motion). */
export function CountUp({ value, from = 0, duration = 900, prefix = '' }: { value: number; from?: number; duration?: number; prefix?: string }) {
  const [shown, setShown] = useState(reducedMotion() ? value : from);
  useEffect(() => {
    if (reducedMotion()) return setShown(value);
    const start = performance.now();
    let id = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(from + (value - from) * (1 - (1 - t) ** 3)));
      if (t < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [value, from, duration]);
  return (
    <>
      {prefix}
      {shown}
    </>
  );
}

// The logo's blues, yellow and orange, plus a green and a pink for sparkle.
const CONFETTI_COLORS = ['#0B6BF6', '#12A0F8', '#FFC61A', '#FF8A00', '#22C55E', '#FF5C8A'];

/** A one-off confetti shower over the whole screen. Nothing with Reduce Motion. */
export function Confetti({ pieces = 70 }: { pieces?: number }) {
  const [items] = useState(() =>
    Array.from({ length: pieces }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      duration: 1.8 + Math.random() * 1.4,
      drift: (Math.random() - 0.5) * 160,
      spin: (Math.random() - 0.5) * 1080,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w: 6 + Math.random() * 6,
      round: Math.random() < 0.3,
    })),
  );
  if (reducedMotion()) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {items.map((p, i) => (
        <span
          key={i}
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.round ? p.w : p.w * 1.6,
              borderRadius: p.round ? '50%' : 2,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Sparkles bursting out from the middle of the parent (which must be position: relative). */
export function Burst({ count = 10 }: { count?: number }) {
  if (reducedMotion()) return null;
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ '--angle': `${(360 / count) * i + 12}deg`, '--dist': `${38 + (i % 3) * 12}px` } as CSSProperties} />
      ))}
    </span>
  );
}

/** Live sound wave from a recording's analyser, drawn as rounded bars. */
export function Waveform({ analyser }: { analyser: AnalyserNode | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el || !analyser) return;
    const ctx = el.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = el.getBoundingClientRect();
    el.width = width * dpr;
    el.height = height * dpr;
    ctx.scale(dpr, dpr);
    const color = getComputedStyle(el).color;
    const data = new Uint8Array(analyser.fftSize);
    const BARS = 28;
    const levels = new Array<number>(BARS).fill(0);
    let id = 0;
    let lastPush = 0;
    const draw = (now: number) => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      const level = Math.min(1, Math.sqrt(sum / data.length) * 6);
      // Newest level on the right; older ones scroll left a few times a second.
      if (now - lastPush > 55) {
        levels.shift();
        levels.push(level);
        lastPush = now;
      } else {
        levels[BARS - 1] = Math.max(levels[BARS - 1], level);
      }
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      const gap = 4;
      const w = (width - gap * (BARS - 1)) / BARS;
      levels.forEach((l, i) => {
        const h = Math.max(w, l * height);
        const x = i * (w + gap);
        ctx.globalAlpha = 0.35 + 0.65 * ((i + 1) / BARS);
        ctx.beginPath();
        ctx.roundRect(x, (height - h) / 2, w, h, w / 2);
        ctx.fill();
      });
      id = requestAnimationFrame(draw);
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [analyser]);
  return <canvas ref={canvas} className={analyser ? 'waveform live' : 'waveform'} aria-hidden="true" />;
}

/** A native iOS-style switch (Safari 17.4+ draws <input switch> as one). */
export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="list-row toggle">
      <span className="grow">
        <span className="row-title">{label}</span>
        {hint && <span className="row-hint">{hint}</span>}
      </span>
      <input
        type="checkbox"
        {...{ switch: '' }}
        checked={checked}
        onChange={(e) => {
          tapFeedback();
          onChange(e.target.checked);
        }}
      />
    </label>
  );
}

/** Slow / Normal / Fast as small chips, for screens that play a lot of audio. */
export function SpeedPicker({ value, onChange }: { value: Speed; onChange: (s: Speed) => void }) {
  return (
    <div className="speed-pick" role="radiogroup" aria-label="Listening speed">
      {(['slow', 'normal', 'fast'] as const).map((s) => (
        <button
          key={s}
          role="radio"
          aria-checked={s === value}
          className="chip-toggle"
          onClick={() => {
            tapFeedback();
            onChange(s);
          }}
        >
          {s === 'slow' ? 'Slow' : s === 'normal' ? 'Normal' : 'Fast'}
        </button>
      ))}
    </div>
  );
}

/** A row of mutually exclusive options. */
export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'seg active' : 'seg'}
          onClick={() => {
            tapFeedback();
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
