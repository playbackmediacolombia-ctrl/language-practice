import type { ReactNode } from 'react';
import './characters.css';

// Original cartoon characters for the role-plays, drawn in SVG in the logo's colors. Each one
// blinks and breathes while idle, moves its mouth with the voice (see lipsync.ts), and reacts to
// your answer: a happy hop when it's right, a puzzled head tilt and "?" to try again.
// Everything for the characters lives in this folder (src/characters/).

export type Mood = 'idle' | 'happy' | 'confused';
export type Role = 'waiter' | 'doctor' | 'receptionist' | 'interviewer' | 'agent' | 'shopkeeper' | 'parent' | 'friend' | 'date';

type Look = {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'bun' | 'long' | 'curly' | 'cap';
  top: string;
  extra: 'apron' | 'coat' | 'blazer' | 'scarf' | 'hoodie' | 'cardigan' | 'none';
  glasses?: boolean;
};

const NAVY = '#071334';
const LOOKS: Record<Role, Look> = {
  waiter: { skin: '#f2c9a5', hair: '#3b2a20', hairStyle: 'short', top: '#0164f9', extra: 'apron' },
  doctor: { skin: '#c98e66', hair: '#1d1d22', hairStyle: 'bun', top: '#ffffff', extra: 'coat', glasses: true },
  receptionist: { skin: '#e8b58e', hair: '#6b3b1f', hairStyle: 'long', top: '#19b6fc', extra: 'scarf' },
  interviewer: { skin: '#f4d0b3', hair: '#8a8f99', hairStyle: 'short', top: '#233c86', extra: 'blazer', glasses: true },
  agent: { skin: '#a86f4c', hair: '#1d1d22', hairStyle: 'cap', top: '#233c86', extra: 'scarf' },
  shopkeeper: { skin: '#d9a07a', hair: '#2b1b12', hairStyle: 'curly', top: '#f8820c', extra: 'apron' },
  parent: { skin: '#efc3a0', hair: '#b9b9c4', hairStyle: 'bun', top: '#d42430', extra: 'cardigan', glasses: true },
  friend: { skin: '#b97a55', hair: '#1d1d22', hairStyle: 'curly', top: '#fcc50e', extra: 'hoodie' },
  date: { skin: '#f0c4a2', hair: '#2b1b12', hairStyle: 'long', top: '#f8820c', extra: 'none' },
};

/** Who you're talking to, from the role-play's "them" (Waiter, Doctor, Your match…). */
export function roleFor(them: string, topic: string): Role {
  const t = them.toLowerCase();
  if (/mom|mother|dad|father/.test(t)) return 'parent';
  if (/waiter|barista|restaurant|server/.test(t)) return 'waiter';
  if (/doctor/.test(t)) return 'doctor';
  if (/receptionist/.test(t)) return 'receptionist';
  if (/hiring|interview|recruit/.test(t)) return 'interviewer';
  if (/agent|airline|officer/.test(t)) return 'agent';
  if (/shop|stall|store|clerk|seller/.test(t)) return 'shopkeeper';
  if (topic === 'dating' || topic === 'flirting') return 'date';
  return 'friend';
}

