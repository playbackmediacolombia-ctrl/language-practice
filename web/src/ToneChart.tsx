import { pinyin as toPinyin } from 'pinyin-pro';
import { type MouseEvent, type PointerEvent, useEffect, useState } from 'react';
import { audioContext } from './lib/audio';
import { type Contour, nativeContour, toneMatch } from './lib/pitch';

// Your pitch next to the native speaker's, for Mandarin tones. Both lines are in semitones
// around each speaker's own middle pitch and stretched over the same time, so only the
// shapes (the tones) are compared, not how high or deep the voices are.

const W = 320;
const H = 150;
const TOP = 10;
const BOTTOM = H - 26; // room for the syllables
const SYLLABLE_RE = /[\p{L}\u0300-\u036f]+/gu;

/** One label per character: the given pinyin if it's written syllable by syllable, else pinyin-pro's. */
function syllablesOf(text: string, pinyin = ''): string[] {
  const chars = text.match(/\p{Script=Han}/gu) ?? [];
  const given = pinyin.match(SYLLABLE_RE) ?? [];
  if (given.length === chars.length) return given;
  return chars.map((ch) => toPinyin(ch));
}

type Point = Contour['points'][number];

/** SVG path for a contour; unvoiced stretches longer than a few frames break the line. */
function path(points: Point[], y: (st: number) => number): string {
  let d = '';
  let gap = Infinity;
  points.forEach((p) => {
    if (!p) {
      gap++;
      return;
    }
    const x = (p.x * W).toFixed(1);
    d += `${gap > 3 || !d ? 'M' : 'L'}${x},${y(p.st).toFixed(1)}`;
    gap = 0;
  });
  return d;
}

/** Average of each syllable's slice of the line (an even split, so approximate). */
function perSyllable(points: Point[], n: number): (number | null)[] {
  return Array.from({ length: n }, (_, k) => {
    const v = points.filter((p): p is NonNullable<Point> => !!p && p.x >= k / n && p.x <= (k + 1) / n).map((p) => p.st);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  });
}

function nearest(points: Point[], x: number): number | null {
  let best: number | null = null;
  let dist = 0.07;
  for (const p of points) {
    if (p && Math.abs(p.x - x) < dist) {
      dist = Math.abs(p.x - x);
      best = p.st;
    }
  }
  return best;
}

const fmt = (st: number | null) => (st === null ? '—' : `${st > 0 ? '+' : ''}${st.toFixed(1)}`);

export function verdict(match: number): { label: string; tone: 'ok' | 'close' | 'wrong' } {
  if (match >= 0.8) return { label: 'Your tones follow the native speaker', tone: 'ok' };
  if (match >= 0.6) return { label: 'Close: compare where the lines part', tone: 'close' };
  return { label: 'Tones differ: listen again and copy the shape', tone: 'wrong' };
}

/**
 * `native` is the phrase's audio URL. `mine` is your contour after you speak: undefined before
 * you've tried, null if no pitch could be found in your recording.
 */
