import { useEffect, useRef, useState } from 'react';
import { PALETTE as P } from './art';

// The app's macaw, drawn in code in the logo's colors (an original drawing, no image files).
// Poses for the lesson path: it peeks over a ledge, hops, waves, reads, holds a globe or naps.
// In lessons it thinks of hints, cheers a right answer, says "oops" to a wrong one, dances
// when a lesson is done and shows off a streak. It plays its pose when it comes into view;
// with Reduce Motion it simply stands still in that pose.

/** `think`, `cheer`, `oops`, `dance` and `streak` are for lessons and celebrations, not the path. */
export type BirdPose = 'peek' | 'hop' | 'wave' | 'read' | 'globe' | 'nap' | 'think' | 'cheer' | 'oops' | 'dance' | 'streak';
export const BIRD_POSES: BirdPose[] = ['peek', 'hop', 'wave', 'read', 'globe', 'nap'];

function Head({ pose }: { pose: BirdPose }) {
  const down = pose === 'read';
  const up = pose === 'think';
  return (
    <g className="bird-head">
      <path d="M50 24 Q46 9 56 13 Q58 3 66 12 Q72 7 70 20 Z" fill={P.skyLight} />
      <circle cx="62" cy="42" r="22" fill={P.blue} />
      <ellipse cx="72" cy="43" rx="11" ry="12.5" fill={P.white} />
      <path d="M66 52 Q70 55 75 54" stroke="#d6dff0" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {pose === 'nap' ? (
        <path d="M67 42 Q72 46 77 42" stroke={P.navy} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      ) : happy(pose) ? (
        <path d="M67.5 42.5 Q72.5 35.5 77.5 42.5" stroke={P.navy} strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : pose === 'oops' ? (
        <g className="bird-eye">
          <circle cx="71.5" cy="44" r="4" fill={P.navy} />
          <circle cx="72.8" cy="42.6" r="1.4" fill={P.white} />
          <path d="M66 35 Q71 33 77 36" stroke={P.navy} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M86 28 q3 5 0 7 q-3 -2 0 -7 Z" fill={P.skyLight} />
        </g>
      ) : (
        <g className="bird-eye">
          <circle cx={up ? 74 : 72.5} cy={down ? 44 : up ? 38.5 : 41} r="4.4" fill={P.navy} />
          <circle cx={up ? 75.5 : 74} cy={down ? 42.6 : up ? 37 : 39.5} r="1.5" fill={P.white} />
        </g>
      )}
      <path d="M81 34 Q97 33 97 50 Q97 58 90 61 Q92 50 82 48 Z" fill={P.navy} />
      <path d="M82 48 Q89 50 89 56 Q85 60 80 55 Z" fill={P.slate} />
    </g>
  );
}

const happy = (pose: BirdPose) => pose === 'cheer' || pose === 'dance' || pose === 'streak';

/** The far wing, raised behind the body (cheering with both wings). */
function FarWing() {
  return (
    <g className="bird-wing far">
      <path d="M66 62 Q82 44 96 42 Q94 56 74 74 Z" fill={P.deep} opacity="0.85" />
      <path d="M96 42 Q99 48 93 52 L88 48 Z" fill={P.skyLight} />
    </g>
  );
}

function Body() {
  return (
    <>
      <path d="M44 86 Q32 104 22 116 Q40 108 53 92 Z" fill={P.skyLight} />
      <path d="M51 90 Q45 106 41 118 Q55 106 59 92 Z" fill={P.deep} />
      <ellipse cx="58" cy="77" rx="24" ry="27" fill={P.blue} />
      <ellipse cx="66" cy="82" rx="14" ry="19" fill={P.sun} />
      <path d="M53 102 l-3 7 M61 103 l2 7" stroke={P.slate} strokeWidth="3.4" strokeLinecap="round" />
    </>
  );
}

/** The near wing: folded at the side, or raised (waving). */
function Wing({ up }: { up?: boolean }) {
  return up ? (
    <g className="bird-wing up">
      <path d="M48 66 Q34 50 22 44 Q22 58 42 76 Z" fill={P.deep} />
      <path d="M22 44 Q20 50 25 54 L31 50 Z" fill={P.skyLight} />
    </g>
  ) : (
    <g className="bird-wing">
      <path d="M48 62 Q30 70 34 98 Q47 93 55 78 Z" fill={P.deep} />
      <path d="M34 98 Q35 88 40 84 L44 90 Z" fill={P.skyLight} />
    </g>
  );
}

function Prop({ pose }: { pose: BirdPose }) {
  if (pose === 'read')
    return (
      <g className="bird-book">
        <path d="M50 74 L66 78 L82 74 L82 96 L66 100 L50 96 Z" fill={P.red} />
        <path d="M52 75 L66 79 L66 97 L52 93 Z" fill={P.white} />
        <path d="M80 75 L66 79 L66 97 L80 93 Z" fill="#f3f6fc" />
        <path d="M55 81 L63 83 M55 85 L63 87 M69 83 L77 81 M69 87 L77 85" stroke="#b9c6de" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    );
  if (pose === 'globe')
    return (
      <g className="bird-globe">
        <circle cx="72" cy="86" r="14" fill={P.sky} />
        <g className="bird-globe-land">
          <path d="M62 80 Q66 74 72 77 Q70 83 74 86 Q68 90 63 87 Z M76 90 Q82 86 84 92 Q80 98 75 96 Z" fill={P.sun} />
        </g>
        <ellipse cx="72" cy="86" rx="6" ry="14" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" />
        <circle cx="72" cy="86" r="14" fill="none" stroke={P.deep} strokeWidth="2" />
      </g>
    );
  if (pose === 'streak')
    return (
      <g className="bird-flame">
        <path d="M100 30 C92 22 98 12 94 4 C104 10 110 20 106 30 C104 34 100 34 100 30 Z" fill={P.orange} />
        <path d="M100 30 C97 25 101 20 99 15 C105 19 106 25 103 30 Z" fill={P.sun} />
      </g>
    );
  if (pose === 'dance')
    return (
      <g className="bird-notes" fill={P.sky}>
        <path d="M98 14 v16 a4 3 0 1 1 -2 -2.6 V16 l10 -3 v3 Z" />
        <path d="M14 30 v12 a3.5 2.6 0 1 1 -2 -2.2 V30 Z" />
      </g>
    );
  if (pose === 'nap')
    return (
      <g className="bird-zz" fill={P.slate} fontWeight="800" fontFamily="inherit">
        <text x="88" y="24" fontSize="13">z</text>
        <text x="98" y="12" fontSize="10">z</text>
      </g>
    );
  return null;
}

export function Bird({ pose, size = 72, className = '' }: { pose: BirdPose; size?: number; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    // Plays its pose each time it comes into view, and rests while it's off screen.
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <svg
      ref={ref}
      className={`bird pose-${pose}${seen ? ' seen' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      data-pose={pose}
    >
      {pose === 'peek' ? (
        <>
          <defs>
            <clipPath id="bird-peek-clip">
              <rect x="0" y="0" width="120" height="70" />
            </clipPath>
          </defs>
          <g clipPath="url(#bird-peek-clip)">
            <g className="bird-all">
              <Body />
              <Wing />
              <Head pose={pose} />
            </g>
          </g>
          <rect className="bird-ledge" x="14" y="66" width="96" height="14" rx="7" />
          <path d="M44 66 q-4 6 0 10 M80 66 q4 6 0 10" stroke={P.slate} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <g className="bird-all">
          {happy(pose) && <FarWing />}
          <Body />
          {pose !== 'read' && pose !== 'globe' && <Wing up={pose === 'wave' || happy(pose)} />}
          <Head pose={pose} />
          <Prop pose={pose} />
          {(pose === 'read' || pose === 'globe') && <Wing />}
        </g>
      )}
    </svg>
  );
}