function Hair({ look, layer }: { look: Look; layer: 'back' | 'front' }) {
  const fill = look.hair;
  if (layer === 'back') {
    if (look.hairStyle === 'long') return <path d="M28 52 C26 26 44 16 60 16 C78 16 94 26 92 52 L95 88 C88 94 80 84 80 74 L40 74 C40 84 32 94 25 88 Z" fill={fill} />;
    if (look.hairStyle === 'bun') return <circle cx="60" cy="17" r="10" fill={fill} />;
    return null;
  }
  switch (look.hairStyle) {
    case 'short':
      return <path d="M30 50 C29 25 46 18 60 18 C76 18 91 26 90 48 C84 37 73 33 60 34 C47 34 37 39 30 50 Z" fill={fill} />;
    case 'bun':
      return <path d="M30 50 C30 28 45 22 60 22 C75 22 90 28 90 50 C82 38 72 34 60 34 C48 34 38 38 30 50 Z" fill={fill} />;
    case 'long':
      return <path d="M31 48 C34 28 48 22 62 22 C74 22 86 28 89 46 C78 37 66 35 54 37 C44 39 36 43 31 48 Z" fill={fill} />;
    case 'curly':
      return (
        <g fill={fill}>
          {[
            [34, 40, 9],
            [44, 29, 10],
            [58, 24, 11],
            [72, 28, 10],
            [83, 39, 9],
            [30, 50, 7],
            [90, 50, 7],
          ].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M31 46 C31 36 36 32 42 32 L78 32 C84 32 89 36 89 46 Z" fill={fill} />
          <path d="M29 42 C31 24 45 17 60 17 C75 17 89 24 91 42 Z" fill={look.top} />
          <path d="M27 42 H93 V47 H27 Z" fill={NAVY} opacity="0.85" />
          <circle cx="60" cy="29" r="4" fill="#fcc50e" />
        </g>
      );
  }
}

function Outfit({ look }: { look: Look }) {
  const torso = 'M20 132 C20 102 38 88 60 88 C82 88 100 102 100 132 Z';
  const parts: ReactNode[] = [<path key="torso" d={torso} fill={look.top} stroke={NAVY} strokeOpacity="0.15" strokeWidth="1.5" />];
  switch (look.extra) {
    case 'apron':
      parts.push(<path key="apron" d="M42 100 H78 V132 H42 Z" fill="#ffffff" opacity="0.95" />, <path key="straps" d="M44 100 L40 90 M76 100 L80 90" stroke="#ffffff" strokeWidth="3" />);
      break;
    case 'coat':
      parts.push(
        <path key="shirt" d="M52 88 L60 104 L68 88 Z" fill="#19b6fc" />,
        <path key="lapels" d="M52 88 L56 112 M68 88 L64 112" stroke="#c7d2e3" strokeWidth="2" />,
        <path key="steth" d="M47 92 C44 108 52 114 60 114 C68 114 76 108 73 92" fill="none" stroke="#404d6b" strokeWidth="2.5" />,
        <circle key="bell" cx="60" cy="116" r="3.5" fill="#404d6b" />,
      );
      break;
    case 'blazer':
      parts.push(<path key="shirt" d="M51 88 L60 104 L69 88 Z" fill="#ffffff" />, <path key="tie" d="M58 92 H62 L64 110 L60 115 L56 110 Z" fill="#d42430" />);
      break;
    case 'scarf':
      parts.push(<path key="scarf" d="M48 88 C54 96 66 96 72 88 L70 98 C64 102 56 102 50 98 Z" fill="#fcc50e" />);
      break;
    case 'hoodie':
      parts.push(<path key="hood" d="M44 90 C50 98 70 98 76 90" fill="none" stroke="#d49f00" strokeWidth="4" />, <path key="strings" d="M54 96 V108 M66 96 V108" stroke="#ffffff" strokeWidth="2" />);
      break;
    case 'cardigan':
      parts.push(
        <path key="shirt" d="M53 88 L60 132 L67 88 Z" fill="#efe7d0" />,
        ...[104, 114, 124].map((y) => <circle key={y} cx="60" cy={y} r="1.8" fill={NAVY} />),
      );
      break;
  }
  return <g>{parts}</g>;
}

/** The mouth: a resting smile, three open shapes while speaking, a grin or a wobble for reactions. */
function Mouth({ open, mood }: { open: number; mood: Mood }) {
  if (open === 1) return <ellipse cx="60" cy="69" rx="4" ry="2.6" fill="#5a1820" />;
  if (open === 2) return <ellipse cx="60" cy="69" rx="5.5" ry="4.5" fill="#5a1820" />;
  if (open === 3)
    return (
      <g>
        <ellipse cx="60" cy="70" rx="6.5" ry="6.5" fill="#5a1820" />
        <ellipse cx="60" cy="74" rx="4" ry="2.2" fill="#e5707a" />
      </g>
    );
  if (mood === 'happy')
    return (
      <g>
        <path d="M49 65 Q60 80 71 65 Z" fill="#5a1820" />
        <path d="M51 65.5 H69 L68 68 H52 Z" fill="#ffffff" />
      </g>
    );
  if (mood === 'confused') return <path d="M51 70 q2.2 -2.6 4.5 0 t4.5 0 t4.5 0 t4.5 0" fill="none" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />;
  return <path d="M53 67 Q60 72.5 67 67" fill="none" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />;
}

export function Character({ role, mood, mouth, label }: { role: Role; mood: Mood; mouth: number; label: string }) {
  const look = LOOKS[role];
  const brows =
    mood === 'confused'
      ? ['M43 41 Q49 36 55 41', 'M65 45 L77 44']
      : mood === 'happy'
        ? ['M43 42 Q49 38 55 42', 'M65 42 Q71 38 77 42']
        : ['M43 45 Q49 42 55 45', 'M65 45 Q71 42 77 45'];
  return (
    <div className={`character mood-${mood}${mouth ? ' talking' : ''}`} role="img" aria-label={label} data-testid="character" data-mood={mood} data-mouth={mouth}>
      <svg viewBox="0 0 120 132" width="120" height="132" aria-hidden="true">
        <ellipse cx="60" cy="130" rx="40" ry="4" fill={NAVY} opacity="0.08" />
        <g className="char-body">
          <Outfit look={look} />
        </g>
        <g className="char-head">
          <Hair look={look} layer="back" />
          <rect x="52" y="74" width="16" height="16" rx="5" fill={look.skin} />
          <circle cx="30" cy="56" r="6" fill={look.skin} />
          <circle cx="90" cy="56" r="6" fill={look.skin} />
          <circle cx="60" cy="54" r="30" fill={look.skin} />
          <Hair look={look} layer="front" />
          <g fill="none" stroke={NAVY} strokeWidth="2.6" strokeLinecap="round">
            <path d={brows[0]} />
            <path d={brows[1]} />
          </g>
          {mood === 'happy' && mouth === 0 ? (
            <g fill="none" stroke={NAVY} strokeWidth="2.8" strokeLinecap="round">
              <path d="M45 56 Q49 51 53 56" />
              <path d="M67 56 Q71 51 75 56" />
            </g>
          ) : (
            <g className="char-eyes">
              <ellipse cx="49" cy="55" rx="3.6" ry="4.4" fill={NAVY} />
              <ellipse cx="71" cy="55" rx="3.6" ry="4.4" fill={NAVY} />
              <circle cx="50.2" cy="53.4" r="1.2" fill="#ffffff" />
              <circle cx="72.2" cy="53.4" r="1.2" fill="#ffffff" />
            </g>
          )}
          {look.glasses && (
            <g fill="none" stroke={NAVY} strokeWidth="2">
              <circle cx="49" cy="55" r="8" />
              <circle cx="71" cy="55" r="8" />
              <path d="M57 55 H63" />
            </g>
          )}
          <ellipse className="char-cheek" cx="41" cy="65" rx="5" ry="3" fill="#e5303a" />
          <ellipse className="char-cheek" cx="79" cy="65" rx="5" ry="3" fill="#e5303a" />
          <Mouth open={mouth} mood={mood} />
        </g>
        {mood === 'confused' && (
          <text className="char-q" x="100" y="26" fontSize="26" fontWeight="800" fill="#0164f9" fontFamily="Plus Jakarta Sans Variable, sans-serif">
            ?
          </text>
        )}
        {mood === 'happy' && (
          <g className="char-sparkle" fill="#fcc50e">
            <path d="M14 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" />
            <path d="M104 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
          </g>
        )}
      </svg>
    </div>
  );
}