export function ToneChart({ native, mine, text, pinyin }: { native: string; mine?: Contour | null; text: string; pinyin?: string }) {
  const [ref, setRef] = useState<Contour | null | undefined>(undefined);
  const [scrub, setScrub] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    setRef(undefined);
    nativeContour(native, audioContext())
      .then((c) => live && setRef(c))
      .catch(() => live && setRef(null));
    return () => {
      live = false;
    };
  }, [native]);

  const syllables = syllablesOf(text, pinyin);
  const lines = [ref, mine].filter((c): c is Contour => !!c);
  const extent = Math.max(6, ...lines.flatMap((c) => c.points.map((p) => (p ? Math.abs(p.st) : 0)))) + 1;
  const y = (st: number) => TOP + ((extent - st) / (2 * extent)) * (BOTTOM - TOP);
  const match = ref && mine ? toneMatch(ref, mine) : null;
  const v = match === null ? null : verdict(match);

  // End labels sit just right of each line's last point, nudged apart if they'd overlap.
  const lastY = (c: Contour) => {
    for (let i = c.points.length - 1; i >= 0; i--) if (c.points[i]) return y(c.points[i]!.st);
    return null;
  };
  let nativeEnd = ref ? lastY(ref) : null;
  let mineEnd = mine ? lastY(mine) : null;
  if (nativeEnd !== null && mineEnd !== null && Math.abs(nativeEnd - mineEnd) < 13) {
    const mid = (nativeEnd + mineEnd) / 2;
    const up = nativeEnd <= mineEnd ? -1 : 1;
    nativeEnd = mid + up * 6.5;
    mineEnd = mid - up * 6.5;
  }

  // Hover (mouse), drag (finger) or tap moves the readout.
  const onPointer = (e: PointerEvent<SVGSVGElement> | MouseEvent<SVGSVGElement>) => {
    if (e.type === 'pointermove' && 'pointerType' in e && e.pointerType !== 'mouse' && e.buttons === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    setScrub(Math.max(0, Math.min(1, (e.clientX - box.left) / (box.width * (W / (W + 44))))));
  };
  const syllableAt = (x: number) => syllables[Math.min(syllables.length - 1, Math.floor(x * syllables.length))];
  const nat = ref ? perSyllable(ref.points, syllables.length) : [];
  const you = mine ? perSyllable(mine.points, syllables.length) : [];

  return (
    <div className="tone-chart" data-testid="tone-chart">
      <div className="tone-head">
        <span className="legend">
          <span className="swatch native" /> Native
        </span>
        <span className="legend">
          <span className="swatch mine" /> You
        </span>
        {match !== null && (
          <span className="tone-score" data-testid="tone-match">
            {Math.round(match * 100)}% match
          </span>
        )}
      </div>
      <div className="chart">
        <svg
          viewBox={`0 0 ${W + 44} ${H}`}
          role="img"
          aria-label={`Pitch of the native speaker${mine ? ' and you' : ''} for ${pinyin ?? 'this phrase'}`}
          onPointerDown={onPointer}
          onPointerMove={onPointer}
          onClick={onPointer}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setScrub(null)} // a tap's readout stays after lifting the finger
          style={{ touchAction: 'pan-y' }}
        >
          <line className="grid" x1={0} x2={W} y1={y(0)} y2={y(0)} />
          {syllables.map((s, i) => (
            <g key={i}>
              {i > 0 && <line className="grid faint" x1={(i / syllables.length) * W} x2={(i / syllables.length) * W} y1={TOP} y2={BOTTOM} />}
              <text x={((i + 0.5) / syllables.length) * W} y={H - 6} textAnchor="middle" className="syllable">
                {s}
              </text>
            </g>
          ))}
          {ref && <path className="tone-line native" d={path(ref.points, y)} />}
          {mine && <path className="tone-line mine" d={path(mine.points, y)} />}
          {nativeEnd !== null && (
            <text x={W + 6} y={nativeEnd + 4} className="end-label">
              Native
            </text>
          )}
          {mineEnd !== null && (
            <text x={W + 6} y={mineEnd + 4} className="end-label">
              You
            </text>
          )}
          {scrub !== null && <line className="crosshair" x1={scrub * W} x2={scrub * W} y1={TOP} y2={BOTTOM} />}
        </svg>
        {scrub !== null && ref && (
          <div className="chart-tip" style={{ left: `${Math.max(22, Math.min(78, (scrub * W * 100) / (W + 44)))}%`, top: 0 }}>
            {syllableAt(scrub) && <b>{syllableAt(scrub)} · </b>}
            Native {fmt(nearest(ref.points, scrub))}
            {mine && <> · You {fmt(nearest(mine.points, scrub))}</>} semitones
          </div>
        )}
        {ref === undefined && <p className="tone-note">Reading the native pitch…</p>}
        {ref === null && <p className="tone-note">Couldn't read the native pitch.</p>}
      </div>
      <p className={`tone-verdict ${v?.tone ?? ''}`}>
        {mine === null
          ? "Couldn't find your pitch. Say it a little louder, in a normal voice (not whispered)."
          : v
            ? v.label
            : mine === undefined
              ? 'Say it to see your pitch next to the native speaker’s.'
              : 'Too short to compare. Say the whole phrase.'}
      </p>
      {syllables.length > 0 && ref && (
        <table className="sr-only">
          <caption>Average pitch per syllable, in semitones from each speaker's middle pitch (approximate)</caption>
          <thead>
            <tr>
              <th>Syllable</th>
              <th>Native</th>
              {mine && <th>You</th>}
            </tr>
          </thead>
          <tbody>
            {syllables.map((s, i) => (
              <tr key={i}>
                <th>{s}</th>
                <td>{fmt(nat[i])}</td>
                {mine && <td>{fmt(you[i])}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
