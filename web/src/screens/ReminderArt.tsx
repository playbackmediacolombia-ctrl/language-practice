import type { ReactNode } from 'react';

// Drawn "screenshots" for the daily reminder guide: a simple phone screen per step with the
// thing to tap highlighted. Original drawings of the Shortcuts layout, not Apple's artwork.

const INK = 'var(--text)';
const SOFT = 'var(--card-2)';
const LINE = 'var(--border)';
const HI = '#0164f9';

function Phone({ title, children, label }: { title: string; children: ReactNode; label: string }) {
  return (
    <figure className="guide-shot" aria-label={label}>
      <svg viewBox="0 0 180 230" width="180" height="230" role="img" aria-label={label}>
        <rect x="4" y="4" width="172" height="222" rx="26" strokeWidth="3" style={{ fill: 'var(--card)', stroke: LINE }} />
        <rect x="68" y="12" width="44" height="9" rx="4.5" opacity="0.85" style={{ fill: INK }} />
        <text x="18" y="46" fontSize="13" fontWeight="800" fontFamily="var(--font)" style={{ fill: INK }}>
          {title}
        </text>
        {children}
      </svg>
    </figure>
  );
}

/** A tappable row, optionally highlighted with a pulsing ring. */
function Row({ y, text, hi, right }: { y: number; text: string; hi?: boolean; right?: string }) {
  return (
    <g>
      <rect x="16" y={y} width="148" height="26" rx="8" strokeWidth="2" style={{ fill: hi ? 'color-mix(in srgb, #0164f9 14%, var(--card))' : SOFT, stroke: hi ? HI : 'none' }} />
      <text x="26" y={y + 17} fontSize="10.5" fontWeight="700" fontFamily="var(--font)" style={{ fill: hi ? HI : INK }}>
        {text}
      </text>
      {right && (
        <text x="154" y={y + 17} fontSize="10" fontWeight="700" textAnchor="end" fontFamily="var(--font)" style={{ fill: hi ? HI : 'var(--muted)' }}>
          {right}
        </text>
      )}
      {hi && <rect className="guide-ring" x="13" y={y - 3} width="154" height="32" rx="10" fill="none" strokeWidth="2" style={{ stroke: HI }} />}
    </g>
  );
}

function TabBar({ active }: { active: number }) {
  const names = ['Shortcuts', 'Automation', 'Gallery'];
  return (
    <g>
      <path d="M8 196 H172" strokeWidth="2" style={{ stroke: LINE }} />
      {names.map((n, i) => (
        <g key={n}>
          <circle cx={40 + i * 50} cy="207" r="5" style={{ fill: i === active ? HI : 'var(--faint)' }} />
          <text x={40 + i * 50} y="221" fontSize="8.5" fontWeight="700" textAnchor="middle" fontFamily="var(--font)" style={{ fill: i === active ? HI : 'var(--faint)' }}>
            {n}
          </text>
          {i === active && <circle className="guide-ring" cx={40 + i * 50} cy="210" r="15" fill="none" strokeWidth="2" style={{ stroke: HI }} />}
        </g>
      ))}
    </g>
  );
}

