import { useEffect, useState } from 'react';
import { Bird, type BirdPose } from '../Bird';
import { Character, type Mood, type Role } from './Character';

// Test mode only (#/gallery?test): every character in every mood, the bird in every pose, and
// a mouth that talks on its own, for screenshots and recordings.

const ROLES: Role[] = ['friend', 'waiter', 'doctor', 'shopkeeper', 'clerk', 'teacher', 'receptionist', 'interviewer', 'agent', 'parent', 'date', 'driver', 'caller', 'coworker', 'classmate', 'local', 'guest', 'rival', 'manager', 'barista'];
const MOODS: Mood[] = ['idle', 'wave', 'happy', 'confused', 'thinking', 'celebrate'];
const POSES: BirdPose[] = ['peek', 'hop', 'wave', 'read', 'globe', 'nap', 'think', 'cheer', 'oops', 'dance', 'streak'];

export default function Gallery() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let f = 0;
    const tick = () => {
      setT(performance.now() / 1000);
      f = requestAnimationFrame(tick);
    };
    f = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(f);
  }, []);
  // A made-up sentence: syllables at about 5 a second, with pauses between words.
  const syl = (t * 5) % 1;
  const word = Math.floor(t * 1.3) % 4 === 3 ? 0 : 1;
  const open = word * Math.max(0, Math.sin(syl * Math.PI)) * (0.55 + 0.45 * Math.sin(t * 2.3) ** 2);
  const round = (Math.sin(t * 1.7) + 1) / 2;
  // The demo: one character through a little scene, and the bird changing pose.
  const SCENE: [Mood, boolean][] = [['wave', false], ['idle', true], ['thinking', false], ['idle', true], ['confused', false], ['happy', false], ['celebrate', false]];
  const [beat, talks] = SCENE[Math.floor(t / 2.6) % SCENE.length];
  const pose = POSES[Math.floor(t / 1.6) % POSES.length];
  return (
    <main className="page" data-testid="gallery">
      <h1>Characters</h1>
      <section className="char-stage" data-testid="gallery-demo" style={{ position: 'static' }}>
        <Character role="waiter" mood={beat} mouth={talks ? open : 0} round={round} label={`waiter ${beat}`} size={220} />
        <div className="char-name">{talks ? 'talking' : beat}</div>
        <Bird pose={pose} size={110} />
        <div className="char-name">bird: {pose}</div>
      </section>
      <section className="gallery-row" data-testid="gallery-talk">
        {(['friend', 'waiter', 'doctor'] as Role[]).map((r) => (
          <Character key={r} role={r} mood="idle" mouth={open} round={round} label={`${r} talking`} size={150} />
        ))}
      </section>
      {MOODS.map((m) => (
        <section key={m} className="gallery-row" data-testid={`gallery-${m}`}>
          <h2>{m}</h2>
          {ROLES.map((r) => (
            <Character key={r} role={r} mood={m} mouth={0} label={`${r} ${m}`} size={110} />
          ))}
        </section>
      ))}
      <section className="gallery-row" data-testid="gallery-birds">
        <h2>bird</h2>
        {POSES.map((p) => (
          <Bird key={p} pose={p} size={96} />
        ))}
      </section>
    </main>
  );
}
