import { type CSSProperties, type ReactNode, useEffect, useId, useState } from 'react';
import { BODY, FACE, GLASSES, HEADS, type HeadStyle } from './peeps.gen';
import './characters.css';

// The people you talk to in role-plays, phone calls and the AI partner: Open Peeps by Pablo
// Stanley (CC0), recolored in the app's palette and rigged here. They breathe, blink at natural
// intervals, glance around, move their lips with the voice (see lipsync.ts), and change
// expression smoothly: every face part is drawn once and cross-faded, never swapped.
// Everything for the characters lives in this folder (src/characters/).

/** How they react. `talking` comes from the voice, not from here. */
export type Mood = 'idle' | 'happy' | 'confused' | 'thinking' | 'wave' | 'celebrate';
export type Role = 'waiter' | 'doctor' | 'receptionist' | 'interviewer' | 'agent' | 'shopkeeper' | 'parent' | 'friend' | 'date' | 'driver' | 'caller';

type Look = {
  head: HeadStyle;
  skin: string;
  hair: string;
  cloth: string;
  glasses?: keyof typeof GLASSES;
  outfit?: Outfit;
};
type Outfit = 'bowtie' | 'coat' | 'tie' | 'badge' | 'apron' | 'lanyard' | 'hoodie' | 'necklace' | 'cardigan' | 'vest';

const LOOKS: Record<Role, Look> = {
  waiter: {
    head: 'pomp',
    skin: '#f2c9a5',
    hair: '#3b2a20',
    cloth: '#ffffff',
    outfit: 'vest',
  },
  doctor: {
    head: 'bun',
    skin: '#c98e66',
    hair: '#1d1d22',
    cloth: '#ffffff',
    glasses: 'round',
    outfit: 'coat',
  },
  receptionist: {
    head: 'mediumBangs',
    skin: '#e8b58e',
    hair: '#6b3b1f',
    cloth: '#19b6fc',
    outfit: 'lanyard',
  },
  interviewer: {
    head: 'grayShort',
    skin: '#f4d0b3',
    hair: '#8a8f99',
    cloth: '#233c86',
    glasses: 'square',
    outfit: 'tie',
  },
  agent: {
    head: 'hijab',
    skin: '#a86f4c',
    hair: '#0164f9',
    cloth: '#233c86',
    outfit: 'badge',
  },
  shopkeeper: {
    head: 'afro',
    skin: '#8d5a3b',
    hair: '#1d1d22',
    cloth: '#f8820c',
    outfit: 'apron',
  },
  parent: {
    head: 'grayBun',
    skin: '#efc3a0',
    hair: '#b9b9c4',
    cloth: '#d42430',
    glasses: 'round',
    outfit: 'cardigan',
  },
  friend: {
    head: 'hatBeanie',
    skin: '#b97a55',
    hair: '#1d1d22',
    cloth: '#fcc50e',
    outfit: 'hoodie',
  },
  date: {
    head: 'longCurly',
    skin: '#f0c4a2',
    hair: '#2b1b12',
    cloth: '#f8820c',
    outfit: 'necklace',
  },
  driver: {
    head: 'short2',
    skin: '#d9a07a',
    hair: '#2b1b12',
    cloth: '#0164f9',
    outfit: 'badge',
  },
  caller: {
    head: 'twists2',
    skin: '#9b6646',
    hair: '#1d1d22',
    cloth: '#19b6fc',
  },
};

/** Who you're talking to, from the role-play's "them" (Waiter, Doctor, Your match…). */
export function roleFor(them: string, topic: string): Role {
  const t = them.toLowerCase();
  if (/mom|mother|dad|father|grand/.test(t)) return 'parent';
  if (/waiter|barista|restaurant|server|host/.test(t)) return 'waiter';
  if (/doctor|nurse|pharmac/.test(t)) return 'doctor';
  if (/receptionist|hotel/.test(t)) return 'receptionist';
  if (/hiring|interview|recruit|boss|manager/.test(t)) return 'interviewer';
  if (/agent|airline|officer|police/.test(t)) return 'agent';
  if (/shop|stall|store|clerk|seller|market/.test(t)) return 'shopkeeper';
  if (/taxi|driver/.test(t)) return 'driver';
  if (/caller|operator|support/.test(t)) return 'caller';
  if (topic === 'dating' || topic === 'flirting') return 'date';
  return 'friend';
}

const raw = (svg: string) => ({ dangerouslySetInnerHTML: { __html: svg } });

/** One face part that fades in and out (expressions blend instead of jumping). */
function Part({ svg, on, className = '', style }: { svg: string; on: boolean; className?: string; style?: CSSProperties }) {
  return <g className={`pp-part ${on ? 'on' : ''} ${className}`} style={style} {...raw(svg)} />;
}