export const GUIDE_SHOTS: Record<string, () => ReactNode> = {
  open: () => (
    <Phone title="Shortcuts" label="The Shortcuts app with the Automation tab at the bottom highlighted">
      <Row y={60} text="My shortcut" />
      <Row y={92} text="Another shortcut" />
      <TabBar active={1} />
    </Phone>
  ),
  new: () => (
    <Phone title="New Automation" label="The new automation list with Time of Day highlighted">
      <text x="160" y="46" fontSize="18" fontWeight="800" textAnchor="end" style={{ fill: HI }}>
        +
      </text>
      <circle className="guide-ring" cx="155" cy="40" r="11" fill="none" strokeWidth="2" style={{ stroke: HI }} />
      <Row y={60} text="Time of Day" hi />
      <Row y={92} text="Alarm" />
      <Row y={124} text="Sleep" />
      <Row y={156} text="Arrive" />
    </Phone>
  ),
  time: () => (
    <Phone title="Time of Day" label="Time of Day settings: a time, Repeat Daily and Run Immediately highlighted">
      <text x="90" y="86" fontSize="30" fontWeight="800" textAnchor="middle" fontFamily="var(--font)" style={{ fill: INK }}>
        18:30
      </text>
      <Row y={104} text="Repeat" right="Daily" hi />
      <Row y={138} text="Run Immediately" hi />
      <Row y={172} text="Next" right="›" />
    </Phone>
  ),
  notify: () => (
    <Phone title="New Blank Automation" label="An action called Show Notification with the reminder text">
      <Row y={60} text="Add Action" />
      <rect x="16" y="98" width="148" height="70" rx="10" stroke="#d49f00" strokeWidth="2" style={{ fill: 'color-mix(in srgb, #fcc50e 18%, var(--card))' }} />
      <text x="26" y="118" fontSize="10.5" fontWeight="800" fontFamily="var(--font)" style={{ fill: INK }}>
        Show Notification
      </text>
      <text x="26" y="138" fontSize="9.5" fontWeight="600" fontFamily="var(--font)" style={{ fill: 'var(--muted)' }}>
        Time to practice! Keep your
      </text>
      <text x="26" y="152" fontSize="9.5" fontWeight="600" fontFamily="var(--font)" style={{ fill: 'var(--muted)' }}>
        Learnguage streak going.
      </text>
      <rect className="guide-ring" x="13" y="95" width="154" height="76" rx="12" fill="none" strokeWidth="2" style={{ stroke: HI }} />
    </Phone>
  ),
  url: () => (
    <Phone title="New Blank Automation" label="A second action, Open URLs, with the app's address">
      <rect x="16" y="60" width="148" height="34" rx="10" style={{ fill: SOFT }} />
      <text x="26" y="81" fontSize="10.5" fontWeight="800" fontFamily="var(--font)" style={{ fill: INK }}>
        Show Notification
      </text>
      <rect x="16" y="104" width="148" height="44" rx="10" strokeWidth="2" style={{ fill: 'color-mix(in srgb, #0164f9 12%, var(--card))', stroke: HI }} />
      <text x="26" y="122" fontSize="10.5" fontWeight="800" fontFamily="var(--font)" style={{ fill: HI }}>
        Open URLs
      </text>
      <text x="26" y="138" fontSize="9.5" fontWeight="600" fontFamily="var(--font)" style={{ fill: 'var(--muted)' }}>
        https://learnguage.net/
      </text>
      <rect className="guide-ring" x="13" y="101" width="154" height="50" rx="12" fill="none" strokeWidth="2" style={{ stroke: HI }} />
    </Phone>
  ),
  done: () => (
    <Phone title="Automation" label="The finished automation, with Done highlighted and a play button to test it">
      <text x="160" y="46" fontSize="12" fontWeight="800" textAnchor="end" fontFamily="var(--font)" style={{ fill: HI }}>
        Done
      </text>
      <circle className="guide-ring" cx="147" cy="42" r="15" fill="none" strokeWidth="2" style={{ stroke: HI }} />
      <Row y={60} text="At 18:30, daily" right="On" />
      <rect x="16" y="98" width="148" height="56" rx="12" style={{ fill: 'color-mix(in srgb, #fcc50e 18%, var(--card))' }} />
      <text x="26" y="118" fontSize="9" fontWeight="800" fontFamily="var(--font)" style={{ fill: 'var(--muted)' }}>
        LEARNGUAGE · NOW
      </text>
      <text x="26" y="136" fontSize="10" fontWeight="700" fontFamily="var(--font)" style={{ fill: INK }}>
        Time to practice!
      </text>
      <circle cx="90" cy="180" r="13" style={{ fill: HI }} />
      <path d="M86 173 L97 180 L86 187 Z" fill="#fff" />
    </Phone>
  ),
};
