import phrases from '../../../shared/feedback.json';
import type { Lang } from './content';

// Varied praise and encouragement for lessons, mostly in the language being learned with a
// little English. Most right answers only chime; the voice comes now and then, for streaks,
// for mistakes (gently) and at the end of a lesson.

export type Category = 'praise' | 'streak' | 'complete' | 'perfect' | 'wrong';
type Voice = Lang | 'en';
export type Line = { text: string; en: string; voice: Voice; url: string };

const files = import.meta.glob<string>('../../../assets/audio/feedback/*/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

const ENGLISH_SHARE = 0.15;
/** Chance of speaking praise on an ordinary right answer… */
const PRAISE_CHANCE = 0.25;
/** …and never for two right answers in a row. */
const MIN_QUIET_ANSWERS = 2;

const lines = (voice: Voice, category: Category): Line[] =>
  phrases[voice][category].map((p, i) => ({ ...p, voice, url: files[`../../../assets/audio/feedback/${voice}/${category}-${i}.mp3`] }));

// The last line shown, and the last of each kind: most right answers are silent, so the
// streak line you last *heard* may be several answers back.
let last: string | null = null;
const lastOf = new Map<Category, string>();

/** A random line, never the same as the one before or the last of its kind. */
export function pickLine(lang: Lang, category: Category): Line {
  const fresh = (voice: Voice) => lines(voice, category).filter((l) => l.url !== last && l.url !== lastOf.get(category));
  let pool = Math.random() < ENGLISH_SHARE ? fresh('en') : [];
  if (!pool.length) pool = fresh(lang);
  const line = pool[Math.floor(Math.random() * pool.length)];
  last = line.url;
  lastOf.set(category, line.url);
  return line;
}

/** Every clip a lesson in `lang` might play, to preload them while the lesson starts. */
export function allClips(lang: Lang): string[] {
  const categories: Category[] = ['praise', 'streak', 'complete', 'perfect', 'wrong'];
  return (['en', lang] as const).flatMap((voice) => categories.flatMap((c) => lines(voice, c).map((l) => l.url)));
}

/** 3, 5, 10, 15, 20… right in a row. */
export const isStreakMilestone = (n: number) => n === 3 || n === 5 || (n >= 10 && n % 5 === 0);

export type Reaction = { line: Line; speak: boolean; streak: number | null };

/** Tracks one lesson's answers and decides what to show and say for each. */
export class Coach {
  private inARow = 0;
  private quiet = MIN_QUIET_ANSWERS; // answers since the voice last spoke

  constructor(private lang: Lang) {}

  right(): Reaction {
    this.inARow++;
    if (isStreakMilestone(this.inARow)) return this.say(pickLine(this.lang, 'streak'), this.inARow);
    const line = pickLine(this.lang, 'praise');
    if (this.quiet >= MIN_QUIET_ANSWERS && Math.random() < PRAISE_CHANCE) return this.say(line, null);
    this.quiet++;
    return { line, speak: false, streak: null };
  }

  wrong(): Reaction {
    this.inARow = 0;
    return this.say(pickLine(this.lang, 'wrong'), null);
  }

  finished(perfect: boolean): Line {
    return pickLine(this.lang, perfect ? 'perfect' : 'complete');
  }

  private say(line: Line, streak: number | null): Reaction {
    this.quiet = 0;
    return { line, speak: true, streak };
  }
}