/** Clothing details in the drawings' ink style, so each role is easy to recognise. */
function OutfitDetail({ outfit }: { outfit?: Outfit }) {
  const ink = {
    stroke: 'var(--peep-ink)',
    strokeWidth: 8,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  };
  switch (outfit) {
    case 'bowtie':
      return <path d="M391 708 L350 688 L350 730 Z M391 708 L432 688 L432 730 Z" fill="#d42430" {...ink} />;
    case 'vest':
      return (
        <g {...ink}>
          <path d="M300 640 L352 680 L391 760 L391 830 L300 830 Z M482 640 L430 680 L391 760 L391 830 L482 830 Z" fill="#071334" />
          <path d="M391 712 L354 694 L354 732 Z M391 712 L428 694 L428 732 Z" fill="#d42430" />
        </g>
      );
    case 'coat':
      return (
        <g {...ink} fill="none">
          <path d="M300 640 L370 760 L340 830 M482 640 L412 760 L442 830" />
          <path d="M320 640 C300 720 330 770 360 770" />
          <circle cx="366" cy="776" r="16" fill="#8a96b3" />
          <path d="M462 640 C480 700 470 740 452 760" />
        </g>
      );
    case 'tie':
      return (
        <g {...ink}>
          <path d="M352 650 L391 700 L430 650 L430 700 L391 712 L352 700 Z" fill="#ffffff" />
          <path d="M376 702 H406 L414 800 L391 830 L368 800 Z" fill="#d42430" />
        </g>
      );
    case 'badge':
      return (
        <g {...ink}>
          <rect x="452" y="742" width="78" height="48" rx="10" fill="#fcc50e" />
          <path d="M470 760 H512 M470 774 H498" />
        </g>
      );
    case 'lanyard':
      return (
        <g {...ink} fill="none">
          <path d="M330 640 L391 770 L452 640" stroke="#0164f9" strokeWidth="14" />
          <rect x="360" y="768" width="62" height="54" rx="8" fill="#ffffff" stroke="var(--peep-ink)" strokeWidth="8" />
        </g>
      );
    case 'apron':
      return (
        <g {...ink}>
          <path d="M318 744 H464 V840 H318 Z" fill="#ffffff" />
          <path d="M318 744 L330 650 M464 744 L452 650" fill="none" />
        </g>
      );
    case 'hoodie':
      return (
        <g {...ink} fill="none">
          <path d="M290 630 C330 700 452 700 492 630" strokeWidth="12" stroke="#d49f00" />
          <path d="M360 690 V780 M422 690 V780" />
        </g>
      );
    case 'necklace':
      return (
        <g {...ink}>
          <path d="M318 640 C340 700 442 700 464 640" fill="none" strokeWidth="5" />
          <circle cx="391" cy="694" r="12" fill="#fcc50e" />
        </g>
      );
    case 'cardigan':
      return (
        <g {...ink}>
          <path d="M300 640 L380 840 M482 640 L402 840" fill="none" />
          {[740, 790].map((y) => (
            <circle key={y} cx="391" cy={y} r="7" fill="var(--peep-ink)" />
          ))}
        </g>
      );
    default:
      return null;
  }
}

/** A raised hand for waving and celebrating, drawn to match. */
function Hand() {
  const ink = {
    stroke: 'var(--peep-ink)',
    strokeWidth: 8,
    strokeLinejoin: 'round' as const,
  };
  return (
    <g className="pp-hand" transform="translate(-62 34)">
      <path d="M90 840 C96 720 112 610 132 540 L206 556 C190 630 184 730 190 840 Z" fill="var(--peep-cloth)" {...ink} />
      <g fill="var(--peep-skin)" {...ink}>
        <rect x="104" y="378" width="24" height="84" rx="12" transform="rotate(-14 116 460)" />
        <rect x="132" y="358" width="24" height="96" rx="12" transform="rotate(-4 144 454)" />
        <rect x="160" y="362" width="24" height="92" rx="12" transform="rotate(6 172 454)" />
        <rect x="186" y="386" width="22" height="76" rx="11" transform="rotate(16 197 462)" />
        <rect x="84" y="446" width="26" height="72" rx="13" transform="rotate(-38 110 500)" />
        <path d="M100 450 C100 430 210 430 212 456 C216 500 204 548 196 560 L136 548 C118 530 100 500 100 450 Z" />
      </g>
    </g>
  );
}

