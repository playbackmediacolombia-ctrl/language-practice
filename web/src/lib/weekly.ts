import { dateKey, type Progress } from './progress';

// Weekly challenge: beat your own last week. Weeks run Monday to Sunday (local time). The goal is
// last week's XP plus about 10% (rounded up to 10), at least 50, all worked out from the XP
// already saved per day, so nothing new is stored and past weeks have a history for free.

export const MIN_WEEK_GOAL = 50;

/** Monday 00:00 of the week `d` is in. */
export function weekStart(d = new Date()): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function weekXp(p: Progress, start: Date): number {
  let xp = 0;
  for (let i = 0; i < 7; i++) xp += p.days[dateKey(addDays(start, i))] ?? 0;
  return xp;
}

/** The goal for a week: beat the week before it. */
export const goalAfter = (lastWeek: number) => Math.max(MIN_WEEK_GOAL, Math.ceil((lastWeek * 1.1 + 1) / 10) * 10);

export type Week = { start: Date; xp: number; goal: number; won: boolean };

export function week(p: Progress, start: Date): Week {
  const xp = weekXp(p, start);
  const goal = goalAfter(weekXp(p, addDays(start, -7)));
  return { start, xp, goal, won: xp >= goal };
}

/** This week so far, and how many days are left (today included). */
export function thisWeek(p: Progress, now = new Date()): Week & { daysLeft: number; lastWeek: number } {
  const start = weekStart(now);
  const w = week(p, start);
  const today = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - start.getTime()) / 86400000);
  return { ...w, daysLeft: 7 - today, lastWeek: weekXp(p, addDays(start, -7)) };
}

/** Past weeks, most recent first, back to the first week with any XP (up to `max`). */
export function pastWeeks(p: Progress, max = 12, now = new Date()): Week[] {
  const first = Object.keys(p.days).filter((k) => p.days[k] > 0).sort()[0];
  if (!first) return [];
  const [y, m, d] = first.split('-').map(Number);
  const earliest = weekStart(new Date(y, m - 1, d));
  const out: Week[] = [];
  for (let s = addDays(weekStart(now), -7); s >= earliest && out.length < max; s = addDays(s, -7)) out.push(week(p, s));
  return out;
}

export const weekLabel = (start: Date) => start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
