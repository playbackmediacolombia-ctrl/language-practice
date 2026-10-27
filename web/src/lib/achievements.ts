import { LANGS } from './content';
import { getPath } from './course';
import { dateKey, lessonDone, type Progress, streak } from './progress';
import { thisWeek } from './weekly';

// Big achievements, the ones that get the logo celebration: finishing a unit or a whole level,
// 7/30/100-day streaks, a placement test result, and hitting the daily goal for the first time.
// Each has a stable key; progress.celebrated lists the keys already shown, so each is shown once.

export type Achievement = { key: string; rank: number; title: string; detail: string };

export const STREAK_MILESTONES = [7, 30, 100];

/** The date the current streak began, so a new streak can earn its milestones again. */
function streakStart(p: Progress): string {
  const day = new Date();
  if (!p.days[dateKey(day)]) day.setDate(day.getDate() - 1);
  let start = dateKey(day);
  while (p.days[dateKey(day)]) {
    start = dateKey(day);
    day.setDate(day.getDate() - 1);
  }
  return start;
}

/** Every big achievement the saved progress has earned so far. */
export function earned(p: Progress): Achievement[] {
  const out: Achievement[] = [];
  for (const { id: lang, name } of LANGS) {
    const stages = getPath(lang);
    const placedAt = stages.findIndex((s) => s.id === p.placement[lang]);
    // A level you picked yourself isn't a test result, so only the placement test gets celebrated.
    if (placedAt >= 0 && !p.levelStart?.[lang]) {
      out.push({
        key: `placement:${lang}:${stages[placedAt].id}`,
        rank: 3,
        title: 'Placement test passed!',
        detail: `${name}: you start at ${stages[placedAt].level}, “${stages[placedAt].title}”.`,
      });
    }
    // Levels (Beginner, Elementary, …) span one or more stages of units.
    const levels = new Map<string, boolean>();
    for (const stage of stages) {
      for (const unit of stage.units) {
        if (!unit.lessons.length) continue;
        const done = unit.lessons.every((l) => lessonDone(p, lang, l.id));
        if (done) out.push({ key: `unit:${lang}:${unit.id}`, rank: 2, title: 'Unit complete!', detail: `${name}: “${unit.title}”.` });
        // A level is its main path; elective topics are extra.
        if (!unit.elective) levels.set(stage.level, (levels.get(stage.level) ?? true) && done);
      }
    }
    for (const [level, done] of levels) {
      if (done) out.push({ key: `level:${lang}:${level}`, rank: 5, title: `${level} level complete!`, detail: `${name}: you finished every unit in ${level}.` });
    }
  }
  const days = streak(p);
  for (const n of STREAK_MILESTONES) {
    if (days >= n) {
      out.push({ key: `streak:${n}:${streakStart(p)}`, rank: n >= 100 ? 6 : 4, title: `${n}-day streak!`, detail: `You've practiced ${n} days in a row.` });
    }
  }
  // This week's challenge only: weeks won before are history, not news.
  const week = thisWeek(p);
  if (week.won && week.lastWeek > 0) {
    out.push({ key: `week:${dateKey(week.start)}`, rank: 3, title: 'Weekly challenge won!', detail: `${week.xp} XP this week, beating last week's ${week.lastWeek}.` });
  }
  if (Object.values(p.days).some((xp) => xp >= p.goal)) {
    out.push({ key: 'goal:first', rank: 1, title: 'Daily goal reached!', detail: 'The first time you hit your daily goal. Keep it going!' });
  }
  return out;
}

/** Earned but not yet celebrated, biggest first. */
export function pending(p: Progress): Achievement[] {
  const seen = new Set(p.celebrated ?? []);
  return earned(p)
    .filter((a) => !seen.has(a.key))
    .sort((a, b) => b.rank - a.rank);
}
