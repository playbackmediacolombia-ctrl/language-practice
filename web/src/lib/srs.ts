// Spaced repetition, the SM-2 way (the algorithm behind Anki and SuperMemo): every word and
// phrase gets a review day. Getting it right on that day stretches the gap (1 day, 3 days,
// then about 2.5× each time), so it comes back just before you'd be likely to forget it.
// Missing it brings it back tomorrow and makes its gaps grow a little more slowly from then on.
// Days are local calendar days, so "due today" flips over at midnight, like the streak.

export type Card = {
  /** Day number it's next due. */
  due: number;
  /** Current gap in days. */
  ivl: number;
  /** How fast the gap grows (SM-2's "easiness factor", 1.3 to 2.5). */
  ease: number;
  /** Right answers on review days in a row. */
  reps: number;
  /** Times it was forgotten. */
  lapses: number;
  /** Day it was last answered. */
  day: number;
  /** Missed on `day`, so further misses that day don't count twice. */
  miss: boolean;
};

const DAY = 24 * 3600 * 1000;
const START_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_IVL = 365;

/** Local calendar day as a whole number (days since 1970-01-01), immune to DST shifts. */
export function dayNumber(d = new Date()): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
}

/** Spreads gaps of 3+ days by up to ±5% (the same way for the same word) so reviews don't bunch up. */
function fuzz(key: string, ivl: number): number {
  if (ivl < 3) return ivl;
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.max(1, Math.round(ivl * (1 + ((Math.abs(h) % 1001) / 1000 - 0.5) * 0.1)));
}

/**
 * The card after one answer. `soft` misses (Whisper mishearing, a word seen for the first time)
 * never push a card back. Only the first answer on a due day moves the schedule; answering
 * early (in a lesson) doesn't stretch it, but a miss always counts.
 */
export function grade(key: string, card: Card | undefined, right: boolean, today: number, soft = false): Card {
  if (!card) {
    return { due: today + 1, ivl: 1, ease: START_EASE, reps: right ? 1 : 0, lapses: 0, day: today, miss: !right && !soft };
  }
  if (!right) {
    if (soft || (card.day === today && card.miss)) return { ...card, day: today };
    return { ...card, due: today + 1, ivl: 1, reps: 0, lapses: card.lapses + 1, ease: Math.max(MIN_EASE, card.ease - 0.2), day: today, miss: true };
  }
  // Right, but not due yet (or already reviewed today): no change to the schedule.
  if (today < card.due) return { ...card, day: today };
  const reps = card.reps + 1;
  const late = today - card.due; // remembered even though it was overdue: it's stronger than planned
  const ivl = reps === 1 ? 1 : reps === 2 ? 3 : Math.min(MAX_IVL, fuzz(key, Math.round((card.ivl + late / 2) * card.ease)));
  return { ...card, due: today + ivl, ivl, reps, day: today, miss: false };
}

/** Strength (0 to 5) or Leitner box (0 to 4) from before spaced repetition, as a card. */
export function fromOld(level: number, lastDay: number, today: number): Card {
  const ivl = [1, 1, 3, 6, 12, 25][Math.max(0, Math.min(5, level))];
  return { due: Math.max(today, lastDay + ivl), ivl, ease: START_EASE, reps: Math.min(level, 3), lapses: 0, day: lastDay, miss: false };
}

/** Keys of `cards` (filtered by `prefix`) due on or before `today`, most overdue first. */
export function dueKeys(cards: Record<string, Card>, prefix: string, today: number): string[] {
  return Object.keys(cards)
    .filter((k) => k.startsWith(prefix) && cards[k].due <= today)
    .sort((a, b) => cards[a].due - cards[b].due || cards[a].ease - cards[b].ease);
}

/** How many cards come due on each of the next `days` days (index 0 = tomorrow). */
export function forecast(cards: Record<string, Card>, prefix: string, today: number, days: number): number[] {
  const out = new Array<number>(days).fill(0);
  for (const k in cards) {
    const i = cards[k].due - today - 1;
    if (k.startsWith(prefix) && i >= 0 && i < days) out[i]++;
  }
  return out;
}
