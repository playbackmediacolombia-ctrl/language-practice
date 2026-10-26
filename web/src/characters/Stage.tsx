import { useEffect } from 'react';
import { Character, type Mood, roleFor } from './Character';
import { prepareLipSync, useMouth } from './lipsync';

/**
 * The role-play stage: the person you're talking to, pinned above the conversation. Their mouth
 * follows `speaking` (the clip playing now); `mood` is how they react to your last answer.
 */
export function CharacterStage({ them, topic, speaking, mood, clips }: { them: string; topic: string; speaking: string | null; mood: Mood; clips: string[] }) {
  useEffect(() => clips.forEach(prepareLipSync), [clips]);
  const mouth = useMouth(speaking);
  const state = speaking ? 'talking' : mood === 'happy' ? 'smiling' : mood === 'confused' ? 'puzzled' : 'listening';
  return (
    <div className="char-stage" data-testid="char-stage">
      <Character role={roleFor(them, topic)} mood={speaking ? 'idle' : mood} mouth={mouth} label={`${them}, ${state}`} />
      <div className="char-name">{them}</div>
    </div>
  );
}