/** The talking mouth: opens with the voice, rounder for "o/u", wider for "e/i". Same ink as the drawings. */
function TalkMouth({ open, round, on }: { open: number; round: number; on: boolean }) {
  const clip = useId();
  const cx = 160;
  const top = 220;
  const w = 66 - round * 22 + (1 - round) * open * 6;
  const h = 6 + open * 44;
  const d = `M${cx - w / 2} ${top} C${cx - w / 4} ${top - 5} ${cx + w / 4} ${top - 5} ${cx + w / 2} ${top} C${cx + w / 2 + 2} ${top + h * 0.9} ${cx - w / 2 - 2} ${top + h * 0.9} ${cx - w / 2} ${top} Z`;
  return (
    <g className={`pp-part pp-talk ${on ? 'on' : ''}`}>
      <defs>
        <clipPath id={clip}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill="var(--peep-ink)" />
      <g clipPath={`url(#${clip})`}>
        <rect x={cx - 40} y={top - 6} width="80" height={6 + open * 8} rx="4" fill="var(--peep-white)" opacity={open > 0.3 ? 1 : 0} />
        <ellipse cx={cx} cy={top + h * 0.72} rx={w * 0.32} ry={h * 0.26} fill="#f37b8a" />
      </g>
    </g>
  );
}

