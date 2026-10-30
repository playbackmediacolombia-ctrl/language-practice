import { Flag, Ink, TabIcon } from './art';
import { BITS, ICONS } from './ink.gen';
import { type ComponentProps, type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { isLang, type Lang, type Phrase } from './lib/content';
import { reducedMotion, tapFeedback } from './lib/fx';
import type { Speed } from './lib/progress';
import { navigate, useRoute } from './lib/router';

// ---- Icons: hand-drawn, in the same ink line as the characters (24×24, in currentColor).
// The drawings are in scripts/ink-art.mjs; scripts/ink.mjs inks them into ink.gen.ts. ----

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg data-icon={name} className={['icon', className].filter(Boolean).join(' ')} style={style} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <Ink layers={ICONS[name]} />
    </svg>
  );
}

/** The round speaker on anything that plays sound: 48px with a visible background (DESIGN.md › Audio buttons). */
export function AudioDisc({ name = 'speaker', big }: { name?: IconName; big?: boolean }) {
  return (
    <span className={big ? 'audio-disc big' : 'audio-disc'} aria-hidden="true">
      <Icon name={name} size={big ? 34 : 24} />
    </span>
  );
}

/** A round audio button with its label under it: Slowly, Play, Again. */
export function AudioButton({ label, big, name, className = '', ...rest }: { label: string; big?: boolean; name?: IconName } & ComponentProps<'button'>) {
  return (
    <button className={`audio-labeled ${className}`} {...rest}>
      <AudioDisc name={name} big={big} />
      <span className="audio-label">{label}</span>
    </button>
  );
}

/** How well a card is known: hand-drawn dots, filled up to `value`. */
export function LevelDots({ value, max }: { value: number; max: number }) {
  return (
    <span className="level" role="img" aria-label={`Known ${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width={12} height={12} className={i < value ? 'on' : undefined}>
          <Ink layers={BITS.dot} />
        </svg>
      ))}
    </span>
  );
}

/** Each language's round flag. */
export function LangIcon({ lang, size = 44 }: { lang: Lang; size?: number }) {
  return <Flag lang={lang} size={size} />;
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
          <span className="tab-pill">
            <TabIcon name={t.id} />
          </span>
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
  if (isLang(first)) {
    if (!second) return 'learn';
    if (second === 'learn' || second === 'placement' || second === 'level' || second === 'talk' || second === 'camera' || third) return null; // lessons, tests and exercises are full screen
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
/** Confetti and sparkles are hand-drawn bits: squiggles, stars, dots and zigzags. */
const BIT_KINDS = ['squiggle', 'star', 'dot', 'zig', 'squiggle', 'star'] as const;

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
      w: 12 + Math.random() * 8,
      kind: BIT_KINDS[Math.floor(Math.random() * BIT_KINDS.length)],
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
              height: p.w,
              color: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 24 24" width={p.w} height={p.w}>
            <Ink layers={BITS[p.kind]} />
          </svg>
        </span>
      ))}
    </div>
  );
}

/** Hand-drawn sparkles bursting out from the middle of the parent (which must be position: relative). */
export function Burst({ count = 10 }: { count?: number }) {
  if (reducedMotion()) return null;
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ '--angle': `${(360 / count) * i + 12}deg`, '--dist': `${38 + (i % 3) * 12}px` } as CSSProperties}>
          <svg viewBox="0 0 24 24" width="100%" height="100%">
            <Ink layers={BITS[i % 3 === 0 ? 'spark' : i % 3 === 1 ? 'star' : 'dot']} />
          </svg>
        </span>
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
