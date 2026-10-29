import { useEffect, useRef, useState } from 'react';
import { Ink, PALETTE as P } from './art';
import { BIRD } from './ink.gen';

// The app's macaw: an in-app version of the logo's bird (its shape, colors and cheerful open beak),
// hand-drawn in the same ink line as the Open Peeps characters (scripts/ink-art.mjs, inked into
// ink.gen.ts). The logo itself stays the app icon and splash screen.
// Poses for the lesson path: it peeks over a ledge, hops, waves, reads, holds a globe or naps.
// In lessons it thinks of hints, cheers a right answer, says "oops" to a wrong one, dances
// when a lesson is done and shows off a streak. It plays its pose when it comes into view;
// with Reduce Motion it simply stands still in that pose.

/** `think`, `cheer`, `oops`, `dance` and `streak` are for lessons and celebrations, not the path. */
export type BirdPose = 'peek' | 'hop' | 'wave' | 'read' | 'globe' | 'nap' | 'think' | 'cheer' | 'oops' | 'dance' | 'streak';
export const BIRD_POSES: BirdPose[] = ['peek', 'hop', 'wave', 'read', 'globe', 'nap'];

const happy = (pose: BirdPose) => pose === 'cheer' || pose === 'dance' || pose === 'streak';

function Head({ pose }: { pose: BirdPose }) {
  const look = pose === 'read' ? 'translate(-1 3)' : pose === 'think' ? 'translate(1.5 -2.5)' : undefined;
  return (
    <g className="bird-head">
      <g className="bird-look">
        <Ink layers={BIRD.crest} />
        <Ink layers={BIRD.head} />
        <Ink layers={BIRD.forehead} />
        <Ink layers={BIRD.throat} />
        <Ink layers={BIRD.face} />
        <Ink layers={BIRD.faceLines} />
        {pose === 'nap' ? (
          <Ink layers={BIRD.eyeNap} />
        ) : happy(pose) ? (
          <Ink layers={BIRD.eyeHappy} />
        ) : (
          <g className="bird-eye" transform={look}>
            <Ink layers={BIRD.eyeOpen} />
          </g>
        )}
        {!happy(pose) && pose !== 'nap' && (
          <g transform={pose === 'oops' ? 'translate(0 -2.5) rotate(-6 72 33)' : pose === 'think' ? 'translate(0 -1.5)' : undefined}>
            <Ink layers={BIRD.brow} />
          </g>
        )}
        {pose === 'oops' && <Ink layers={BIRD.sweat} />}
        <Ink layers={BIRD.jaw} />
        {pose !== 'nap' && <Ink layers={BIRD.tongue} />}
        <Ink layers={BIRD.beak} />
      </g>
    </g>
  );
}

/** The far wing, raised behind the body (cheering with both wings). */
function FarWing() {
  return (
    <g className="bird-wing far">
      <Ink layers={BIRD.farWing} />
    </g>
  );
}

function Body() {
  return (
    <g className="bird-body">
      <Ink layers={BIRD.tail} />
      <Ink layers={BIRD.feet} />
      <Ink layers={BIRD.body} />
      <Ink layers={BIRD.belly} />
    </g>
  );
}

/** The near wing: folded at the side, or raised (waving). */
function Wing({ up }: { up?: boolean }) {
  return (
    <g className={up ? 'bird-wing up' : 'bird-wing'}>
      <Ink layers={up ? BIRD.wingUp : BIRD.wing} />
    </g>
  );
}

function Prop({ pose }: { pose: BirdPose }) {
  if (pose === 'read')
    return (
      <g className="bird-book">
        <Ink layers={BIRD.book} />
      </g>
    );
  if (pose === 'globe')
    return (
      <g className="bird-globe">
        <Ink layers={BIRD.globe} />
        <g className="bird-globe-land">
          <Ink layers={BIRD.globeLand} />
        </g>
        <Ink layers={BIRD.globeInk} />
      </g>
    );
  if (pose === 'streak')
    return (
      <g className="bird-flame">
        <Ink layers={BIRD.flame} />
      </g>
    );
  if (pose === 'dance')
    return (
      <g className="bird-notes">
        <g>
          <Ink layers={BIRD.note1} />
        </g>
        <g>
          <Ink layers={BIRD.note2} />
        </g>
      </g>
    );
  if (pose === 'cheer')
    return (
      <g className="bird-talk">
        <Ink layers={BIRD.talk} />
      </g>
    );
  if (pose === 'nap')
    return (
      <g className="bird-zz" fill={P.slate} fontWeight="800" fontFamily="inherit">
        <text x="92" y="24" fontSize="13">z</text>
        <text x="102" y="12" fontSize="10">z</text>
      </g>
    );
  return null;
}

const still = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Natural blinks at random intervals (sometimes a double blink) and a small glance now and then. */
function useAlive(on: boolean) {
  const [blink, setBlink] = useState(false);
  const [glance, setGlance] = useState(0);
  useEffect(() => {
    if (!on || still()) return;
    let t: ReturnType<typeof setTimeout>;
    const shut = (then: () => void) => {
      setBlink(true);
      t = setTimeout(() => {
        setBlink(false);
        then();
      }, 110);
    };
    const next = () => (t = setTimeout(() => shut(() => (Math.random() < 0.25 ? (t = setTimeout(() => shut(next), 150)) : next())), 2000 + Math.random() * 3500));
    next();
    const g = setInterval(() => setGlance(Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1), 3100);
    return () => {
      clearTimeout(t);
      clearInterval(g);
    };
  }, [on]);
  return { blink, glance };
}

function Art({ pose }: { pose: BirdPose }) {
  return pose === 'peek' ? (
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
      <Ink layers={BIRD.ledge} />
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
  );
}

export function Bird({ pose, size = 72, className = '' }: { pose: BirdPose; size?: number; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [seen, setSeen] = useState(false);
  // A change of pose cross-fades: the old one fades out while the new one comes in.
  const [shown, setShown] = useState({ pose, prev: null as BirdPose | null });
  useEffect(() => {
    if (pose === shown.pose) return;
    setShown({ pose, prev: shown.pose });
    const t = setTimeout(() => setShown({ pose, prev: null }), 280);
    return () => clearTimeout(t);
  }, [pose, shown.pose]);
  const { blink, glance } = useAlive(seen);
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
      className={`bird pose-${pose}${seen ? ' seen' : ''}${blink ? ' blink' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      data-pose={pose}
      style={{ ['--glance' as string]: glance }}
    >
      {shown.prev && (
        <g className="bird-layer out" key={`out-${shown.prev}`}>
          <Art pose={shown.prev} />
        </g>
      )}
      <g className={`bird-layer${shown.prev ? ' in' : ''}`} key={`in-${pose}`}>
        <Art pose={pose} />
      </g>
    </svg>
  );
}
