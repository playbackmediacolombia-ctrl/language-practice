import { useEffect, useState } from 'react';
import { Character, type Mood, type Role, roleFor } from './Character';
import { prepareLipSync, useMouth } from './lipsync';

const STATE: Record<Mood, string> = { idle: 'listening', happy: 'smiling', confused: 'puzzled', thinking: 'thinking', wave: 'waving hello', celebrate: 'celebrating' };

/**
 * The stage: the person you're talking to, pinned above the conversation. They wave hello when
 * you arrive; their mouth follows `speaking` (the clip playing now, or "device" for the phone's
 * voice); `mood` is how they react to your last answer.
 */
export function CharacterStage({ them, topic, speaking, mood, clips, role }: { them: string; topic: string; speaking: string | null; mood: Mood; clips: string[]; role?: Role }) {
  useEffect(() => clips.forEach(prepareLipSync), [clips]);
  const { open, round } = useMouth(speaking);
  const [greeting, setGreeting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setGreeting(false), 2600);
    return () => clearTimeout(t);
  }, []);
  // Once they start talking the hello is over (the hand doesn't bob between words).
  useEffect(() => {
    if (speaking) setGreeting(false);
  }, [speaking]);
  const shown: Mood = greeting && mood === 'idle' ? 'wave' : mood;
  const state = speaking ? 'talking' : STATE[shown];
  return (
    <div className="char-stage" data-testid="char-stage">
      <Character role={role ?? roleFor(them, topic)} mood={shown} mouth={open} round={round} speaking={!!speaking} label={`${them}, ${state}`} />
      <div className="char-name">{them}</div>
    </div>
  );
}
