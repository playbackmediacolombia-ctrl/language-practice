import { type ReactNode, useId } from 'react';
import type { Lang } from './lib/content';
import { type InkLayer, STICKERS, TAB_ICONS } from './ink.gen';

// Hand-drawn SVG art in the logo's colors: round flags, a sticker for every unit, and the tab
// bar icons. Everything here is original and drawn in code (no image files, no licenses).

export const PALETTE = {
  blue: '#0164F9',
  deep: '#0142D8',
  sky: '#038CFB',
  skyLight: '#19B6FC',
  sun: '#FCC50E',
  orange: '#F8820C',
  navy: '#071334',
  slate: '#404D6B',
  cream: '#EFE7D0',
  red: '#E5303A',
  white: '#FFFFFF',
};
const P = PALETTE;

/** Banner colors by stage, from the logo (see .tone-* in styles.css). */
export const TONES = ['blue', 'sun', 'sky', 'orange', 'navy'];

/** A five-pointed star centred on (x, y), for the Chinese flag. */
function star(x: number, y: number, r: number, turn = 0) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = ((i * 36 - 90 + turn) * Math.PI) / 180;
    const d = i % 2 ? r * 0.382 : r;
    return `${(x + d * Math.cos(a)).toFixed(2)},${(y + d * Math.sin(a)).toFixed(2)}`;
  });
  return <polygon points={pts.join(' ')} fill="#FFDE00" />;
}

/** The flag of the country whose accent each course teaches (Colombian Spanish, French, Mandarin, Brazilian Portuguese, Italian). */
export function Flag({ lang, size = 32 }: { lang: Lang; size?: number }) {
  const id = useId();
  const art: Record<Lang, ReactNode> = {
    es: (
      <>
        <rect width="36" height="18" fill="#FCD116" />
        <rect y="18" width="36" height="9" fill="#003893" />
        <rect y="27" width="36" height="9" fill="#CE1126" />
      </>
    ),
    fr: (
      <>
        <rect width="12" height="36" fill="#0055A4" />
        <rect x="12" width="12" height="36" fill="#FFFFFF" />
        <rect x="24" width="12" height="36" fill="#EF4135" />
      </>
    ),
    zh: (
      <>
        <rect width="36" height="36" fill="#EE1C25" />
        {star(10.5, 12, 6)}
        {star(18.5, 5.5, 2, 23)}
        {star(22, 9.5, 2, 45)}
        {star(22, 15, 2, 0)}
        {star(18.5, 19, 2, 20)}
      </>
    ),
    pt: (
      <>
        <rect width="36" height="36" fill="#009C3B" />
        <polygon points="18,5 33,18 18,31 3,18" fill="#FFDF00" />
        <circle cx="18" cy="18" r="7.2" fill="#002776" />
        <path d="M11.2 16.4 Q18 14.6 24.8 19.4" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
      </>
    ),
    it: (
      <>
        <rect width="12" height="36" fill="#009246" />
        <rect x="12" width="12" height="36" fill="#FFFFFF" />
        <rect x="24" width="12" height="36" fill="#CE2B37" />
      </>
    ),
  };
  return (
    <svg className="flag" width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <clipPath id={id}>
        <circle cx="18" cy="18" r="18" />
      </clipPath>
      <g clipPath={`url(#${id})`}>{art[lang]}</g>
      <circle cx="18" cy="18" r="17" fill="none" stroke="rgba(7,19,52,0.14)" strokeWidth="2" />
      <ellipse cx="13" cy="9" rx="9" ry="4" fill="#fff" opacity="0.22" />
    </svg>
  );
}

// ---- Hand-drawn art: flat colors under one ink line that swells and tapers, like the Open Peeps
// characters. The drawings are in scripts/ink-art.mjs; scripts/ink.mjs inks them into ink.gen.ts.

const INK = P.navy;

/** Draws generated layers: palette colors, 'ink' (navy), 'cur' (currentColor) or 'duo' (a wash of it). */
export function Ink({ layers }: { layers: readonly InkLayer[] }) {
  return (
    <>
      {layers.map(([c, d], i) =>
        c === 'raw' ? (
          <g key={i} dangerouslySetInnerHTML={{ __html: d }} />
        ) : c === 'duo' ? (
          <path key={i} className="duo" d={d} />
        ) : (
          <path key={i} d={d} fill={c === 'ink' ? INK : c === 'cur' ? 'currentColor' : (P as Record<string, string>)[c] ?? c} />
        ),
      )}
    </>
  );
}

export type StickerName = keyof typeof STICKERS;

/** Which sticker each unit wears, by unit id (falls back to a speech bubble). */
const UNIT_ART: Record<string, keyof typeof STICKERS> = {
  u1: 'sounds', u2: 'words', u3: 'home', u4: 'heart', u5: 'colors', u6: 'pin', u7: 'chat', u8: 'cup', u9: 'sun',
  u10: 'book', u11: 'phone', u12: 'briefcase', u13: 'health', u14: 'plane', u15: 'news', u16: 'debate', u17: 'bowtie',
  u18: 'bulb', u19: 'shades', u20: 'trophy', u21: 'hearts', u22: 'lovetext', u23: 'rings',
  u24: 'wink', u25: 'chat', u26: 'lovetext',
  u27: 'chat', u28: 'cup', u29: 'sun', u30: 'bowtie', u31: 'shades',
};


export function UnitArt({ unitId, size = 64 }: { unitId: string; size?: number }) {
  return <Sticker name={UNIT_ART[unitId] ?? 'words'} size={size} />;
}

/** A sticker by name, for screens that aren't units (practice cards, empty states, celebrations). */
export function Sticker({ name, size = 48, className = '' }: { name: StickerName; size?: number; className?: string }) {
  return (
    <svg className={`unit-art ${className}`.trim()} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <Ink layers={STICKERS[name]} />
    </svg>
  );
}

// ---- Tab bar icons: a light wash under the line, in currentColor so the active tab can tint them ----

export type TabIconName = keyof typeof TAB_ICONS;

export function TabIcon({ name }: { name: TabIconName }) {
  return (
    <svg className="tab-icon" width={28} height={28} viewBox="0 0 24 24" aria-hidden="true">
      <Ink layers={TAB_ICONS[name]} />
    </svg>
  );
}
