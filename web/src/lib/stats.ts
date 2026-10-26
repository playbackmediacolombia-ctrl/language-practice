import { LANGS, type Lang } from './content';
import { trackedCards } from './course';
import { dateKey, type Progress } from './progress';

// Numbers for the Progress tab, for one language or all of them ('all'), worked out from the
// per-day log (answers right / given, seconds practiced) and the spaced-repetition cards.

export type Scope = Lang | 'all';
export type DayLog = { r: number; n: number; s: number };

const langsOf = (scope: Scope): Lang[] => (scope === 'all' ? LANGS.map((l) => l.id) : [scope]);

/** Noon on each of the last `n` days, oldest first (noon so DST never skips a day). */
export function lastDays(n: number, from = new Date()): Date[] {
  const today = new Date(from);
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i));
    return d;
  });
}

export function dayLog(p: Progress, scope: Scope, key: string): DayLog {
  const out = { r: 0, n: 0, s: 0 };
  for (const lang of langsOf(scope)) {
    const d = p.log[key]?.[lang];
    if (d) {
      out.r += d.r;
      out.n += d.n;
      out.s += d.s;
    }
  }
  return out;
}

/** Days with any practice: for all languages also any day with XP (from before the log existed). */
export function practicedOn(p: Progress, scope: Scope, key: string): boolean {
  const d = dayLog(p, scope, key);
  return d.n > 0 || d.s >= 30 || (scope === 'all' && (p.days[key] ?? 0) > 0);
}

/** Days in a row practiced, like the main streak: today doesn't break it until it's over. */
export function streakFor(p: Progress, scope: Scope, now = new Date()): number {
  const day = new Date(now);
  day.setHours(12, 0, 0, 0);
  if (!practicedOn(p, scope, dateKey(day))) day.setDate(day.getDate() - 1);
  let n = 0;
  while (practicedOn(p, scope, dateKey(day))) {
    n++;
    day.setDate(day.getDate() - 1);
  }
  return n;
}

export function totals(p: Progress, scope: Scope) {
  let r = 0;
  let n = 0;
  let s = 0;
  for (const key in p.log) {
    const d = dayLog(p, scope, key);
    r += d.r;
    n += d.n;
    s += d.s;
  }
  let words = 0;
  let mastered = 0;
  for (const lang of langsOf(scope)) {
    const cards = Object.values(trackedCards(p, lang));
    words += cards.length;
    mastered += cards.filter((c) => c.ivl >= 21).length; // remembered three weeks apart
  }
  return { answers: n, accuracy: n ? r / n : null, seconds: s, words, mastered };
}

/** Accuracy per week (Monday to Sunday), the last `weeks` weeks, oldest first. */
export function weeklyAccuracy(p: Progress, scope: Scope, weeks = 8, now = new Date()) {
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: weeks }, (_, i) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() - (weeks - 1 - i) * 7);
    let r = 0;
    let n = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + d);
      const log = dayLog(p, scope, dateKey(day));
      r += log.r;
      n += log.n;
    }
    return { start, r, n, accuracy: n ? r / n : null };
  });
}

/** Minutes practiced on each of the last `days` days, oldest first. */
export function dailyMinutes(p: Progress, scope: Scope, days = 14, now = new Date()) {
  return lastDays(days, now).map((date) => ({ date, minutes: Math.round(dayLog(p, scope, dateKey(date)).s / 60) }));
}

export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}
