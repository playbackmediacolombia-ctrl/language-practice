import { type ReactNode, useId } from 'react';
import type { Lang } from './lib/content';

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

/** A five-pointed star centred on (x, y), for the Chinese flag. */
function star(x: number, y: number, r: number, turn = 0) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = ((i * 36 - 90 + turn) * Math.PI) / 180;
    const d = i % 2 ? r * 0.382 : r;
    return `${(x + d * Math.cos(a)).toFixed(2)},${(y + d * Math.sin(a)).toFixed(2)}`;
  });
  return <polygon points={pts.join(' ')} fill="#FFDE00" />;
}

/** The flag of the country whose accent each course teaches (Colombian Spanish, French, Mandarin). */
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

// ---- Unit stickers: 64×64, navy outlines and the logo's colors, on a white disc ----

const S = { stroke: P.navy, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const STICKERS: Record<string, ReactNode> = {
  sounds: (
    <>
      <path d="M14 26h8l10-8v28l-10-8h-8Z" fill={P.sun} {...S} />
      <path d="M38 25c3 3 3 11 0 14M43 20c6 6 6 18 0 24" fill="none" {...S} stroke={P.blue} />
    </>
  ),
  words: (
    <>
      <path d="M12 18a6 6 0 0 1 6-6h28a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H28l-10 8v-8a6 6 0 0 1-6-6Z" fill={P.skyLight} {...S} />
      <text x="32" y="34" textAnchor="middle" fontSize="18" fontWeight="900" fill={P.white} fontFamily="Nunito Variable, sans-serif">
        hi!
      </text>
    </>
  ),
  home: (
    <>
      <path d="M12 30 32 13l20 17v19a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3Z" fill={P.orange} {...S} />
      <path d="M32 46s-9-5-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 11-9 11Z" fill={P.white} {...S} strokeWidth={2.5} />
    </>
  ),
  heart: (
    <path d="M32 52S12 40 12 25a10 10 0 0 1 20-4 10 10 0 0 1 20 4c0 15-20 27-20 27Z" fill={P.red} {...S} />
  ),
  colors: (
    <>
      <path d="M32 11C19 11 10 20 10 31s8 20 17 20c4 0 5-3 4-6s1-6 5-6h6c6 0 10-4 10-10 0-10-9-18-20-18Z" fill={P.cream} {...S} />
      <circle cx="22" cy="27" r="4" fill={P.red} />
      <circle cx="31" cy="20" r="4" fill={P.sun} />
      <circle cx="41" cy="24" r="4" fill={P.blue} />
      <circle cx="22" cy="39" r="4" fill={P.skyLight} />
    </>
  ),
  pin: (
    <>
      <path d="M32 54S16 37 16 27a16 16 0 0 1 32 0c0 10-16 27-16 27Z" fill={P.red} {...S} />
      <circle cx="32" cy="27" r="6" fill={P.white} {...S} strokeWidth={2.5} />
    </>
  ),
  chat: (
    <>
      <path d="M8 16a5 5 0 0 1 5-5h22a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H20l-7 6v-6a5 5 0 0 1-5-5Z" fill={P.sun} {...S} />
      <path d="M56 32a5 5 0 0 0-5-5H31a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h12l7 6v-6a5 5 0 0 0 6-5Z" fill={P.skyLight} {...S} />
    </>
  ),
  cup: (
    <>
      <path d="M14 24h30v14a12 12 0 0 1-12 12h-6a12 12 0 0 1-12-12Z" fill={P.white} {...S} />
      <path d="M44 28h4a6 6 0 0 1 0 12h-5" fill="none" {...S} />
      <path d="M16 31h26" stroke={P.orange} strokeWidth={5} />
      <path d="M24 10c-3 4 3 6 0 10M33 10c-3 4 3 6 0 10" fill="none" {...S} stroke={P.slate} strokeWidth={2.5} />
    </>
  ),
  sun: (
    <>
      <g stroke={P.orange} strokeWidth={4} strokeLinecap="round">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} d="M32 6v7" transform={`rotate(${a} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="13" fill={P.sun} {...S} />
    </>
  ),
  book: (
    <>
      <path d="M32 18c-6-4-14-5-21-4v32c7-1 15 0 21 4 6-4 14-5 21-4V14c-7-1-15 0-21 4Z" fill={P.white} {...S} />
      <path d="M32 18v32" {...S} />
      <path d="M17 23c4 0 7 1 10 2M17 30c4 0 7 1 10 2M37 25c3-1 6-2 10-2M37 32c3-1 6-2 10-2" stroke={P.blue} strokeWidth={2.5} strokeLinecap="round" />
    </>
  ),
  phone: (
    <>
      <rect x="18" y="8" width="28" height="48" rx="6" fill={P.navy} {...S} />
      <rect x="21" y="14" width="22" height="34" rx="2" fill={P.white} />
      <path d="M24 22h14l-3 3h-11Z" fill={P.skyLight} />
      <path d="M27 32h13v5H31l-4 3Z" fill={P.sun} />
    </>
  ),
  briefcase: (
    <>
      <path d="M24 20v-4a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" fill="none" {...S} />
      <rect x="10" y="20" width="44" height="30" rx="5" fill={P.orange} {...S} />
      <path d="M10 32h44" {...S} />
      <rect x="28" y="29" width="8" height="7" rx="2" fill={P.sun} {...S} strokeWidth={2.5} />
    </>
  ),
  health: (
    <>
      <path d="M32 52S12 40 12 25a10 10 0 0 1 20-4 10 10 0 0 1 20 4c0 15-20 27-20 27Z" fill={P.white} {...S} />
      <path d="M32 24v16M24 32h16" stroke={P.red} strokeWidth={6} strokeLinecap="round" />
    </>
  ),
  plane: (
    <>
      <path d="M8 36 56 14l-14 36-9-11Z" fill={P.white} {...S} />
      <path d="m33 39 23-25-30 20" fill={P.skyLight} {...S} />
    </>
  ),
  news: (
    <>
      <rect x="10" y="12" width="40" height="40" rx="4" fill={P.white} {...S} />
      <path d="M50 22h4v24a6 6 0 0 1-6 6" fill="none" {...S} />
      <rect x="16" y="18" width="28" height="9" rx="2" fill={P.blue} />
      <path d="M16 34h12M16 40h12M16 46h12" stroke={P.slate} strokeWidth={2.5} strokeLinecap="round" />
      <rect x="32" y="33" width="12" height="13" rx="2" fill={P.sun} />
    </>
  ),
  debate: (
    <>
      <path d="M6 18a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H18l-7 6v-6a5 5 0 0 1-5-5Z" fill={P.red} {...S} />
      <path d="M58 30a5 5 0 0 0-5-5H35a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h11l7 6v-6a5 5 0 0 0 5-5Z" fill={P.blue} {...S} />
      <text x="20" y="29" textAnchor="middle" fontSize="15" fontWeight="900" fill={P.white} fontFamily="Nunito Variable, sans-serif">!</text>
      <text x="44" y="41" textAnchor="middle" fontSize="15" fontWeight="900" fill={P.white} fontFamily="Nunito Variable, sans-serif">?</text>
    </>
  ),
  bowtie: (
    <>
      <path d="M8 20l20 9v6L8 44Z M56 20 36 29v6l20 9Z" fill={P.blue} {...S} />
      <rect x="27" y="26" width="10" height="12" rx="3" fill={P.sun} {...S} />
    </>
  ),
  bulb: (
    <>
      <path d="M32 8a16 16 0 0 0-9 29c2 2 3 4 3 7h12c0-3 1-5 3-7a16 16 0 0 0-9-29Z" fill={P.sun} {...S} />
      <path d="M26 50h12M28 56h8" {...S} />
      <path d="M27 23c1-3 3-5 6-5" fill="none" stroke={P.white} strokeWidth={3} strokeLinecap="round" />
    </>
  ),
  shades: (
    <>
      <circle cx="32" cy="32" r="22" fill={P.sun} {...S} />
      <path d="M14 27h36" {...S} />
      <path d="M15 27h14v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6ZM35 27h14v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6Z" fill={P.navy} {...S} />
      <path d="M25 45c4 3 10 3 14 0" fill="none" {...S} />
    </>
  ),
  trophy: (
    <>
      <path d="M20 10h24v14a12 12 0 0 1-24 0Z" fill={P.sun} {...S} />
      <path d="M20 15h-7a7 7 0 0 0 7 9M44 15h7a7 7 0 0 1-7 9" fill="none" {...S} />
      <path d="M32 36v8M24 52h16l-2-8H26Z" fill={P.orange} {...S} />
      <path d="m32 15 2 4 4 .6-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.6Z" fill={P.white} />
    </>
  ),
  hearts: (
    <>
      <path d="M24 46S8 37 8 25a8 8 0 0 1 16-3 8 8 0 0 1 16 3c0 12-16 21-16 21Z" fill={P.red} {...S} />
      <path d="M42 54S30 47 30 38a6 6 0 0 1 12-2 6 6 0 0 1 12 2c0 9-12 16-12 16Z" fill={P.orange} {...S} />
    </>
  ),
  lovetext: (
    <>
      <rect x="18" y="8" width="28" height="48" rx="6" fill={P.navy} {...S} />
      <rect x="21" y="14" width="22" height="34" rx="2" fill={P.white} />
      <path d="M32 40s-7-4-7-9a3.5 3.5 0 0 1 7-1.5 3.5 3.5 0 0 1 7 1.5c0 5-7 9-7 9Z" fill={P.red} />
    </>
  ),
  rings: (
    <>
      <circle cx="25" cy="36" r="13" fill="none" {...S} strokeWidth={7} stroke={P.navy} />
      <circle cx="25" cy="36" r="13" fill="none" stroke={P.sun} strokeWidth={3.5} />
      <circle cx="39" cy="36" r="13" fill="none" {...S} strokeWidth={7} stroke={P.navy} />
      <circle cx="39" cy="36" r="13" fill="none" stroke={P.sun} strokeWidth={3.5} />
      <path d="m39 13 4 5-4 5-4-5Z" fill={P.skyLight} {...S} strokeWidth={2} />
    </>
  ),
  wink: (
    <>
      <circle cx="32" cy="32" r="22" fill={P.sun} {...S} />
      <path d="M22 28c2-2 5-2 7 0" fill="none" {...S} />
      <circle cx="41" cy="27" r="3" fill={P.navy} />
      <path d="M22 39c5 6 15 6 20 0" fill={P.white} {...S} />
      <path d="M46 14s-4-2-4-5a2 2 0 0 1 4-1 2 2 0 0 1 4 1c0 3-4 5-4 5Z" fill={P.red} />
    </>
  ),
};

/** Which sticker each unit wears, by unit id (falls back to a speech bubble). */
const UNIT_ART: Record<string, keyof typeof STICKERS> = {
  u1: 'sounds', u2: 'words', u3: 'home', u4: 'heart', u5: 'colors', u6: 'pin', u7: 'chat', u8: 'cup', u9: 'sun',
  u10: 'book', u11: 'phone', u12: 'briefcase', u13: 'health', u14: 'plane', u15: 'news', u16: 'debate', u17: 'bowtie',
  u18: 'bulb', u19: 'shades', u20: 'trophy', u21: 'hearts', u22: 'lovetext', u23: 'rings',
  u24: 'wink', u25: 'chat', u26: 'lovetext',
};

export function UnitArt({ unitId, size = 64 }: { unitId: string; size?: number }) {
  return (
    <svg className="unit-art" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {STICKERS[UNIT_ART[unitId] ?? 'words']}
    </svg>
  );
}

/** A sticker by name, for screens that aren't units (practice cards, empty states). */
export function Sticker({ name, size = 48 }: { name: keyof typeof STICKERS; size?: number }) {
  return (
    <svg className="unit-art" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {STICKERS[name]}
    </svg>
  );
}
export type StickerName = keyof typeof STICKERS;

// ---- Tab bar icons: duotone, drawn in currentColor so the active tab can tint them ----

const TAB_ICONS = {
  learn: (
    <>
      <path className="duo" d="M4 11.2 12 4.5l8 6.7v8.3a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5Z" />
      <path d="M4 11.2 12 4.5l8 6.7v8.3a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5Z" />
    </>
  ),
  practice: (
    <>
      <rect className="duo" x="5" y="7" width="3.5" height="10" rx="1.2" />
      <rect className="duo" x="15.5" y="7" width="3.5" height="10" rx="1.2" />
      <rect x="5" y="7" width="3.5" height="10" rx="1.2" />
      <rect x="15.5" y="7" width="3.5" height="10" rx="1.2" />
      <path d="M8.5 12h7M2.5 10v4M21.5 10v4" />
    </>
  ),
  progress: (
    <>
      <path className="duo" d="M7 4h10v5a5 5 0 0 1-10 0Z" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0ZM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v3M8.5 20.5h7l-1-3.5h-5Z" />
    </>
  ),
  settings: (
    <>
      <circle className="duo" cx="12" cy="12" r="7" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
      <circle cx="12" cy="12" r="6.2" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
};
export type TabIconName = keyof typeof TAB_ICONS;

export function TabIcon({ name }: { name: TabIconName }) {
  return (
    <svg className="tab-icon" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TAB_ICONS[name]}
    </svg>
  );
}