/** Random natural blinks (now and then a double blink), and small glances while idle. */
function useAlive(still: boolean) {
  const [blink, setBlink] = useState(false);
  const [glance, setGlance] = useState({ x: 0, y: 0, tilt: 0 });
  useEffect(() => {
    if (still) return;
    let t: ReturnType<typeof setTimeout>;
    const once = (then: () => void) => {
      setBlink(true);
      t = setTimeout(() => {
        setBlink(false);
        then();
      }, 120);
    };
    const next = () => {
      t = setTimeout(() => once(() => (Math.random() < 0.2 ? (t = setTimeout(() => once(next), 160)) : next())), 1800 + Math.random() * 3600);
    };
    next();
    return () => clearTimeout(t);
  }, [still]);
  useEffect(() => {
    if (still) return;
    const id = setInterval(() => {
      const r = Math.random();
      setGlance(
        r < 0.45
          ? { x: 0, y: 0, tilt: 0 }
          : {
              x: (Math.random() - 0.5) * 14,
              y: (Math.random() - 0.6) * 8,
              tilt: (Math.random() - 0.5) * 4,
            },
      );
    }, 2600);
    return () => clearInterval(id);
  }, [still]);
  return { blink, glance };
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A character. `mouth` is how open it is (0–1, from the voice), `round` how rounded the sound
 * is; `mood` is how they react. `size` is the height in px.
 */
export function Character({
  role,
  mood,
  mouth,
  round = 0.4,
  label,
  size = 132,
  crop = 'bust',
  speaking,
}: {
  role: Role;
  mood: Mood;
  mouth: number;
  round?: number;
  label: string;
  size?: number;
  crop?: 'bust' | 'face';
  /** Their voice is playing (so the face stays in talking mode between words). Defaults to the mouth being open. */
  speaking?: boolean;
}) {
  const look = LOOKS[role];
  const [still] = useState(reducedMotion);
  const { blink, glance } = useAlive(still);
  const talking = speaking ?? mouth > 0.02;
  const m = talking ? 'idle' : mood;
  const joy = m === 'celebrate';
  const happyish = m === 'happy' || m === 'wave';
  const eyes = joy ? 'joy' : happyish ? 'happy' : 'open';
  const brows = joy || m === 'happy' ? 'joy' : m === 'confused' ? 'worry' : m === 'thinking' ? 'think' : 'plain';
  const rest = joy ? 'laugh' : happyish ? 'smile' : m === 'confused' ? 'hmm' : m === 'thinking' ? 'o' : 'rest';
  // Looking up while thinking; a puzzled tilt; a little nod with louder syllables.
  const lookX = m === 'thinking' ? 8 : glance.x;
  const lookY = m === 'thinking' ? -10 : glance.y;
  const tilt = m === 'confused' ? -7 : m === 'thinking' ? 4 : talking ? glance.tilt - mouth * 2 : glance.tilt;
  const headY = talking ? -mouth * 10 : 0;
  const browLift = talking ? -mouth * 7 : 0;
  const vars = {
    '--peep-skin': look.skin,
    '--peep-hair': look.hair,
    '--peep-cloth': look.cloth,
  } as CSSProperties;
  const clip = useId();
  const viewBox = crop === 'face' ? '150 20 500 500' : '20 0 700 860';
  const width = crop === 'face' ? size : Math.round((size * 700) / 860);
  return (
    <div
      className={`character mood-${m}${talking ? ' talking' : ''}${still ? ' still' : ''}`}
      role="img"
      aria-label={label}
      data-testid="character"
      data-mood={mood}
      data-mouth={Math.round(mouth * 3)}
      style={{ ...vars, width, height: size }}
    >
      <svg viewBox={viewBox} width={width} height={size} aria-hidden="true">
        <defs>
          {/* The drawing carries on below the frame: cut it at the bottom edge (the hand waits there too). */}
          <clipPath id={clip}>
            <rect x="-300" y="-400" width="1400" height={crop === 'face' ? 920 : 1260} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <g className="pp-all">
            <g className="pp-body">
              <g {...raw(BODY)} />
              <OutfitDetail outfit={look.outfit} />
            </g>
            <g
              className="pp-head"
              style={{
                transform: `translate(0px, ${headY}px) rotate(${tilt}deg)`,
              }}
            >
              <g transform="matrix(.99789 0 0 1 156 62)" {...raw(HEADS[look.head])} />
              <g transform="translate(315 248)">
                <ellipse className={`pp-part pp-cheek ${happyish || joy ? 'on' : ''}`} cx="70" cy="176" rx="26" ry="15" />
                <ellipse className={`pp-part pp-cheek ${happyish || joy ? 'on' : ''}`} cx="232" cy="170" rx="20" ry="13" />
                <g className="pp-brows" style={{ transform: `translateY(${browLift}px)` }}>
                  <Part svg={FACE.browL.svg + FACE.browR.svg} on={brows === 'plain'} />
                  <Part svg={FACE.joyBrowL.svg + FACE.joyBrowR.svg} on={brows === 'joy'} />
                  <Part svg={FACE.worryBrowL.svg + FACE.worryBrowR.svg} on={brows === 'worry'} />
                  <Part svg={FACE.thinkBrowL.svg + FACE.thinkBrowR.svg} on={brows === 'think'} />
                </g>
                <g className="pp-eyes" style={{ transform: `translate(${lookX}px, ${lookY}px)` }}>
                  <g className={`pp-blink ${blink ? 'shut' : ''}`}>
                    <Part svg={FACE.eyeL.svg} on={eyes === 'open'} className="pp-eye-l" />
                    <Part svg={FACE.eyeR.svg} on={eyes === 'open'} className="pp-eye-r" />
                  </g>
                  <Part svg={FACE.happyEyeL.svg + FACE.happyEyeR.svg} on={eyes === 'happy'} />
                  <Part svg={FACE.joyEyeL.svg + FACE.joyEyeR.svg} on={eyes === 'joy'} />
                </g>
                <g {...raw(FACE.nose.svg)} />
                <Part svg={FACE.mouthRest.svg} on={!talking && rest === 'rest'} className="pp-mouth" />
                <Part svg={FACE.mouthSmile.svg} on={!talking && rest === 'smile'} className="pp-mouth" />
                <Part svg={FACE.mouthLaugh.svg} on={!talking && rest === 'laugh'} className="pp-mouth" />
                <Part svg={FACE.mouthHmm.svg} on={!talking && rest === 'hmm'} className="pp-mouth" />
                <Part svg={FACE.mouthO.svg} on={!talking && rest === 'o'} className="pp-mouth" />
                <TalkMouth open={mouth} round={round} on={talking} />
              </g>
              {look.glasses && <g transform="translate(203 303)" {...raw(GLASSES[look.glasses])} />}
            </g>
            <g className={`pp-arm ${m === 'wave' || joy ? 'up' : ''}`}>
              <Hand />
            </g>
          </g>
        </g>
        <Effects mood={m} />
      </svg>
    </div>
  );
}

function Effects({ mood }: { mood: Mood }): ReactNode {
  return (
    <>
      <g className={`pp-fx pp-q ${mood === 'confused' ? 'on' : ''}`}>
        <text x="610" y="150" fontSize="150" fontWeight="800" fill="#0164f9" fontFamily="Plus Jakarta Sans Variable, sans-serif">
          ?
        </text>
      </g>
      <g className={`pp-fx pp-dots ${mood === 'thinking' ? 'on' : ''}`} fill="#8a96b3">
        <circle cx="600" cy="120" r="16" />
        <circle cx="646" cy="90" r="16" />
        <circle cx="692" cy="60" r="16" />
      </g>
      <g className={`pp-fx pp-sparkle ${mood === 'happy' || mood === 'celebrate' ? 'on' : ''}`} fill="#fcc50e">
        <path d="M86 150 l14 34 34 14 -34 14 -14 34 -14 -34 -34 -14 34 -14 Z" />
        <path d="M640 80 l10 24 24 10 -24 10 -10 24 -10 -24 -24 -10 24 -10 Z" />
        {mood === 'celebrate' && <path d="M660 300 l8 18 18 8 -18 8 -8 18 -8 -18 -18 -8 18 -8 Z" fill="#19b6fc" />}
      </g>
    </>
  );
}
